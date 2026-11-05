"use client";
import { updateMedia } from "@/app/admin/_actions/taxonomy";
import { FormMessage, PendingButton, inputCls } from "./ui";
import { useKeepAction } from "./use-form-action";

export function MediaEditForm({ id, alt, caption }: { id: string; alt: string; caption: string }) {
  const { state, onSubmit, pending } = useKeepAction(updateMedia);
  return (
    <form onSubmit={onSubmit} className="mt-2 space-y-2">
      <input type="hidden" name="id" value={id} />
      <label className="block text-xs font-semibold" htmlFor={`alt-${id}`}>Alt text</label>
      <input id={`alt-${id}`} name="alt_text" defaultValue={alt} maxLength={300} className={inputCls} />
      <label className="block text-xs font-semibold" htmlFor={`cap-${id}`}>Caption</label>
      <input id={`cap-${id}`} name="caption" defaultValue={caption} maxLength={500} className={inputCls} />
      <div className="flex items-center gap-2"><PendingButton pending={pending} variant="secondary" className="!px-3 !py-1.5">Save</PendingButton><FormMessage state={state} /></div>
    </form>
  );
}
