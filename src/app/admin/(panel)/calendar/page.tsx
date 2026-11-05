import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireStaff } from "@/lib/admin/auth";
import { Card, PageHeader, StatusBadge } from "@/components/admin/layout-bits";
import { SITE_CONFIG } from "@/config/site";
import { utcIsoToZonedLocal } from "@/lib/utils";

export const metadata = { title: "Editorial calendar" };

interface Row { id: string; title: string; status: string; published_at: string | null; scheduled_for: string | null; editorial_notes: string | null; category: { name: string } | null; author: { name: string } | null }

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const sp = await searchParams;
  const ctx = await requireStaff("writer");
  const nowLocal = utcIsoToZonedLocal(new Date().toISOString(), SITE_CONFIG.timezone);
  const m = /^(\d{4})-(\d{2})$/.exec(sp.month ?? "");
  const year = m ? Number(m[1]) : Number(nowLocal.slice(0, 4));
  const month = m ? Math.min(12, Math.max(1, Number(m[2]))) : Number(nowLocal.slice(5, 7));
  const key = (y: number, mo: number) => `${y}-${String(mo).padStart(2, "0")}`;
  const prev = month === 1 ? key(year - 1, 12) : key(year, month - 1);
  const next = month === 12 ? key(year + 1, 1) : key(year, month + 1);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstDow = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7; // Monday first
  // pad the UTC window by a day each side so IST day boundaries are covered
  const from = new Date(Date.UTC(year, month - 1, 1) - 86400000).toISOString();
  const to = new Date(Date.UTC(year, month, 1) + 86400000).toISOString();
  const sel = "id,title,status,published_at,scheduled_for,editorial_notes,category:categories(name),author:authors(name)";

  const [sched, pub, backlog] = await Promise.all([
    ctx.supabase.from("articles").select(sel).eq("status", "scheduled").gte("scheduled_for", from).lte("scheduled_for", to),
    ctx.supabase.from("articles").select(sel).eq("status", "published").gte("published_at", from).lte("published_at", to),
    ctx.supabase.from("articles").select(sel).in("status", ["draft", "in_review"]).order("updated_at", { ascending: false }).limit(25),
  ]);
  const byDay = new Map<string, Row[]>();
  for (const r of [...((sched.data ?? []) as unknown as Row[]), ...((pub.data ?? []) as unknown as Row[])]) {
    const day = utcIsoToZonedLocal(r.status === "scheduled" ? r.scheduled_for : r.published_at).slice(0, 10);
    if (!day.startsWith(key(year, month))) continue;
    byDay.set(day, [...(byDay.get(day) ?? []), r]);
  }
  const monthName = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)));
  const cells = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const today = nowLocal.slice(0, 10);

  return (
    <>
      <PageHeader title="Editorial calendar" description={`Published and scheduled stories by day (${SITE_CONFIG.timezone}). Unscheduled work is listed below the calendar.`} />
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <Link href={`?month=${prev}`} className="inline-flex items-center gap-1 rounded px-2 py-1 text-sm font-semibold hover:bg-slate-100"><ChevronLeft className="h-4 w-4" aria-hidden="true" />Previous</Link>
          <h2 className="text-lg font-bold">{monthName}</h2>
          <Link href={`?month=${next}`} className="inline-flex items-center gap-1 rounded px-2 py-1 text-sm font-semibold hover:bg-slate-100">Next<ChevronRight className="h-4 w-4" aria-hidden="true" /></Link>
        </div>
        <div className="overflow-x-auto">
          <div className="grid min-w-[760px] grid-cols-7 gap-px rounded border border-slate-200 bg-slate-200 text-xs">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="bg-slate-100 px-2 py-1.5 font-bold uppercase tracking-wide text-slate-600">{d}</div>)}
            {cells.map((d, i) => {
              if (d === null) return <div key={`b${i}`} className="min-h-24 bg-slate-50" />;
              const dayKey = `${key(year, month)}-${String(d).padStart(2, "0")}`;
              const items = byDay.get(dayKey) ?? [];
              return (
                <div key={dayKey} className={`min-h-24 bg-white p-1.5 ${dayKey === today ? "ring-2 ring-inset ring-slate-900" : ""}`}>
                  <p className="mb-1 font-bold text-slate-500">{d}</p>
                  <ul className="space-y-1">
                    {items.map((a) => (
                      <li key={a.id}><Link href={`/admin/articles/${a.id}/edit`} className={`block truncate rounded px-1.5 py-0.5 font-medium ${a.status === "scheduled" ? "bg-blue-100 text-blue-900" : "bg-green-100 text-green-900"}`} title={a.title}>{a.title}</Link></li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
        <p className="mt-3 flex gap-4 text-xs text-slate-600"><span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-blue-200" aria-hidden="true" />Scheduled</span><span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-green-200" aria-hidden="true" />Published</span></p>
      </Card>

      <Card title="Content pipeline: drafts and in review" className="mt-6">
        {(backlog.data ?? []).length === 0 ? <p className="text-sm text-slate-500">No drafts in progress.</p> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm">
            <thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><th scope="col" className="py-2">Story</th><th scope="col">Status</th><th scope="col">Author</th><th scope="col">Category</th><th scope="col">Editorial notes</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {((backlog.data ?? []) as unknown as Row[]).map((a) => (
                <tr key={a.id} className="align-top"><td className="py-2 pr-3"><Link className="font-semibold hover:underline" href={`/admin/articles/${a.id}/edit`}>{a.title}</Link></td><td><StatusBadge status={a.status} /></td><td>{a.author?.name ?? "—"}</td><td>{a.category?.name ?? "—"}</td><td className="max-w-xs truncate text-slate-600" title={a.editorial_notes ?? ""}>{a.editorial_notes || "—"}</td></tr>
              ))}
            </tbody></table></div>
        )}
      </Card>
    </>
  );
}
