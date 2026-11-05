"use client";
import { saveAdSettings, saveAdUnit, saveSettingsGroup } from "@/app/admin/_actions/settings";
import { Field, FormMessage, PendingButton, inputCls } from "./ui";
import { ImageField } from "./media-picker";
import { useKeepAction } from "./use-form-action";
import { AD_PLACEMENTS } from "@/config/site";
import type { Advertisement } from "@/types/db";
import type { AdSettings } from "@/lib/settings-schema";
import { utcIsoToZonedLocal } from "@/lib/utils";

export interface FieldDef {
  name: string; label: string; type?: "text" | "email" | "url" | "color" | "number" | "textarea" | "checkbox" | "image";
  hint?: string; placeholder?: string;
}

export function SettingsGroupForm({ group, fields, values }: { group: string; fields: FieldDef[]; values: Record<string, unknown> }) {
  const { state, onSubmit, pending } = useKeepAction(saveSettingsGroup);
  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="__group" value={group} />
      {fields.map((f) => {
        const id = `${group}-${f.name}`;
        const v = values[f.name];
        const err = state.errors?.[f.name];
        if (f.type === "checkbox") return <label key={f.name} className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name={f.name} defaultChecked={Boolean(v)} className="h-4 w-4" />{f.label}</label>;
        if (f.type === "image") return <div key={f.name} className="sm:col-span-2"><ImageField name={f.name} label={f.label} initialUrl={(v as string) ?? ""} hint={f.hint} /></div>;
        if (f.type === "textarea") return <Field key={f.name} label={f.label} htmlFor={id} hint={f.hint} error={err} className="sm:col-span-2"><textarea id={id} name={f.name} rows={3} defaultValue={(v as string) ?? ""} className={inputCls} /></Field>;
        return (
          <Field key={f.name} label={f.label} htmlFor={id} hint={f.hint} error={err}>
            <input id={id} name={f.name} type={f.type === "color" ? "color" : f.type ?? "text"} defaultValue={(v as string | number | undefined) ?? (f.type === "color" ? "#000000" : "")} placeholder={f.placeholder}
              className={f.type === "color" ? "mt-1 h-10 w-24 rounded border border-slate-300 bg-white p-1" : inputCls} />
          </Field>
        );
      })}
      <div className="flex items-center gap-3 sm:col-span-2"><PendingButton pending={pending}>Save</PendingButton><FormMessage state={state} /></div>
    </form>
  );
}

export function AdSettingsForm({ values }: { values: AdSettings }) {
  const { state, onSubmit, pending } = useKeepAction(saveAdSettings);
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <label className="flex items-start gap-2 rounded border border-slate-200 bg-slate-50 p-3 text-sm"><input type="checkbox" name="enabled" defaultChecked={values.enabled} className="mt-0.5 h-4 w-4" /><span><strong>Enable advertising site-wide.</strong> Master switch: when off, no ad markup or ad scripts are output anywhere.</span></label>
      <fieldset>
        <legend className="text-sm font-semibold">Placements</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {AD_PLACEMENTS.map((p) => (
            <label key={p.id} className="flex items-center gap-2 rounded border border-slate-200 p-2.5 text-sm"><input type="checkbox" name={`placement_${p.id}`} defaultChecked={values.placements[p.id]?.enabled} className="h-4 w-4" /><span>{p.label}<span className="block text-xs text-slate-500">{p.size}</span></span></label>
          ))}
        </div>
      </fieldset>
      <Field label="ads.txt content" htmlFor="adsTxt" error={state.errors?.adsTxt} hint="Served at /ads.txt. Leave empty to auto-generate the Google line from your AdSense publisher ID. One record per line: domain, publisher-id, DIRECT|RESELLER, certification-id.">
        <textarea id="adsTxt" name="adsTxt" rows={4} defaultValue={values.adsTxt} className={`${inputCls} font-mono`} placeholder="google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0" />
      </Field>
      <div className="flex items-center gap-3"><PendingButton pending={pending}>Save advertising settings</PendingButton><FormMessage state={state} /></div>
    </form>
  );
}

export function AdUnitForm({ ad }: { ad?: Advertisement }) {
  const { state, onSubmit, pending } = useKeepAction(saveAdUnit, { resetOnSuccess: !ad });
  const e = (k: string) => state.errors?.[k];
  const k = ad?.id ?? "new";
  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      {ad && <input type="hidden" name="id" value={ad.id} />}
      <Field label="Internal name" htmlFor={`an-${k}`} error={e("name")}><input id={`an-${k}`} name="name" required defaultValue={ad?.name} className={inputCls} /></Field>
      <Field label="Placement" htmlFor={`ap-${k}`}><select id={`ap-${k}`} name="placement" defaultValue={ad?.placement ?? "sidebar"} className={inputCls}>{AD_PLACEMENTS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></Field>
      <Field label="Type" htmlFor={`at-${k}`}><select id={`at-${k}`} name="ad_type" defaultValue={ad?.ad_type ?? "adsense"} className={inputCls}><option value="adsense">Google AdSense unit</option><option value="image">Image banner (direct deal / affiliate)</option><option value="custom_html">Custom HTML (other ad networks)</option></select></Field>
      <Field label="Priority" htmlFor={`ao-${k}`} hint="Lower number wins when several ads share a placement."><input id={`ao-${k}`} name="priority" type="number" min={0} defaultValue={ad?.priority ?? 100} className={inputCls} /></Field>
      <Field label="AdSense slot ID" htmlFor={`as-${k}`} error={e("adsense_slot")} hint="For AdSense units only."><input id={`as-${k}`} name="adsense_slot" inputMode="numeric" defaultValue={ad?.adsense_slot ?? ""} className={inputCls} /></Field>
      <Field label="Sponsor / advertiser name" htmlFor={`asp-${k}`}><input id={`asp-${k}`} name="sponsor_name" defaultValue={ad?.sponsor_name ?? ""} className={inputCls} /></Field>
      <div className="sm:col-span-2"><ImageField name="image_url" label="Banner image (image type)" initialUrl={ad?.image_url} />{e("image_url") && <p role="alert" className="mt-1 text-xs font-semibold text-red-700">{e("image_url")?.[0]}</p>}</div>
      <Field label="Destination URL (image type)" htmlFor={`al-${k}`} error={e("link_url")}><input id={`al-${k}`} name="link_url" type="url" defaultValue={ad?.link_url ?? ""} placeholder="https://" className={inputCls} /></Field>
      <Field label="Banner alt text" htmlFor={`aa-${k}`}><input id={`aa-${k}`} name="image_alt" defaultValue={ad?.image_alt ?? ""} className={inputCls} /></Field>
      <Field label="Custom HTML (custom type)" htmlFor={`ah-${k}`} error={e("custom_html")} hint="Only administrators can add this. It runs on public pages, so paste code only from networks you trust." className="sm:col-span-2"><textarea id={`ah-${k}`} name="custom_html" rows={4} defaultValue={ad?.custom_html ?? ""} className={`${inputCls} font-mono`} /></Field>
      <Field label="Start (IST, optional)" htmlFor={`ast-${k}`}><input id={`ast-${k}`} name="starts_local" type="datetime-local" defaultValue={utcIsoToZonedLocal(ad?.starts_at)} className={inputCls} /></Field>
      <Field label="End (IST, optional)" htmlFor={`aen-${k}`} error={e("ends_local")}><input id={`aen-${k}`} name="ends_local" type="datetime-local" defaultValue={utcIsoToZonedLocal(ad?.ends_at)} className={inputCls} /></Field>
      <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="is_active" defaultChecked={ad?.is_active ?? false} className="h-4 w-4" /> Active (still requires the global switch and the placement to be enabled)</label>
      <div className="flex items-center gap-3 sm:col-span-2"><PendingButton pending={pending}>{ad ? "Save ad unit" : "Add ad unit"}</PendingButton><FormMessage state={state} /></div>
    </form>
  );
}
