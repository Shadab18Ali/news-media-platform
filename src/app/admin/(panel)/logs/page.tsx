import { Play } from "lucide-react";
import { requireStaff, hasRole } from "@/lib/admin/auth";
import { runSchedulerNow } from "../../_actions/ops";
import { Card, Empty, Notice, PageHeader, StatusBadge } from "@/components/admin/layout-bits";
import { SubmitButton } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";

export const metadata = { title: "Logs & publishing" };

export default async function LogsPage({ searchParams }: { searchParams: Promise<{ run?: string }> }) {
  const sp = await searchParams;
  const ctx = await requireStaff("writer");
  const [logs, activity, due] = await Promise.all([
    ctx.supabase.from("publish_logs").select("id,title,level,message,created_at").order("created_at", { ascending: false }).limit(50),
    ctx.supabase.from("activity_log").select("id,actor_email,action,summary,created_at").order("created_at", { ascending: false }).limit(50),
    ctx.supabase.from("articles").select("id,title,scheduled_for").eq("status", "scheduled").order("scheduled_for").limit(20),
  ]);
  const [tone, text] = sp.run ? [sp.run.startsWith("ok:") ? "success" : "warn", sp.run.replace(/^(ok|error):/, "")] : [null, ""];
  const cronReady = Boolean(process.env.CRON_SECRET) && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  return (
    <>
      <PageHeader title="Logs & scheduled publishing" description="Every automatic publish and every staff action is recorded." />
      {tone && <div className="mb-4"><Notice tone={tone as "success" | "warn"}>{text}</Notice></div>}
      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Scheduler">
          <p className="text-sm">Endpoint: <code className="rounded bg-slate-100 px-1">/api/cron/publish-scheduled</code></p>
          <p className="mt-2 text-sm">Status: <strong>{cronReady ? "configured" : "needs CRON_SECRET and SUPABASE_SERVICE_ROLE_KEY"}</strong></p>
          <p className="mt-2 text-xs text-slate-500">Runs on Vercel Cron and/or the included GitHub Actions workflow. See DEPLOYMENT_GUIDE.md.</p>
          {hasRole(ctx.role, "editor") && (
            <form action={runSchedulerNow} className="mt-4"><SubmitButton variant="secondary"><Play className="h-4 w-4" aria-hidden="true" />Run scheduler now</SubmitButton></form>
          )}
          <h3 className="mt-5 text-sm font-bold">Waiting to publish ({due.data?.length ?? 0})</h3>
          {(due.data ?? []).length === 0 ? <p className="mt-1 text-sm text-slate-500">Nothing scheduled.</p> : (
            <ul className="mt-1 space-y-1 text-sm">{(due.data ?? []).map((a) => <li key={a.id}><Link className="font-semibold hover:underline" href={`/admin/articles/${a.id}/edit`}>{a.title}</Link> <span className="text-xs text-slate-500">{formatDateTime(a.scheduled_for)} IST</span></li>)}</ul>
          )}
        </Card>
        <Card title="Publishing log" className="xl:col-span-2">
          {(logs.data ?? []).length === 0 ? <Empty>No scheduled publishes yet.</Empty> : (
            <ul className="divide-y divide-slate-100 text-sm">
              {(logs.data ?? []).map((l) => <li key={l.id} className="flex flex-wrap items-center gap-2 py-2"><StatusBadge status={l.level === "error" ? "archived" : "published"} /><span className="font-semibold">{l.title ?? "System"}</span><span className="text-slate-600">{l.message}</span><span className="ml-auto text-xs text-slate-500">{formatDateTime(l.created_at)}</span></li>)}
            </ul>
          )}
        </Card>
        <Card title="Activity" className="xl:col-span-3">
          {(activity.data ?? []).length === 0 ? <Empty>No activity yet.</Empty> : (
            <ul className="divide-y divide-slate-100 text-sm">
              {(activity.data ?? []).map((a) => <li key={a.id} className="flex flex-wrap gap-2 py-1.5"><span className="font-semibold">{a.actor_email ?? "System"}</span><span className="text-slate-600">{a.summary ?? a.action}</span><span className="ml-auto text-xs text-slate-500">{formatDateTime(a.created_at)}</span></li>)}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
