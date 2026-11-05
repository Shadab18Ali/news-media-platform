"use client";
import { useActionState } from "react";
import { submitContact, type FormState } from "../actions";
import { Loader2 } from "lucide-react";

const initial: FormState = { ok: false };

export function ContactForm() {
  const [state, action, pending] = useActionState(submitContact, initial);
  if (state.ok) return <p role="status" className="rounded border border-green-300 bg-green-50 p-4 font-semibold text-green-900">{state.message}</p>;
  const err = (k: string) => state.errors?.[k]?.[0];
  const input = "mt-1 w-full rounded border border-rule bg-white px-3 py-2.5 text-ink";
  return (
    <form action={action} className="space-y-4" noValidate={false}>
      <div className="absolute -left-[9999px]" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <div>
        <label htmlFor="c-name" className="font-semibold text-ink">Name</label>
        <input id="c-name" name="name" required maxLength={120} autoComplete="name" className={input} aria-invalid={Boolean(err("name"))} />
        {err("name") && <p className="mt-1 text-sm text-red-700">{err("name")}</p>}
      </div>
      <div>
        <label htmlFor="c-email" className="font-semibold text-ink">Email</label>
        <input id="c-email" name="email" type="email" required maxLength={254} autoComplete="email" className={input} aria-invalid={Boolean(err("email"))} />
        {err("email") && <p className="mt-1 text-sm text-red-700">{err("email")}</p>}
      </div>
      <div>
        <label htmlFor="c-subject" className="font-semibold text-ink">Subject <span className="font-normal text-muted">(optional)</span></label>
        <input id="c-subject" name="subject" maxLength={200} className={input} />
      </div>
      <div>
        <label htmlFor="c-message" className="font-semibold text-ink">Message</label>
        <textarea id="c-message" name="message" required minLength={10} maxLength={5000} rows={6} className={input} aria-invalid={Boolean(err("message"))} />
        {err("message") && <p className="mt-1 text-sm text-red-700">{err("message")}</p>}
      </div>
      {state.message && !state.ok && <p role="alert" className="font-semibold text-red-700">{state.message}</p>}
      <button type="submit" disabled={pending} className="inline-flex items-center gap-2 rounded bg-ink px-6 py-2.5 font-semibold text-white hover:bg-black disabled:opacity-60">
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Send message
      </button>
    </form>
  );
}
