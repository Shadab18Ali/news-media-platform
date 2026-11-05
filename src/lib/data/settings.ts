import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/public";
import { DEFAULT_SETTINGS, SETTINGS_SCHEMAS, type SiteSettings, type SettingsKey } from "@/lib/settings-schema";

type Raw = Partial<Record<SettingsKey, unknown>>;

/** Deep merge of plain objects; arrays and primitives from `over` win. */
function merge<T>(base: T, over: unknown): T {
  if (!over || typeof over !== "object" || Array.isArray(over)) return base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(over as Record<string, unknown>)) {
    const b = out[k];
    out[k] = b && typeof b === "object" && !Array.isArray(b) ? merge(b, v) : v;
  }
  return out as T;
}

export function resolveSettings(raw: Raw): SiteSettings {
  const result = { ...DEFAULT_SETTINGS } as SiteSettings;
  for (const key of Object.keys(SETTINGS_SCHEMAS) as SettingsKey[]) {
    const merged = merge(DEFAULT_SETTINGS[key], raw[key]);
    const parsed = SETTINGS_SCHEMAS[key].safeParse(merged);
    // Invalid stored data falls back to defaults rather than breaking the whole site.
    (result as unknown as Record<string, unknown>)[key] = parsed.success ? parsed.data : DEFAULT_SETTINGS[key];
  }
  return result;
}

export const getSettings = cache(async (): Promise<SiteSettings> => {
  const supabase = createPublicClient();
  if (!supabase) return DEFAULT_SETTINGS;
  const { data, error } = await supabase.from("site_settings").select("key,value");
  if (error) {
    console.error("[settings] failed to load:", error.message);
    return DEFAULT_SETTINGS;
  }
  const raw: Raw = {};
  for (const row of data ?? []) raw[row.key as SettingsKey] = row.value;
  return resolveSettings(raw);
});
