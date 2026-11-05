"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, AlertTriangle, XCircle, Eye } from "lucide-react";
import type { Article, Author, Category } from "@/types/db";
import { ARTICLE_TYPES } from "@/config/site";
import { saveArticle } from "@/app/admin/_actions/articles";
import { Field, FormMessage, inputCls } from "./ui";
import { Card } from "./layout-bits";
import { RichEditor } from "./rich-editor";
import { ImageField } from "./media-picker";
import { useKeepAction } from "./use-form-action";
import { runSeoChecks } from "@/lib/admin/seo-checks";
import { slugify, utcIsoToZonedLocal, cn } from "@/lib/utils";
import { sourcesToText } from "@/lib/admin/article-form";
import { Loader2 } from "lucide-react";

interface Props {
  article: Article | null;
  categories: Category[];
  authors: Author[];
  tagNames: string[];
  allTags: string[];
  canPublish: boolean;
  defaultAuthorId?: string | null;
}

function Btn({ intent, children, pending, variant = "secondary" }: { intent: string; children: React.ReactNode; pending: boolean; variant?: "primary" | "secondary" | "danger" }) {
  const cls = { primary: "bg-slate-900 text-white hover:bg-black", secondary: "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50", danger: "border border-red-300 bg-white text-red-700 hover:bg-red-50" }[variant];
  return (
    <button type="submit" name="intent" value={intent} disabled={pending} className={cn("inline-flex items-center justify-center gap-2 rounded px-3 py-2 text-sm font-semibold disabled:opacity-60", cls)}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}{children}
    </button>
  );
}

export function ArticleForm({ article, categories, authors, tagNames, allTags, canPublish, defaultAuthorId }: Props) {
  const { state, onSubmit, pending } = useKeepAction(saveArticle);
  const err = (k: string) => state.errors?.[k];

  const [title, setTitle] = useState(article?.title ?? "");
  const [slug, setSlug] = useState(article?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(article));
  const [seoTitle, setSeoTitle] = useState(article?.seo_title ?? "");
  const [meta, setMeta] = useState(article?.meta_description ?? "");
  const [kw, setKw] = useState(article?.focus_keyword ?? "");
  const [html, setHtml] = useState(article?.content ?? "");
  const [imgUrl, setImgUrl] = useState(article?.featured_image_url ?? "");
  const [imgAlt, setImgAlt] = useState(article?.featured_image_alt ?? "");
  const [type, setType] = useState<string>(article?.article_type ?? "article");
  const [ai, setAi] = useState(article?.ai_generated ?? false);
  const status = article?.status ?? "draft";

  const checks = useMemo(() => runSeoChecks({ title, seoTitle, metaDescription: meta, focusKeyword: kw, slug, contentHtml: html, imageUrl: imgUrl, imageAlt: imgAlt }), [title, seoTitle, meta, kw, slug, html, imgUrl, imgAlt]);
  const Icon = { good: CheckCircle2, warn: AlertTriangle, bad: XCircle };
  const tone = { good: "text-green-700", warn: "text-amber-600", bad: "text-red-600" };

  return (
    <form onSubmit={onSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]" noValidate>
      {article && <input type="hidden" name="id" value={article.id} />}
      <div className="space-y-6">
        <FormMessage state={state} />
        <Card>
          <div className="space-y-4">
            <Field label="Headline" htmlFor="title" error={err("title")}>
              <input id="title" name="title" value={title} required maxLength={300} className={cn(inputCls, "text-lg font-semibold")}
                onChange={(e) => { setTitle(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }} />
            </Field>
            <Field label="URL slug" htmlFor="slug" error={err("slug")} hint={`Public URL: /news/${slug || "your-slug"} · generated from the headline until you edit it`}>
              <input id="slug" name="slug" value={slug} maxLength={200} className={inputCls}
                onChange={(e) => { setSlugTouched(true); setSlug(slugify(e.target.value, 200)); }} />
            </Field>
            <Field label="Excerpt / standfirst" htmlFor="excerpt" error={err("excerpt")} hint="One or two sentences shown under the headline and in listings.">
              <textarea id="excerpt" name="excerpt" rows={3} maxLength={600} defaultValue={article?.excerpt ?? ""} className={inputCls} />
            </Field>
            <div>
              <p className="text-sm font-semibold text-slate-800">Article body</p>
              {err("content") && <p role="alert" className="text-xs font-semibold text-red-700">{err("content")?.[0]}</p>}
              <div className="mt-1"><RichEditor name="content" initialHtml={article?.content ?? ""} onChange={setHtml} /></div>
            </div>
          </div>
        </Card>

        <Card title="Search engine optimisation">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={`SEO title (${(seoTitle || title).length}/60)`} htmlFor="seo_title" error={err("seo_title")} hint="Defaults to the headline." className="sm:col-span-2">
              <input id="seo_title" name="seo_title" value={seoTitle} maxLength={120} onChange={(e) => setSeoTitle(e.target.value)} className={inputCls} />
            </Field>
            <Field label={`Meta description (${meta.length}/160)`} htmlFor="meta_description" error={err("meta_description")} className="sm:col-span-2">
              <textarea id="meta_description" name="meta_description" rows={3} maxLength={320} value={meta} onChange={(e) => setMeta(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Focus keyword" htmlFor="focus_keyword" error={err("focus_keyword")}>
              <input id="focus_keyword" name="focus_keyword" value={kw} maxLength={100} onChange={(e) => setKw(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Canonical URL" htmlFor="canonical_url" error={err("canonical_url")} hint="Leave empty unless this republishes content from another URL.">
              <input id="canonical_url" name="canonical_url" type="url" defaultValue={article?.canonical_url ?? ""} className={inputCls} placeholder="https://" />
            </Field>
            <div className="sm:col-span-2">
              <ImageField name="og_image_url" label="Open Graph / social image" initialUrl={article?.og_image_url} variant="og" hint="1200×630 version is generated automatically. Falls back to the featured image." />
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="noindex" defaultChecked={article?.noindex} className="h-4 w-4" /> Hide from search engines (noindex) and the sitemap</label>
          </div>
          <ul className="mt-5 space-y-1.5 border-t border-slate-200 pt-4" aria-label="SEO checklist">
            {checks.map((c) => {
              const I = Icon[c.status];
              return <li key={c.id} className="flex items-start gap-2 text-sm"><I className={cn("mt-0.5 h-4 w-4 shrink-0", tone[c.status])} aria-hidden="true" /><span>{c.label}<span className="sr-only"> — {c.status}</span></span></li>;
            })}
          </ul>
        </Card>

        <Card title="Editorial">
          <div className="space-y-4">
            <Field label="Sources & references" htmlFor="sources_text" error={err("sources_text")} hint="One per line: “Publication or title | https://link”. Required for researched stories; shown at the end of the article.">
              <textarea id="sources_text" name="sources_text" rows={4} defaultValue={sourcesToText(article?.sources)} className={cn(inputCls, "font-mono")} />
            </Field>
            <Field label="Internal editorial notes" htmlFor="editorial_notes" hint="Never shown publicly. For planning, instructions and hand-offs.">
              <textarea id="editorial_notes" name="editorial_notes" rows={3} defaultValue={article?.editorial_notes ?? ""} className={inputCls} />
            </Field>
            <fieldset className="rounded border border-slate-200 p-3">
              <legend className="px-1 text-sm font-semibold text-slate-800">Verification</legend>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="ai_generated" checked={ai} onChange={(e) => setAi(e.target.checked)} className="h-4 w-4" /> Drafted with automated/AI assistance</label>
              <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" name="fact_checked" defaultChecked={article?.fact_checked} className="h-4 w-4" /> Facts, quotes and figures verified against sources</label>
              {ai && (
                <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" name="human_reviewed" defaultChecked={Boolean(article?.human_reviewed_at)} disabled={!canPublish} className="h-4 w-4" /> A human editor has reviewed and approved this text{!canPublish && " (editor/admin only)"}</label>
              )}
              {err("ai_generated") && <p role="alert" className="mt-2 text-xs font-semibold text-red-700">{err("ai_generated")?.[0]}</p>}
              {ai && <p className="mt-2 text-xs text-slate-500">Machine-assisted drafts can never be published or scheduled until both boxes are ticked. This is also enforced in the database.</p>}
            </fieldset>
          </div>
        </Card>
      </div>

      <aside className="space-y-6">
        <Card title="Publish">
          <p className="mb-3 text-sm">Status: <strong className="capitalize">{status.replace("_", " ")}</strong>{article?.published_at && status === "published" && <> · live since {utcIsoToZonedLocal(article.published_at).replace("T", " ")} IST</>}</p>
          {canPublish && (
            <div className="mb-4 space-y-3">
              <Field label="Schedule for (IST)" htmlFor="scheduled_for_local" error={err("scheduled_for_local")} hint="Asia/Kolkata. Published automatically by the scheduler.">
                <input id="scheduled_for_local" name="scheduled_for_local" type="datetime-local" defaultValue={utcIsoToZonedLocal(article?.scheduled_for)} className={inputCls} />
              </Field>
              <Field label="Publication date override (IST)" htmlFor="published_at_local" hint="Optional. Back-date when publishing now.">
                <input id="published_at_local" name="published_at_local" type="datetime-local" defaultValue={utcIsoToZonedLocal(article?.published_at)} className={inputCls} />
              </Field>
            </div>
          )}
          <div className="flex flex-col gap-2">
            {canPublish ? (
              <>
                <Btn intent="publish" pending={pending} variant="primary">{status === "published" ? "Update live article" : "Publish now"}</Btn>
                <Btn intent="schedule" pending={pending}>Schedule</Btn>
                <Btn intent="save" pending={pending}>Save without changing status</Btn>
                {status === "published" && <Btn intent="unpublish" pending={pending} variant="danger">Unpublish (to draft)</Btn>}
                {status !== "archived" && <Btn intent="archive" pending={pending}>Archive</Btn>}
              </>
            ) : (
              <>
                <Btn intent="save" pending={pending} variant="primary">Save draft</Btn>
                <Btn intent="submit_review" pending={pending}>Submit for review</Btn>
              </>
            )}
            {canPublish && status !== "in_review" && status !== "published" && <Btn intent="submit_review" pending={pending}>Mark as in review</Btn>}
            {article && (
              <Link href={`/admin/articles/${article.id}/preview`} target="_blank" className="inline-flex items-center justify-center gap-2 rounded border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50">
                <Eye className="h-4 w-4" aria-hidden="true" /> Preview
              </Link>
            )}
          </div>
        </Card>

        <Card title="Organisation">
          <div className="space-y-4">
            <Field label="Article type" htmlFor="article_type">
              <select id="article_type" name="article_type" value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
                {ARTICLE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            {type === "sponsored" && (
              <Field label="Sponsor name" htmlFor="sponsor_name" error={err("sponsor_name")} hint="Shown in the “Sponsored” disclosure.">
                <input id="sponsor_name" name="sponsor_name" defaultValue={article?.sponsor_name ?? ""} className={inputCls} />
              </Field>
            )}
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="has_affiliate_links" defaultChecked={article?.has_affiliate_links || type === "affiliate"} className="h-4 w-4" /> Contains affiliate links (shows disclosure)</label>
            <Field label="Category" htmlFor="category_id" error={err("category_id")}>
              <select id="category_id" name="category_id" defaultValue={article?.category_id ?? ""} className={inputCls}>
                <option value="">— Select —</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Author" htmlFor="author_id">
              <select id="author_id" name="author_id" defaultValue={article?.author_id ?? defaultAuthorId ?? ""} className={inputCls}>
                <option value="">— None —</option>
                {authors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </Field>
            <Field label="Tags" htmlFor="tags" hint="Comma separated, up to 15.">
              <input id="tags" name="tags" list="tag-suggestions" defaultValue={tagNames.join(", ")} className={inputCls} />
              <datalist id="tag-suggestions">{allTags.map((t) => <option key={t} value={t} />)}</datalist>
            </Field>
          </div>
        </Card>

        <Card title="Featured image">
          <div className="space-y-4">
            <ImageField name="featured_image_url" label="Image" initialUrl={article?.featured_image_url} initialId={article?.featured_image_id}
              onPicked={(m) => { setImgUrl(m.url); if (m.alt_text && !imgAlt) setImgAlt(m.alt_text); }} hint="16:9 works best; the site crops consistently." />
            <Field label="Alt text" htmlFor="featured_image_alt" error={err("featured_image_alt")} hint="Describe what the image shows. Required to publish.">
              <input id="featured_image_alt" name="featured_image_alt" value={imgAlt} maxLength={300} onChange={(e) => setImgAlt(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Caption / credit" htmlFor="featured_image_caption">
              <input id="featured_image_caption" name="featured_image_caption" defaultValue={article?.featured_image_caption ?? ""} maxLength={500} className={inputCls} />
            </Field>
          </div>
        </Card>

        <Card title="Placement">
          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" name="is_featured" defaultChecked={article?.is_featured} className="h-4 w-4" /> Featured story (homepage hero)</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="is_breaking" defaultChecked={article?.is_breaking} className="h-4 w-4" /> Breaking news banner</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="is_trending" defaultChecked={article?.is_trending} className="h-4 w-4" /> Trending</label>
          </div>
        </Card>
      </aside>
    </form>
  );
}
