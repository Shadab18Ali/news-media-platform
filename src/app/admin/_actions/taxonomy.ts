"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logActivity, requireStaff } from "@/lib/admin/auth";
import type { ActionState } from "@/lib/admin/types";
import { revalidatePublicSite } from "@/lib/admin/revalidate";
import { slugify } from "@/lib/utils";

const empty = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const opt = (max: number) => z.preprocess(empty, z.string().trim().max(max).optional());
const optUrl = z.preprocess(empty, z.string().trim().max(1000).regex(/^(https?:\/\/|\/)/, "Must start with https:// or /").optional());
const flat = (e: z.ZodError) => z.flattenError(e).fieldErrors as Record<string, string[]>;
const uuid = /^[0-9a-f-]{36}$/i;

// ---------------------------------------------------------------- categories
const categorySchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(80),
  slug: opt(80),
  description: opt(1000),
  image_url: optUrl,
  image_alt: opt(300),
  sort_order: z.coerce.number().int().min(0).max(10000).default(100),
  show_in_nav: z.boolean(),
  seo_title: opt(120),
  seo_description: opt(320),
});

export async function saveCategory(_p: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireStaff("editor");
  const id = String(fd.get("id") ?? "");
  const parsed = categorySchema.safeParse({ ...Object.fromEntries(fd), show_in_nav: fd.get("show_in_nav") === "on" });
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted fields.", errors: flat(parsed.error) };
  const d = parsed.data;
  const slug = slugify(d.slug || d.name, 80);
  if (!slug) return { ok: false, errors: { slug: ["Could not build a URL slug from that name."] } };
  const row = { name: d.name, slug, description: d.description ?? null, image_url: d.image_url ?? null, image_alt: d.image_alt ?? null, sort_order: d.sort_order, show_in_nav: d.show_in_nav, seo_title: d.seo_title ?? null, seo_description: d.seo_description ?? null };
  const q = id && uuid.test(id) ? ctx.supabase.from("categories").update(row).eq("id", id).select("id").single() : ctx.supabase.from("categories").insert(row).select("id").single();
  const { data, error } = await q;
  if (error) return { ok: false, message: /duplicate|unique/i.test(error.message) ? "A category with that slug already exists." : "Could not save the category." };
  await logActivity(ctx, id ? "update" : "create", "category", data.id, `Category: ${d.name}`);
  revalidatePublicSite();
  return { ok: true, message: id ? "Category saved." : "Category created.", id: data.id };
}

export async function deleteCategory(fd: FormData): Promise<void> {
  const ctx = await requireStaff("editor");
  const id = String(fd.get("id") ?? "");
  if (!uuid.test(id)) return;
  const { count } = await ctx.supabase.from("articles").select("id", { count: "exact", head: true }).eq("category_id", id);
  if (count) redirect(`/admin/categories?error=${encodeURIComponent(`This category still has ${count} article(s). Move them to another category first.`)}`);
  const { error } = await ctx.supabase.from("categories").delete().eq("id", id);
  if (error) redirect(`/admin/categories?error=${encodeURIComponent("Could not delete the category.")}`);
  await logActivity(ctx, "delete", "category", id, "Category deleted");
  revalidatePublicSite();
  redirect("/admin/categories?deleted=1");
}

// ------------------------------------------------------------------- authors
const authorSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  slug: opt(80),
  job_title: opt(120),
  bio: opt(3000),
  email: z.preprocess(empty, z.email().max(200).optional()),
  avatar_url: optUrl,
  profile_id: z.preprocess(empty, z.string().uuid().optional()),
  is_active: z.boolean(),
  twitter: optUrl, linkedin: optUrl, instagram: optUrl, facebook: optUrl, website: optUrl,
});

export async function saveAuthor(_p: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireStaff("editor");
  const id = String(fd.get("id") ?? "");
  const parsed = authorSchema.safeParse({ ...Object.fromEntries(fd), is_active: fd.get("is_active") === "on" });
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted fields.", errors: flat(parsed.error) };
  const d = parsed.data;
  const slug = slugify(d.slug || d.name, 80);
  const social: Record<string, string> = {};
  for (const k of ["twitter", "linkedin", "instagram", "facebook", "website"] as const) if (d[k]) social[k] = d[k]!;
  const row = { name: d.name, slug, job_title: d.job_title ?? null, bio: d.bio ?? null, email: d.email ?? null, avatar_url: d.avatar_url ?? null, profile_id: d.profile_id ?? null, is_active: d.is_active, social };
  const q = id && uuid.test(id) ? ctx.supabase.from("authors").update(row).eq("id", id).select("id").single() : ctx.supabase.from("authors").insert(row).select("id").single();
  const { data, error } = await q;
  if (error) return { ok: false, message: /duplicate|unique/i.test(error.message) ? "An author with that slug already exists." : "Could not save the author." };
  await logActivity(ctx, id ? "update" : "create", "author", data.id, `Author: ${d.name}`);
  revalidatePublicSite();
  return { ok: true, message: id ? "Author saved." : "Author created.", id: data.id };
}

export async function deleteAuthor(fd: FormData): Promise<void> {
  const ctx = await requireStaff("editor");
  const id = String(fd.get("id") ?? "");
  if (!uuid.test(id)) return;
  const { error } = await ctx.supabase.from("authors").delete().eq("id", id);
  if (error) redirect(`/admin/authors?error=${encodeURIComponent("Could not delete the author.")}`);
  await logActivity(ctx, "delete", "author", id, "Author deleted");
  revalidatePublicSite();
  redirect("/admin/authors?deleted=1");
}

// --------------------------------------------------------------------- media
export async function updateMedia(_p: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireStaff("editor");
  const id = String(fd.get("id") ?? "");
  if (!uuid.test(id)) return { ok: false, message: "Invalid media id." };
  const alt = String(fd.get("alt_text") ?? "").trim().slice(0, 300);
  const caption = String(fd.get("caption") ?? "").trim().slice(0, 500);
  const { error } = await ctx.supabase.from("media").update({ alt_text: alt || null, caption: caption || null }).eq("id", id);
  if (error) return { ok: false, message: "Could not save." };
  return { ok: true, message: "Saved." };
}

export async function deleteMedia(fd: FormData): Promise<void> {
  const ctx = await requireStaff("editor");
  const id = String(fd.get("id") ?? "");
  if (!uuid.test(id)) return;
  const { data: m } = await ctx.supabase.from("media").select("id,url,og_url,storage_path").eq("id", id).maybeSingle();
  if (!m) return;
  const urls = [m.url, m.og_url].filter(Boolean) as string[];
  const orFilter = (cols: string[]) => cols.flatMap((c) => urls.map((u) => `${c}.eq.${u}`)).join(",");
  const [a, b, c, d] = await Promise.all([
    ctx.supabase.from("articles").select("id", { count: "exact", head: true }).or(orFilter(["featured_image_url", "og_image_url"])),
    ctx.supabase.from("authors").select("id", { count: "exact", head: true }).or(orFilter(["avatar_url"])),
    ctx.supabase.from("categories").select("id", { count: "exact", head: true }).or(orFilter(["image_url"])),
    ctx.supabase.from("articles").select("id", { count: "exact", head: true }).ilike("content", `%${m.url}%`),
  ]);
  if ((a.count ?? 0) + (b.count ?? 0) + (c.count ?? 0) + (d.count ?? 0) > 0) {
    redirect(`/admin/media?error=${encodeURIComponent("That image is still in use. Remove it from articles, authors and categories first.")}`);
  }
  const paths = [m.storage_path, m.storage_path.replace(/\.webp$/, "-og.jpg")];
  await ctx.supabase.storage.from("media").remove(paths);
  await ctx.supabase.from("media").delete().eq("id", id);
  await logActivity(ctx, "delete", "media", id, `Media deleted: ${m.storage_path}`);
  redirect("/admin/media?deleted=1");
}

// ----------------------------------------------------------------- redirects
const redirectSchema = z.object({
  from_path: z.string().trim().regex(/^\/[^\s?#]*$/, "Must start with / and contain no spaces, ? or #").max(500),
  to_path: z.string().trim().regex(/^(\/|https?:\/\/)\S*$/, "Must start with / or https://").max(500),
  status_code: z.coerce.number().refine((n) => [301, 302, 307, 308].includes(n)),
});

export async function saveRedirect(_p: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireStaff("editor");
  const parsed = redirectSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted fields.", errors: flat(parsed.error) };
  if (parsed.data.from_path === parsed.data.to_path) return { ok: false, errors: { to_path: ["Source and destination must differ."] } };
  if (/^\/(admin|api)(\/|$)/.test(parsed.data.from_path)) return { ok: false, errors: { from_path: ["Cannot redirect admin or API paths."] } };
  const { error } = await ctx.supabase.from("redirects").upsert({ ...parsed.data, is_active: true }, { onConflict: "from_path" });
  if (error) return { ok: false, message: "Could not save the redirect." };
  await logActivity(ctx, "create", "redirect", null, `${parsed.data.from_path} -> ${parsed.data.to_path}`);
  revalidatePublicSite();
  return { ok: true, message: "Redirect saved." };
}

export async function deleteRedirect(fd: FormData): Promise<void> {
  const ctx = await requireStaff("editor");
  const id = String(fd.get("id") ?? "");
  if (!uuid.test(id)) return;
  await ctx.supabase.from("redirects").delete().eq("id", id);
  redirect("/admin/redirects");
}

export async function toggleRedirect(fd: FormData): Promise<void> {
  const ctx = await requireStaff("editor");
  const id = String(fd.get("id") ?? "");
  if (!uuid.test(id)) return;
  await ctx.supabase.from("redirects").update({ is_active: fd.get("active") === "1" }).eq("id", id);
  redirect("/admin/redirects");
}
