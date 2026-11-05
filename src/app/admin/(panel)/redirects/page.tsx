import { requireStaff } from "@/lib/admin/auth";
import { deleteRedirect, toggleRedirect } from "../../_actions/taxonomy";
import { Card, Empty, PageHeader } from "@/components/admin/layout-bits";
import { SubmitButton } from "@/components/admin/ui";
import { RedirectForm } from "@/components/admin/redirect-form";

export const metadata = { title: "Redirects" };

export default async function RedirectsPage() {
  const ctx = await requireStaff("editor");
  const { data } = await ctx.supabase.from("redirects").select("*").order("created_at", { ascending: false }).limit(300);
  return (
    <>
      <PageHeader title="Redirects" description="Send old URLs to new ones. Redirects are also created automatically when you change the slug of a live article." />
      <Card title="Add redirect"><RedirectForm /></Card>
      <Card title={`All redirects (${data?.length ?? 0})`} className="mt-6">
        {(data ?? []).length === 0 ? <Empty>No redirects.</Empty> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs uppercase text-slate-500"><th scope="col" className="py-2">From</th><th scope="col">To</th><th scope="col">Type</th><th scope="col">Active</th><th scope="col" className="text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {(data ?? []).map((r) => (
                <tr key={r.id}><td className="py-2 font-mono text-xs">{r.from_path}</td><td className="font-mono text-xs">{r.to_path}</td><td>{r.status_code}</td><td>{r.is_active ? "Yes" : "No"}</td>
                  <td><div className="flex justify-end gap-2">
                    <form action={toggleRedirect}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="active" value={r.is_active ? "0" : "1"} /><SubmitButton variant="secondary" className="!px-2.5 !py-1 text-xs">{r.is_active ? "Disable" : "Enable"}</SubmitButton></form>
                    <form action={deleteRedirect}><input type="hidden" name="id" value={r.id} /><SubmitButton variant="ghost" confirm="Delete this redirect?" className="!px-2.5 !py-1 text-xs text-red-700">Delete</SubmitButton></form>
                  </div></td></tr>
              ))}
            </tbody></table></div>
        )}
      </Card>
    </>
  );
}
