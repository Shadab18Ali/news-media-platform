import { Trash2 } from "lucide-react";
import { requireStaff } from "@/lib/admin/auth";
import { listAuthors } from "@/lib/admin/queries";
import { deleteAuthor } from "../../_actions/taxonomy";
import { Card, Empty, Notice, PageHeader } from "@/components/admin/layout-bits";
import { AuthorForm } from "@/components/admin/entity-forms";
import { SubmitButton } from "@/components/admin/ui";

export const metadata = { title: "Authors" };

export default async function AuthorsAdminPage({ searchParams }: { searchParams: Promise<{ error?: string; deleted?: string }> }) {
  const sp = await searchParams;
  const ctx = await requireStaff("editor");
  const [authors, { data: profiles }] = await Promise.all([
    listAuthors(ctx, false),
    ctx.supabase.from("profiles").select("id,email,full_name,role").in("role", ["writer", "editor", "admin"]).order("email"),
  ]);
  const staff = (profiles ?? []).map((p) => ({ id: p.id as string, label: `${p.full_name || p.email} (${p.role})` }));
  return (
    <>
      <PageHeader title="Authors" description="Bylines shown on articles and on public author pages." />
      {sp.error && <div className="mb-4"><Notice tone="warn">{sp.error}</Notice></div>}
      {sp.deleted && <div className="mb-4"><Notice tone="success">Author deleted. Their articles are now unattributed.</Notice></div>}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_32rem]">
        <Card title={`All authors (${authors.length})`}>
          {authors.length === 0 ? <Empty>No authors yet. Add one so articles can carry a byline.</Empty> : (
            <ul className="divide-y divide-slate-100">
              {authors.map((a) => (
                <li key={a.id}>
                  <details className="group py-3">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                      <span><span className="font-semibold text-slate-900">{a.name}</span> <span className="text-xs text-slate-500">/author/{a.slug}{!a.is_active && " · inactive"}</span></span>
                      <span className="text-sm font-semibold text-slate-600 underline group-open:hidden">Edit</span>
                    </summary>
                    <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-4">
                      <AuthorForm author={a} staff={staff} />
                      <form action={deleteAuthor} className="mt-4 border-t border-slate-200 pt-4">
                        <input type="hidden" name="id" value={a.id} />
                        <SubmitButton variant="danger" confirm={`Delete ${a.name}? Their articles stay published but lose the byline.`}><Trash2 className="h-4 w-4" aria-hidden="true" />Delete author</SubmitButton>
                      </form>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Add author"><AuthorForm staff={staff} /></Card>
      </div>
    </>
  );
}
