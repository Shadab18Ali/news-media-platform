"use client";
import type { Author, Category } from "@/types/db";
import { saveAuthor, saveCategory } from "@/app/admin/_actions/taxonomy";
import { Field, FormMessage, PendingButton, inputCls } from "./ui";
import { ImageField } from "./media-picker";
import { useKeepAction } from "./use-form-action";

export function CategoryForm({ category }: { category?: Category }) {
  const { state, onSubmit, pending } = useKeepAction(saveCategory, { resetOnSuccess: !category });
  const e = (k: string) => state.errors?.[k];
  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      {category && <input type="hidden" name="id" value={category.id} />}
      <Field label="Name" htmlFor={`cn-${category?.id ?? "new"}`} error={e("name")}><input id={`cn-${category?.id ?? "new"}`} name="name" required defaultValue={category?.name} className={inputCls} /></Field>
      <Field label="Slug" htmlFor={`cs-${category?.id ?? "new"}`} error={e("slug")} hint="Used in /category/slug. Generated from the name if empty."><input id={`cs-${category?.id ?? "new"}`} name="slug" defaultValue={category?.slug} className={inputCls} /></Field>
      <Field label="Description" htmlFor={`cd-${category?.id ?? "new"}`} error={e("description")} className="sm:col-span-2"><textarea id={`cd-${category?.id ?? "new"}`} name="description" rows={2} defaultValue={category?.description ?? ""} className={inputCls} /></Field>
      <div className="sm:col-span-2"><ImageField name="image_url" label="Category image" initialUrl={category?.image_url} /></div>
      <Field label="Image alt text" htmlFor={`ca-${category?.id ?? "new"}`}><input id={`ca-${category?.id ?? "new"}`} name="image_alt" defaultValue={category?.image_alt ?? ""} className={inputCls} /></Field>
      <Field label="Menu order" htmlFor={`co-${category?.id ?? "new"}`} hint="Lower numbers appear first."><input id={`co-${category?.id ?? "new"}`} name="sort_order" type="number" min={0} defaultValue={category?.sort_order ?? 100} className={inputCls} /></Field>
      <Field label="SEO title" htmlFor={`ct-${category?.id ?? "new"}`} error={e("seo_title")}><input id={`ct-${category?.id ?? "new"}`} name="seo_title" defaultValue={category?.seo_title ?? ""} className={inputCls} /></Field>
      <Field label="SEO description" htmlFor={`cm-${category?.id ?? "new"}`} error={e("seo_description")}><input id={`cm-${category?.id ?? "new"}`} name="seo_description" defaultValue={category?.seo_description ?? ""} className={inputCls} /></Field>
      <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="show_in_nav" defaultChecked={category?.show_in_nav ?? true} className="h-4 w-4" /> Show in main navigation</label>
      <div className="flex items-center gap-3 sm:col-span-2"><PendingButton pending={pending}>{category ? "Save category" : "Add category"}</PendingButton><FormMessage state={state} /></div>
    </form>
  );
}

export function AuthorForm({ author, staff }: { author?: Author; staff: { id: string; label: string }[] }) {
  const { state, onSubmit, pending } = useKeepAction(saveAuthor, { resetOnSuccess: !author });
  const e = (k: string) => state.errors?.[k];
  const k = author?.id ?? "new";
  const soc = author?.social ?? {};
  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      {author && <input type="hidden" name="id" value={author.id} />}
      <Field label="Full name" htmlFor={`an-${k}`} error={e("name")}><input id={`an-${k}`} name="name" required defaultValue={author?.name} className={inputCls} /></Field>
      <Field label="Slug" htmlFor={`as-${k}`} error={e("slug")} hint="Used in /author/slug."><input id={`as-${k}`} name="slug" defaultValue={author?.slug} className={inputCls} /></Field>
      <Field label="Job title" htmlFor={`aj-${k}`}><input id={`aj-${k}`} name="job_title" defaultValue={author?.job_title ?? ""} className={inputCls} /></Field>
      <Field label="Public email (optional)" htmlFor={`ae-${k}`} error={e("email")}><input id={`ae-${k}`} name="email" type="email" defaultValue={author?.email ?? ""} className={inputCls} /></Field>
      <Field label="Biography" htmlFor={`ab-${k}`} error={e("bio")} className="sm:col-span-2" hint="A real, factual bio builds reader trust and supports Google News requirements."><textarea id={`ab-${k}`} name="bio" rows={4} defaultValue={author?.bio ?? ""} className={inputCls} /></Field>
      <div className="sm:col-span-2"><ImageField name="avatar_url" label="Profile image" initialUrl={author?.avatar_url} /></div>
      {(["twitter", "linkedin", "instagram", "facebook", "website"] as const).map((s) => (
        <Field key={s} label={`${s[0].toUpperCase()}${s.slice(1)} URL`} htmlFor={`a${s}-${k}`} error={e(s)}><input id={`a${s}-${k}`} name={s} type="url" placeholder="https://" defaultValue={soc[s] ?? ""} className={inputCls} /></Field>
      ))}
      <Field label="Linked staff login (optional)" htmlFor={`ap-${k}`} hint="Pre-selects this author for that user's new articles."><select id={`ap-${k}`} name="profile_id" defaultValue={author?.profile_id ?? ""} className={inputCls}><option value="">— None —</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_active" defaultChecked={author?.is_active ?? true} className="h-4 w-4" /> Active (visible on the site)</label>
      <div className="flex items-center gap-3 sm:col-span-2"><PendingButton pending={pending}>{author ? "Save author" : "Add author"}</PendingButton><FormMessage state={state} /></div>
    </form>
  );
}
