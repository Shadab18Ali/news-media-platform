"use client";
import { useActionState } from "react";
import { subscribeNewsletter, type FormState } from "@/app/(site)/actions";
import { Loader2 } from "lucide-react";

const initial: FormState = { ok: false };

export function NewsletterForm({ headline, blurb, source = "site", dark }: { headline: string; blurb: string; source?: string; dark?: boolean }) {
  const [state, action, pending] = useActionState(subscribeNewsletter, initial);
  const id = `nl-${source}`;
  return (
    <section aria-labelledby={`${id}-h`} className={dark ? "rounded bg-accent p-6 text-white" : "rounded border border-rule bg-wash p-6"}>
      <h2 id={`${id}-h`} className={`headline text-2xl ${dark ? "!text-white" : ""}`}>{headline}</h2>
      <p className={`mt-1 text-sm ${dark ? "text-white/80" : "text-muted"}`}>{blurb}</p>
      {state.ok ? (
        <p role="status" className="mt-4 font-semibold">{state.message}</p>
      ) : (
        <form action={action} className="mt-4">
          <input type="hidden" name="source" value={source} />
          {/* honeypot: real visitors never see or fill this */}
          <div className="absolute -left-[9999px]" aria-hidden="true">
            <label>Website<input type="text" name="website" tabIndex={-1} autoComplete="off" /></label>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label htmlFor={`${id}-email`} className="sr-only">Email address</label>
            <input id={`${id}-email`} name="email" type="email" required autoComplete="email" placeholder="you@example.com"
              className="min-w-0 flex-1 rounded border border-rule bg-white px-3 py-2.5 text-ink" />
            <button type="submit" disabled={pending} className="inline-flex items-center justify-center gap-2 rounded bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
              {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Subscribe
            </button>
          </div>
          <label className={`mt-3 flex items-start gap-2 text-xs ${dark ? "text-white/80" : "text-muted"}`}>
            <input type="checkbox" name="consent" required className="mt-0.5 h-4 w-4" />
            <span>I agree to receive the newsletter and accept the <a className="underline" href="/privacy-policy">Privacy Policy</a>.</span>
          </label>
          {state.message && <p role="alert" className="mt-2 text-sm font-semibold text-red-600">{state.message}</p>}
        </form>
      )}
    </section>
  );
}
