import { Trash2 } from "lucide-react";
import { requireStaff } from "@/lib/admin/auth";
import { listCategories } from "@/lib/admin/queries";
import { deleteCategory } from "../../_actions/taxonomy";
import { Card, Empty, Notice, PageHeader } from "@/components/admin/layout-bits";
import { CategoryForm } from "@/components/admin/entity-forms";
import { SubmitButton } from "@/components/admin/ui";

export const metadata = { title: "Categories" };

export default async function CategoriesPage({ searchParams }: { searchParams: Promise<{ error?: string; deleted?: string }> }) {
  const sp = await searchParams;
  const ctx = await requireStaff("editor");
  const categories = await listCategories(ctx);
  const { data: counts } = await ctx.supabase.from("articles").select("category_id");
  const tally = new Map<string, number>();
  for (const r of counts ?? []) if (r.category_id) tally.set(r.category_id, (tally.get(r.category_id) ?? 0) + 1);

  return (
    <>
      <PageHeader title="Categories" description="Sections of the site. Categories marked for navigation appear in the main menu." />
      {sp.error && <div className="mb-4"><Notice tone="warn">{sp.error}</Notice></div>}
      {sp.deleted && <div className="mb-4"><Notice tone="success">Category deleted.</Notice></div>}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_28rem]">
        <Card title={`All categories (${categories.length})`}>
          {categories.length === 0 ? <Empty>No categories yet. Add the first one.</Empty> : (
            <ul className="divide-y divide-slate-100">
              {categories.map((c) => (
                <li key={c.id}>
                  <details className="group py-3">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                      <span><span className="font-semibold text-slate-900">{c.name}</span> <span className="text-xs text-slate-500">/category/{c.slug} · {tally.get(c.id) ?? 0} articles{!c.show_in_nav && " · hidden from menu"}</span></span>
                      <span className="text-sm font-semibold text-slate-600 underline group-open:hidden">Edit</span>
                    </summary>
                    <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-4">
                      <CategoryForm category={c} />
                      <form action={deleteCategory} className="mt-4 border-t border-slate-200 pt-4">
                        <input type="hidden" name="id" value={c.id} />
                        <SubmitButton variant="danger" confirm={`Delete the “${c.name}” category?`}><Trash2 className="h-4 w-4" aria-hidden="true" />Delete category</SubmitButton>
                      </form>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Add category"><CategoryForm /></Card>
      </div>
    </>
  );
}
