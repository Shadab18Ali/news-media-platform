"use server";
import { z } from "zod";
import { logActivity, requireStaff } from "@/lib/admin/auth";
import type { ActionState } from "@/lib/admin/types";
import { revalidatePublicSite } from "@/lib/admin/revalidate";
import { SETTINGS_SCHEMAS, adsSchema, type SettingsKey } from "@/lib/settings-schema";
import { AD_PLACEMENTS } from "@/config/site";
import { zonedLocalToUtcIso } from "@/lib/utils";

const BOOLEAN_KEYS: Partial<Record<SettingsKey, string[]>> = { features: ["newsletter", "breakingTicker"] };

export async function saveSettingsGroup(_p: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireStaff("admin");
  const group = String(fd.get("__group") ?? "") as SettingsKey;
  if (!(group in SETTINGS_SCHEMAS) || group === "ads") return { ok: false, message: "Unknown settings group." };

  const raw: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string" && !k.startsWith("__")) raw[k] = v;
  for (const b of BOOLEAN_KEYS[group] ?? []) raw[b] = fd.get(b) === "on";

  const parsed = SETTINGS_SCHEMAS[group].safeParse(raw);
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted fields.", errors: z.flattenError(parsed.error as z.ZodError).fieldErrors as Record<string, string[]> };

  const { error } = await ctx.supabase.from("site_settings").upsert({ key: group, value: parsed.data, updated_by: ctx.user.id }, { onConflict: "key" });
  if (error) return { ok: false, message: "Could not save settings." };
  await logActivity(ctx, "update", "settings", group, `Settings updated: ${group}`);
  revalidatePublicSite();
  return { ok: true, message: "Settings saved." };
}

export async function saveAdSettings(_p: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireStaff("admin");
  const placements = Object.fromEntries(AD_PLACEMENTS.map((p) => [p.id, { enabled: fd.get(`placement_${p.id}`) === "on" }]));
  const parsed = adsSchema.safeParse({ enabled: fd.get("enabled") === "on", adsTxt: String(fd.get("adsTxt") ?? ""), placements });
  if (!parsed.success) return { ok: false, message: "Invalid advertising settings." };
  // ads.txt lines must look like "domain, id, DIRECT|RESELLER[, certification-id]" or comments/variables
  const bad = parsed.data.adsTxt.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#") && !/^[a-z0-9.-]+\s*,\s*[^,\s]+\s*,\s*(DIRECT|RESELLER)(\s*,\s*[a-f0-9]+)?$/i.test(l) && !/^[A-Za-z]+=\S+$/.test(l));
  if (bad.length) return { ok: false, message: "ads.txt contains an invalid line.", errors: { adsTxt: [`Invalid: ${bad[0]}`] } };
  const { error } = await ctx.supabase.from("site_settings").upsert({ key: "ads", value: parsed.data, updated_by: ctx.user.id }, { onConflict: "key" });
  if (error) return { ok: false, message: "Could not save advertising settings." };
  await logActivity(ctx, "update", "settings", "ads", `Ads ${parsed.data.enabled ? "enabled" : "disabled"}`);
  revalidatePublicSite();
  return { ok: true, message: "Advertising settings saved." };
}

const adSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  placement: z.enum(AD_PLACEMENTS.map((p) => p.id) as [string, ...string[]]),
  ad_type: z.enum(["adsense", "custom_html", "image"]),
  adsense_slot: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().regex(/^\d{6,15}$/, "Numeric slot ID from AdSense").optional()),
  custom_html: z.preprocess((v) => (v === "" ? undefined : v), z.string().max(20000).optional()),
  image_url: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().max(1000).regex(/^(https?:\/\/|\/)/).optional()),
  link_url: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().max(1000).regex(/^https?:\/\//, "Must start with https://").optional()),
  image_alt: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().max(200).optional()),
  sponsor_name: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().max(120).optional()),
  priority: z.coerce.number().int().min(0).max(10000).default(100),
  starts_local: z.string().optional(),
  ends_local: z.string().optional(),
  is_active: z.boolean(),
});

export async function saveAdUnit(_p: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireStaff("admin");
  const id = String(fd.get("id") ?? "");
  const parsed = adSchema.safeParse({ ...Object.fromEntries(fd), is_active: fd.get("is_active") === "on" });
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted fields.", errors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]> };
  const d = parsed.data;
  const errors: Record<string, string[]> = {};
  if (d.ad_type === "adsense" && !d.adsense_slot) errors.adsense_slot = ["Enter the ad unit slot ID from AdSense."];
  if (d.ad_type === "custom_html" && !d.custom_html) errors.custom_html = ["Paste the ad code."];
  if (d.ad_type === "image" && !(d.image_url && d.link_url)) errors.image_url = ["Choose an image and a destination link."];
  const starts = d.starts_local ? zonedLocalToUtcIso(d.starts_local) : null;
  const ends = d.ends_local ? zonedLocalToUtcIso(d.ends_local) : null;
  if (starts && ends && new Date(ends) <= new Date(starts)) errors.ends_local = ["End must be after start."];
  if (Object.keys(errors).length) return { ok: false, message: "Please fix the highlighted fields.", errors };

  const row = {
    name: d.name, placement: d.placement, ad_type: d.ad_type, adsense_slot: d.ad_type === "adsense" ? d.adsense_slot ?? null : null,
    custom_html: d.ad_type === "custom_html" ? d.custom_html ?? null : null, image_url: d.ad_type === "image" ? d.image_url ?? null : null,
    link_url: d.ad_type === "image" ? d.link_url ?? null : null, image_alt: d.image_alt ?? null, sponsor_name: d.sponsor_name ?? null,
    priority: d.priority, starts_at: starts, ends_at: ends, is_active: d.is_active,
  };
  const q = /^[0-9a-f-]{36}$/i.test(id) ? ctx.supabase.from("advertisements").update(row).eq("id", id) : ctx.supabase.from("advertisements").insert(row);
  const { error } = await q;
  if (error) { console.error("[ads]", error.message); return { ok: false, message: "Could not save the ad unit." }; }
  await logActivity(ctx, id ? "update" : "create", "advertisement", id || null, `Ad unit: ${d.name}`);
  revalidatePublicSite();
  return { ok: true, message: id ? "Ad unit saved." : "Ad unit created." };
}

export async function deleteAdUnit(fd: FormData): Promise<void> {
  const ctx = await requireStaff("admin");
  const id = String(fd.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  await ctx.supabase.from("advertisements").delete().eq("id", id);
  await logActivity(ctx, "delete", "advertisement", id, "Ad unit deleted");
  revalidatePublicSite();
  const { redirect } = await import("next/navigation");
  redirect("/admin/ads");
}
