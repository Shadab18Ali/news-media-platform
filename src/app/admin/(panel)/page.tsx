import Link from "next/link";
import { FileText, FolderTree, Clock, CheckCircle2, PenLine, Eye } from "lucide-react";
import { requireStaff } from "@/lib/admin/auth";
import { countByStatus } from "@/lib/admin/queries";
import { Card, LinkButton, Notice, PageHeader, StatusBadge } from "@/components/admin/layout-bits";
import { formatDateTime, timeAgo } from "@/lib/utils";
import { getSettings } from "@/lib/data/settings";
import { ADSENSE_RE, GA4_RE, GTM_RE } from "@/lib/settings-schema";
import { aiProvider } from "@/lib/ai/provider";

export const metadata = { title: "Dashboard" };

function Stat({ label, value, icon: Icon, href }: { label: string; value: number; icon: typeof FileText; href: string }) {
  return (
    <Link href={href} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-900">
      <div className="flex items-center justify-between text-slate-500"><span className="text-xs font-semibold uppercase tracking-wide">{label}</span><Icon className="h-4 w-4" aria-hidden="true" /></div>
      <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{value.toLocaleString("en-IN")}</p>
    </Link>
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const sp = await searchParams;
  const ctx = await requireStaff("writer");
  const settings = await getSettings();
  const [counts, cats, recent, top, activity, nextUp] = await Promise.all([
    countByStatus(ctx),
    ctx.supabase.from("categories").select("id", { count: "exact", head: true }),
    (ctx.role === "writer" ? ctx.supabase.from("articles").select("id,title,status,updated_at,category:categories(name)").eq("created_by", ctx.user.id) : ctx.supabase.from("articles").select("id,title,status,updated_at,category:categories(name)")).order("updated_at", { ascending: false }).limit(6),
    ctx.supabase.from("articles").select("id,title,slug,view_count").eq("status", "published").order("view_count", { ascending: false }).limit(5),
    ctx.supabase.from("activity_log").select("id,actor_email,action,summary,created_at").order("created_at", { ascending: false }).limit(8),
    ctx.supabase.from("articles").select("id,title,scheduled_for").eq("status", "scheduled").order("scheduled_for").limit(5),
  ]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const env = (k: string) => Boolean(process.env[k]);
  const ga = settings.integrations.ga4MeasurementId && GA4_RE.test(settings.integrations.ga4MeasurementId);
  const gtm = settings.integrations.gtmContainerId && GTM_RE.test(settings.integrations.gtmContainerId);
  const adsense = settings.integrations.adsensePublisherId && ADSENSE_RE.test(settings.integrations.adsensePublisherId);
  const checks = [
    { ok: env("NEXT_PUBLIC_SUPABASE_URL") && env("NEXT_PUBLIC_SUPABASE_ANON_KEY"), label: "Supabase connection variables" },
    { ok: env("SUPABASE_SERVICE_ROLE_KEY"), label: "Service-role key (newsletter, contact form, cron)" },
    { ok: env("CRON_SECRET"), label: "CRON_SECRET (scheduled publishing)" },
    { ok: env("NEXT_PUBLIC_SITE_URL") && !process.env.NEXT_PUBLIC_SITE_URL?.includes("localhost"), label: "Production NEXT_PUBLIC_SITE_URL" },
    { ok: Boolean(ga || gtm), label: "Google Analytics / Tag Manager ID" },
    { ok: Boolean(settings.seo.googleSiteVerification), label: "Google Search Console verification" },
    { ok: Boolean(adsense), label: "AdSense publisher ID" },
    { ok: settings.ads.enabled, label: "Advertising switched on" },
    { ok: aiProvider().isConfigured(), label: "Drafting assistant provider (optional)" },
  ];

  return (
    <>
      <PageHeader title="Dashboard" description={`Welcome back${ctx.fullName ? `, ${ctx.fullName}` : ""}.`} actions={<LinkButton href="/admin/articles/new"><PenLine className="h-4 w-4" aria-hidden="true" />New article</LinkButton>} />
      {sp.denied && <div className="mb-4"><Notice tone="warn">Your role does not have access to that area.</Notice></div>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Total articles" value={total} icon={FileText} href="/admin/articles" />
        <Stat label="Published" value={counts.published} icon={CheckCircle2} href="/admin/articles?status=published" />
        <Stat label="Drafts" value={counts.draft + counts.in_review} icon={PenLine} href="/admin/articles?status=draft" />
        <Stat label="Scheduled" value={counts.scheduled} icon={Clock} href="/admin/articles?status=scheduled" />
        <Stat label="Categories" value={cats.count ?? 0} icon={FolderTree} href="/admin/categories" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card title="Recent articles" className="xl:col-span-2" actions={<Link href="/admin/articles" className="text-sm font-semibold underline">All</Link>}>
          {(recent.data ?? []).length === 0 ? <p className="text-sm text-slate-500">Nothing yet. Write your first article.</p> : (
            <ul className="divide-y divide-slate-100">
              {(recent.data as unknown as { id: string; title: string; status: string; updated_at: string; category: { name: string } | null }[]).map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0"><Link href={`/admin/articles/${a.id}/edit`} className="block truncate font-semibold text-slate-900 hover:underline">{a.title}</Link><p className="text-xs text-slate-500">{a.category?.name ?? "No category"} · {timeAgo(a.updated_at)}</p></div>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Up next (scheduled)">
          {(nextUp.data ?? []).length === 0 ? <p className="text-sm text-slate-500">No scheduled articles.</p> : (
            <ul className="space-y-2 text-sm">{(nextUp.data ?? []).map((a) => <li key={a.id}><Link className="font-semibold hover:underline" href={`/admin/articles/${a.id}/edit`}>{a.title}</Link><br /><span className="text-xs text-slate-500">{formatDateTime(a.scheduled_for)} IST</span></li>)}</ul>
          )}
        </Card>
        <Card title="Most read" actions={<Eye className="h-4 w-4 text-slate-500" aria-hidden="true" />}>
          {(top.data ?? []).filter((t) => t.view_count > 0).length === 0 ? <p className="text-sm text-slate-500">Reads are counted from the public site and will appear here.</p> : (
            <ol className="space-y-2 text-sm">{(top.data ?? []).filter((t) => t.view_count > 0).map((t) => <li key={t.id} className="flex justify-between gap-3"><Link className="truncate hover:underline" href={`/news/${t.slug}`}>{t.title}</Link><span className="tabular-nums text-slate-500">{t.view_count.toLocaleString("en-IN")}</span></li>)}</ol>
          )}
          <p className="mt-3 text-xs text-slate-500">First-party read counts. Traffic, audience and revenue reports live in Google Analytics and AdSense once connected.</p>
        </Card>
        <Card title="Recent activity" className="xl:col-span-2">
          {(activity.data ?? []).length === 0 ? <p className="text-sm text-slate-500">No activity recorded yet.</p> : (
            <ul className="space-y-1.5 text-sm">{(activity.data ?? []).map((a) => <li key={a.id}><span className="font-semibold">{a.actor_email ?? "System"}</span> <span className="text-slate-600">{a.summary ?? a.action}</span> <span className="text-xs text-slate-500">· {timeAgo(a.created_at)}</span></li>)}</ul>
          )}
        </Card>
        <Card title="Setup status" className="xl:col-span-3">
          <ul className="grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2 xl:grid-cols-3">
            {checks.map((c) => <li key={c.label} className="flex items-center gap-2"><span className={`inline-block h-2.5 w-2.5 rounded-full ${c.ok ? "bg-green-500" : "bg-slate-300"}`} aria-hidden="true" /><span>{c.label}: <strong>{c.ok ? "configured" : "not configured"}</strong></span></li>)}
          </ul>
        </Card>
      </div>
    </>
  );
}
