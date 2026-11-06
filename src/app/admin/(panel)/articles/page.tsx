import Link from "next/link";
import { Copy, ExternalLink, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { requireStaff, hasRole } from "@/lib/admin/auth";
import { listCategories } from "@/lib/admin/queries";
import { deleteArticle, duplicateArticle } from "../../_actions/articles";
import { Card, Empty, LinkButton, Notice, PageHeader, StatusBadge } from "@/components/admin/layout-bits";
import { SubmitButton, inputCls } from "@/components/admin/ui";
import { BulkBar } from "@/components/admin/bulk-bar";
import { ARTICLE_STATUSES } from "@/config/site";
import { escapeLike, formatDateTime, pageFromParam } from "@/lib/utils";

export const metadata = { title: "Articles" };
const PER = 20;

export default async function ArticlesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const ctx = await requireStaff("writer");
  const page = pageFromParam(sp.page);
  const q = escapeLike(sp.q ?? "").slice(0, 80);
  const status = (ARTICLE_STATUSES as readonly string[]).includes(sp.status ?? "") ? sp.status : undefined;
  const categories = await listCategories(ctx);

  let query = ctx.supabase.from("articles")
    .select("id,title,slug,status,published_at,scheduled_for,updated_at,view_count,article_type,created_by,category:categories(name),author:authors(name)", { count: "exact" })
    .order("updated_at", { ascending: false }).range((page - 1) * PER, page * PER - 1);
  // Writers only manage their own work (published articles are public, but not theirs to edit).
  if (ctx.role === "writer") query = query.eq("created_by", ctx.user.id);
  if (status) query = query.eq("status", status);
  if (sp.category && /^[0-9a-f-]{36}$/i.test(sp.category)) query = query.eq("category_id", sp.category);
  if (q) query = query.or(`title.ilike.%${q}%,slug.ilike.%${q}%`);
  const { data, count, error } = await query;
  const rows = (data ?? []) as unknown as { id: string; title: string; slug: string; status: string; published_at: string | null; scheduled_for: string | null; updated_at: string; view_count: number; article_type: string; created_by: string | null; category: { name: string } | null; author: { name: string } | null }[];
  const pages = Math.max(1, Math.ceil((count ?? 0) / PER));
  const isEditor = hasRole(ctx.role, "editor");
  const qs = (p: number) => { const u = new URLSearchParams(); if (status) u.set("status", status); if (q) u.set("q", q); if (sp.category) u.set("category", sp.category); u.set("page", String(p)); return `?${u}`; };

  return (
    <>
      <PageHeader title="Articles" description={ctx.role === "writer" ? "You can see and edit your own drafts." : "All articles across the newsroom."} actions={<LinkButton href="/admin/articles/new"><Plus className="h-4 w-4" aria-hidden="true" />New article</LinkButton>} />
      {sp.deleted && <div className="mb-4"><Notice tone="success">Article deleted.</Notice></div>}
      {sp.updated && <div className="mb-4"><Notice tone="success">Article updated.</Notice></div>}
      {error && <div className="mb-4"><Notice tone="warn">Could not load articles. Check your Supabase connection.</Notice></div>}
      {sp.bulk && <div className="mb-4"><Notice tone={sp.bulk.startsWith("ok:") ? "success" : "warn"}>{sp.bulk.replace(/^(ok|error):/, "")}</Notice></div>}
      <Card>
        <form className="mb-4 flex flex-wrap items-end gap-3" role="search">
          <div><label htmlFor="f-q" className="text-xs font-semibold">Search</label><input id="f-q" name="q" defaultValue={q} placeholder="Title or slug" className={inputCls} /></div>
          <div><label htmlFor="f-status" className="text-xs font-semibold">Status</label>
            <select id="f-status" name="status" defaultValue={status ?? ""} className={inputCls}><option value="">All</option>{ARTICLE_STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}</select></div>
          <div><label htmlFor="f-cat" className="text-xs font-semibold">Category</label>
            <select id="f-cat" name="category" defaultValue={sp.category ?? ""} className={inputCls}><option value="">All</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <button className="inline-flex items-center gap-1.5 rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white"><Search className="h-4 w-4" aria-hidden="true" />Filter</button>
        </form>

        {isEditor && rows.some((r) => ["draft", "in_review"].includes(r.status)) && <BulkBar />}
        {rows.length === 0 ? <Empty>No articles match. <Link className="underline" href="/admin/articles/new">Create the first one</Link>.</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <caption className="sr-only">Articles</caption>
              <thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">{isEditor && <th scope="col" className="w-8 py-2"><span className="sr-only">Select</span></th>}<th scope="col" className="py-2 pr-3">Title</th><th scope="col" className="px-3">Status</th><th scope="col" className="px-3">Category</th><th scope="col" className="px-3">Author</th><th scope="col" className="px-3">Date (IST)</th><th scope="col" className="px-3 text-right">Views</th><th scope="col" className="pl-3 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((a) => {
                  const canDelete = isEditor || (a.created_by === ctx.user.id && a.status === "draft");
                  return (
                    <tr key={a.id} className="align-top">
                      {isEditor && <td className="py-3">{["draft", "in_review"].includes(a.status) && <input type="checkbox" name="ids" value={a.id} form="bulk-form" className="h-4 w-4" aria-label={`Select ${a.title}`} />}</td>}
                      <td className="py-3 pr-3"><Link href={`/admin/articles/${a.id}/edit`} className="font-semibold text-slate-900 hover:underline">{a.title}</Link><p className="text-xs text-slate-500">/news/{a.slug}{a.article_type !== "article" && ` · ${a.article_type}`}</p></td>
                      <td className="px-3"><StatusBadge status={a.status} /></td>
                      <td className="px-3">{a.category?.name ?? "—"}</td>
                      <td className="px-3">{a.author?.name ?? "—"}</td>
                      <td className="whitespace-nowrap px-3 text-xs">{a.status === "scheduled" ? <>Scheduled<br />{formatDateTime(a.scheduled_for)}</> : a.published_at ? formatDateTime(a.published_at) : <>Edited<br />{formatDateTime(a.updated_at)}</>}</td>
                      <td className="px-3 text-right tabular-nums">{a.view_count.toLocaleString("en-IN")}</td>
                      <td className="pl-3"><div className="flex flex-wrap justify-end gap-1">
                        <Link href={`/admin/articles/${a.id}/edit`} className="rounded p-1.5 hover:bg-slate-100" title="Edit"><Pencil className="h-4 w-4" aria-hidden="true" /><span className="sr-only">Edit {a.title}</span></Link>
                        {a.status === "published" && <Link href={`/news/${a.slug}`} target="_blank" className="rounded p-1.5 hover:bg-slate-100" title="View live"><ExternalLink className="h-4 w-4" aria-hidden="true" /><span className="sr-only">View {a.title} live</span></Link>}
                        <form action={duplicateArticle}><input type="hidden" name="id" value={a.id} /><button className="rounded p-1.5 hover:bg-slate-100" title="Duplicate"><Copy className="h-4 w-4" aria-hidden="true" /><span className="sr-only">Duplicate {a.title}</span></button></form>
                        {canDelete && <form action={deleteArticle}><input type="hidden" name="id" value={a.id} /><SubmitButton variant="ghost" confirm={`Permanently delete “${a.title}”? This cannot be undone.`} className="!p-1.5 text-red-700 hover:!bg-red-50"><Trash2 className="h-4 w-4" aria-hidden="true" /><span className="sr-only">Delete {a.title}</span></SubmitButton></form>}
                      </div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {pages > 1 && (
          <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm">
            {page > 1 ? <Link className="underline" href={qs(page - 1)}>← Previous</Link> : <span />}
            <span>Page {page} of {pages} · {count} articles</span>
            {page < pages ? <Link className="underline" href={qs(page + 1)}>Next →</Link> : <span />}
          </nav>
        )}
      </Card>
    </>
  );
}
