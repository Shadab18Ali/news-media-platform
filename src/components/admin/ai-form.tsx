"use client";
import { generateDraftAction } from "@/app/admin/_actions/ai";
import { Field, FormMessage, PendingButton, inputCls } from "./ui";
import { useKeepAction } from "./use-form-action";
import type { Category } from "@/types/db";

export function AiDraftForm({ categories }: { categories: Category[] }) {
  const { state, onSubmit, pending } = useKeepAction(generateDraftAction);
  const e = (k: string) => state.errors?.[k];
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Topic" htmlFor="ai-topic" error={e("topic")}><input id="ai-topic" name="topic" required maxLength={300} className={inputCls} /></Field>
      <Field label="Angle (optional)" htmlFor="ai-angle"><input id="ai-angle" name="angle" maxLength={300} className={inputCls} /></Field>
      <Field label="Category" htmlFor="ai-cat"><select id="ai-cat" name="category_id" className={inputCls}><option value="">— Select later —</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
      <Field label="Source notes" htmlFor="ai-src" error={e("sources_text")} hint="Paste the facts you have verified from trusted sources. First line of each block: “Title | https://link”, then the notes. Separate sources with a blank line.">
        <textarea id="ai-src" name="sources_text" rows={12} required className={`${inputCls} font-mono`} placeholder={"Reuters report | https://example.com/article\nKey facts and exact quotes from this source…\n\nOfficial statement | https://example.com/statement\n…"} />
      </Field>
      <div className="flex items-center gap-3"><PendingButton pending={pending}>Generate draft</PendingButton><FormMessage state={state} /></div>
    </form>
  );
}
