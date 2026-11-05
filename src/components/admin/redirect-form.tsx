"use client";
import { saveRedirect } from "@/app/admin/_actions/taxonomy";
import { Field, FormMessage, PendingButton, inputCls } from "./ui";
import { useKeepAction } from "./use-form-action";

export function RedirectForm() {
  const { state, onSubmit, pending } = useKeepAction(saveRedirect, { resetOnSuccess: true });
  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-4">
      <Field label="From path" htmlFor="rd-from" error={state.errors?.from_path} hint="e.g. /old-page" className="sm:col-span-1"><input id="rd-from" name="from_path" required placeholder="/old-page" className={inputCls} /></Field>
      <Field label="To" htmlFor="rd-to" error={state.errors?.to_path} hint="Path or full URL" className="sm:col-span-2"><input id="rd-to" name="to_path" required placeholder="/news/new-page" className={inputCls} /></Field>
      <Field label="Type" htmlFor="rd-code"><select id="rd-code" name="status_code" className={inputCls} defaultValue="301"><option value="301">301 permanent</option><option value="302">302 temporary</option><option value="308">308 permanent</option><option value="307">307 temporary</option></select></Field>
      <div className="flex items-center gap-3 sm:col-span-4"><PendingButton pending={pending}>Add redirect</PendingButton><FormMessage state={state} /></div>
    </form>
  );
}
