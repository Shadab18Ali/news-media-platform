import { Trash2 } from "lucide-react";
import { requireStaff, hasRole } from "@/lib/admin/auth";
import { deleteMedia } from "../../_actions/taxonomy";
import { Card, Empty, Notice, PageHeader } from "@/components/admin/layout-bits";
import { SubmitButton } from "@/components/admin/ui";
import { CopyUrl } from "@/components/admin/copy-url";
import { MediaUploader } from "@/components/admin/media-uploader";
import { MediaEditForm } from "@/components/admin/media-edit-form";
import { formatDate, pageFromParam } from "@/lib/utils";

export const metadata = { title: "Media" };
const PER = 24;

export default async function MediaPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const ctx = await requireStaff("writer");
  const page = pageFromParam(sp.page);
  const { data, count } = await ctx.supabase.from("media").select("*", { count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * PER, page * PER - 1);
  const items = data ?? [];

  // Which images are referenced right now (featured/OG image, avatars, category images)?
  const [a, b, c] = await Promise.all([
    ctx.supabase.from("articles").select("featured_image_url,og_image_url"),
    ctx.supabase.from("authors").select("avatar_url"),
    ctx.supabase.from("categories").select("image_url"),
  ]);
  const used = new Set<string>();
  for (const r of a.data ?? []) { if (r.featured_image_url) used.add(r.featured_image_url); if (r.og_image_url) used.add(r.og_image_url); }
  for (const r of b.data ?? []) if (r.avatar_url) used.add(r.avatar_url);
  for (const r of c.data ?? []) if (r.image_url) used.add(r.image_url);
  const canDelete = hasRole(ctx.role, "editor");
  const pages = Math.max(1, Math.ceil((count ?? 0) / PER));

  return (
    <>
      <PageHeader title="Media library" description="Upload once, reuse everywhere. Images are optimised on upload." />
      {sp.error && <div className="mb-4"><Notice tone="warn">{sp.error}</Notice></div>}
      {sp.deleted && <div className="mb-4"><Notice tone="success">Image deleted.</Notice></div>}
      <Card title="Upload"><MediaUploader /></Card>
      <div className="mt-6">
        {items.length === 0 ? <Empty>No images uploaded yet.</Empty> : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {items.map((m) => {
              const inUse = used.has(m.url) || (m.og_url && used.has(m.og_url));
              return (
                <li key={m.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.url} alt={m.alt_text ?? ""} loading="lazy" className="aspect-[16/10] w-full bg-slate-100 object-cover" />
                  <div className="p-3">
                    <p className="truncate text-xs font-semibold text-slate-800" title={m.filename}>{m.filename}</p>
                    <p className="text-xs text-slate-500">{m.width}×{m.height} · {Math.round(m.size_bytes / 1024)} KB · {formatDate(m.created_at)} · {inUse ? <span className="font-semibold text-green-700">in use</span> : "unused"}</p>
                    {!m.alt_text && <p className="mt-1 text-xs font-semibold text-amber-700">Missing alt text</p>}
                    {canDelete ? <MediaEditForm id={m.id} alt={m.alt_text ?? ""} caption={m.caption ?? ""} /> : <p className="mt-2 text-xs">{m.alt_text}</p>}
                    <CopyUrl value={m.url} />
                    {canDelete && (
                      <form action={deleteMedia} className="mt-2">
                        <input type="hidden" name="id" value={m.id} />
                        <SubmitButton variant="ghost" confirm="Delete this image permanently?" className="!px-2 !py-1 text-xs text-red-700 hover:!bg-red-50"><Trash2 className="h-3.5 w-3.5" aria-hidden="true" />Delete</SubmitButton>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {pages > 1 && <p className="mt-4 text-sm">Page {page} of {pages} {page > 1 && <a className="underline" href={`?page=${page - 1}`}>Previous</a>} {page < pages && <a className="ml-2 underline" href={`?page=${page + 1}`}>Next</a>}</p>}
      </div>
    </>
  );
}
