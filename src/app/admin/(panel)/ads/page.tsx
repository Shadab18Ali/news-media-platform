import { Trash2 } from "lucide-react";
import { requireStaff } from "@/lib/admin/auth";
import { getSettings } from "@/lib/data/settings";
import { deleteAdUnit } from "../../_actions/settings";
import { Card, Empty, Notice, PageHeader } from "@/components/admin/layout-bits";
import { AdSettingsForm, AdUnitForm } from "@/components/admin/settings-forms";
import { SubmitButton } from "@/components/admin/ui";
import { AD_PLACEMENTS } from "@/config/site";
import { adsenseConfigured, pickAd } from "@/lib/ads";
import type { Advertisement } from "@/types/db";

export const metadata = { title: "Advertising" };

export default async function AdsPage() {
  const ctx = await requireStaff("admin");
  const settings = await getSettings();
  const { data } = await ctx.supabase.from("advertisements").select("*").order("placement").order("priority");
  const ads = (data ?? []) as Advertisement[];
  const live = new Map(AD_PLACEMENTS.map((p) => [p.id, pickAd(p.id, ads, settings)]));

  return (
    <>
      <PageHeader title="Advertising" description="Ads are off until you switch them on and add real ad units. No placeholder ads are ever shown." />
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Notice tone={settings.ads.enabled ? "success" : "warn"}>Master switch: <strong>{settings.ads.enabled ? "ON" : "OFF"}</strong></Notice>
        <Notice tone={adsenseConfigured(settings) ? "success" : "warn"}>AdSense publisher ID: <strong>{adsenseConfigured(settings) ? "configured" : "not set"}</strong> {!adsenseConfigured(settings) && <>(add it in Site settings)</>}</Notice>
        <Notice>Visitors must accept advertising cookies before AdSense or custom ad code loads.</Notice>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Switches & ads.txt"><AdSettingsForm values={settings.ads} /></Card>
        <Card title="Placement status">
          <ul className="divide-y divide-slate-100 text-sm">
            {AD_PLACEMENTS.map((p) => {
              const l = live.get(p.id);
              const enabled = settings.ads.placements[p.id]?.enabled;
              return (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                  <span>{p.label}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${l ? "bg-green-100 text-green-900" : "bg-slate-100 text-slate-600"}`}>
                    {l ? `Live: ${l.ad.name}` : !settings.ads.enabled ? "Off (master switch)" : !enabled ? "Disabled" : "No eligible ad"}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_32rem]">
        <Card title={`Ad units (${ads.length})`}>
          {ads.length === 0 ? <Empty>No ad units yet. Add an AdSense unit, an image banner for a direct deal, or custom HTML.</Empty> : (
            <ul className="divide-y divide-slate-100">
              {ads.map((a) => (
                <li key={a.id}>
                  <details className="group py-3">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                      <span><span className="font-semibold">{a.name}</span> <span className="text-xs text-slate-500">{AD_PLACEMENTS.find((p) => p.id === a.placement)?.label} · {a.ad_type} · {a.is_active ? "active" : "inactive"}</span></span>
                      <span className="text-sm font-semibold underline group-open:hidden">Edit</span>
                    </summary>
                    <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-4">
                      <AdUnitForm ad={a} />
                      <form action={deleteAdUnit} className="mt-4 border-t border-slate-200 pt-4"><input type="hidden" name="id" value={a.id} /><SubmitButton variant="danger" confirm="Delete this ad unit?"><Trash2 className="h-4 w-4" aria-hidden="true" />Delete</SubmitButton></form>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Add ad unit"><AdUnitForm /></Card>
      </div>
    </>
  );
}
