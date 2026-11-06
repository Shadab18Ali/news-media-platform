"use client";
import { useState } from "react";
import { bulkPublish } from "@/app/admin/_actions/bulk";
import { SubmitButton } from "./ui";
import { Rocket } from "lucide-react";

/** Controls for publishing many drafts at once. Row checkboxes elsewhere on the page use form="bulk-form". */
export function BulkBar() {
  const [count, setCount] = useState(0);
  const boxes = () => Array.from(document.querySelectorAll<HTMLInputElement>('input[name="ids"]'));
  const recount = () => setCount(boxes().filter((b) => b.checked).length);
  return (
    <form id="bulk-form" action={bulkPublish} onChange={recount} className="mb-4 rounded border border-slate-200 bg-slate-50 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex items-center gap-2 font-semibold">
          <input type="checkbox" className="h-4 w-4" aria-label="Select all drafts on this page"
            onChange={(e) => { boxes().forEach((b) => { b.checked = e.currentTarget.checked; }); recount(); }} />
          Select all drafts on this page
        </label>
        <span aria-live="polite" className="text-slate-600">{count} selected</span>
        <label className="flex items-center gap-2">Release
          <select name="release" defaultValue="now" className="rounded border border-slate-300 bg-white px-2 py-1">
            <option value="now">all now</option>
            <option value="5">one every 5 minutes</option>
            <option value="10">one every 10 minutes</option>
            <option value="30">one every 30 minutes</option>
            <option value="60">one every hour</option>
          </select>
        </label>
      </div>
      <label className="mt-3 flex items-start gap-2">
        <input type="checkbox" name="confirm" className="mt-0.5 h-4 w-4" />
        <span>I have reviewed the selected articles and checked their facts, quotes and sources. (For machine-written drafts this is recorded as the human review.)</span>
      </label>
      <div className="mt-3 flex items-center gap-3">
        <SubmitButton confirm="Publish or schedule all selected articles?"><Rocket className="h-4 w-4" aria-hidden="true" />Publish selected</SubmitButton>
        <span className="text-xs text-slate-500">Timed releases are published by the scheduler (see Logs &amp; publishing).</span>
      </div>
    </form>
  );
}
