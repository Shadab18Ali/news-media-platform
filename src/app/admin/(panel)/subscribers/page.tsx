import Link from "next/link";
import { Download } from "lucide-react";
import { requireStaff, hasRole } from "@/lib/admin/auth";
import { deleteMessage, markMessageRead } from "../../_actions/ops";
import { Card, Empty, PageHeader } from "@/components/admin/layout-bits";
import { SubmitButton } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Subscribers & inbox" };

export default async function SubscribersPage() {
  const ctx = await requireStaff("editor");
  const [subs, total, msgs] = await Promise.all([
    ctx.supabase.from("newsletter_subscribers").select("id,email,status,source,created_at").order("created_at", { ascending: false }).limit(100),
    ctx.supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("status", "subscribed"),
    ctx.supabase.from("contact_messages").select("*").order("created_at", { ascending: false }).limit(50),
  ]);
  const isAdmin = hasRole(ctx.role, "admin");
  return (
    <>
      <PageHeader title="Subscribers & inbox" description="Newsletter sign-ups and messages from the contact form." actions={<Link href="/api/admin/subscribers" prefetch={false} className="inline-flex items-center gap-2 rounded border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"><Download className="h-4 w-4" aria-hidden="true" />Export CSV</Link>} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title={`Contact messages (${msgs.data?.length ?? 0})`}>
          {(msgs.data ?? []).length === 0 ? <Empty>No messages yet.</Empty> : (
            <ul className="divide-y divide-slate-100">
              {(msgs.data ?? []).map((m) => (
                <li key={m.id} className="py-3 text-sm">
                  <p className="font-semibold">{m.is_read ? "" : "● "}{m.subject || "(no subject)"}</p>
                  <p className="text-xs text-slate-500">{m.name} · <a className="underline" href={`mailto:${m.email}`}>{m.email}</a> · {formatDateTime(m.created_at)}</p>
                  <p className="mt-1 whitespace-pre-wrap">{m.message}</p>
                  <div className="mt-2 flex gap-2">
                    <form action={markMessageRead}><input type="hidden" name="id" value={m.id} /><input type="hidden" name="read" value={m.is_read ? "0" : "1"} /><SubmitButton variant="secondary" className="!px-2.5 !py-1 text-xs">Mark {m.is_read ? "unread" : "read"}</SubmitButton></form>
                    {isAdmin && <form action={deleteMessage}><input type="hidden" name="id" value={m.id} /><SubmitButton variant="ghost" confirm="Delete this message?" className="!px-2.5 !py-1 text-xs text-red-700">Delete</SubmitButton></form>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title={`Newsletter subscribers (${total.count ?? 0} active)`}>
          {(subs.data ?? []).length === 0 ? <Empty>No subscribers yet.</Empty> : (
            <table className="w-full text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs uppercase text-slate-500"><th scope="col" className="py-2">Email</th><th scope="col">Status</th><th scope="col">Joined</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{(subs.data ?? []).map((s) => <tr key={s.id}><td className="py-1.5">{s.email}</td><td>{s.status}</td><td className="text-xs">{formatDateTime(s.created_at)}</td></tr>)}</tbody></table>
          )}
          <p className="mt-3 text-xs text-slate-500">Showing the latest 100. Export the full list as CSV to use with your email-sending service.</p>
        </Card>
      </div>
    </>
  );
}
