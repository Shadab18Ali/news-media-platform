"use client";
import { useEffect, useState } from "react";
import { OPEN_CONSENT_EVENT } from "@/lib/consent";
import { saveConsent, useConsent } from "./consent-store";

/**
 * Cookie/analytics consent. Rendered only when a tracking or advertising integration
 * is actually configured. Nothing non-essential loads before the visitor opts in.
 */
export function ConsentBanner({ analytics, advertising }: { analytics: boolean; advertising: boolean }) {
  const { consent, ready } = useConsent();
  const [reopened, setReopened] = useState(false);
  const [custom, setCustom] = useState(false);
  const [a, setA] = useState(false);
  const [m, setM] = useState(false);

  useEffect(() => {
    const open = () => setReopened(true);
    window.addEventListener(OPEN_CONSENT_EVENT, open);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, open);
  }, []);

  if (!ready || (!analytics && !advertising)) return null;
  if (consent && !reopened) return null;

  const done = (v: { analytics: boolean; advertising: boolean }) => {
    saveConsent(v);
    setReopened(false);
    setCustom(false);
  };

  return (
    <div role="dialog" aria-label="Cookie preferences" aria-live="polite" className="fixed inset-x-0 bottom-0 z-50 border-t border-rule bg-white shadow-[0_-8px_30px_rgba(0,0,0,.12)]">
      <div className="mx-auto max-w-5xl px-4 py-4 sm:flex sm:items-start sm:gap-6">
        <div className="flex-1 text-sm text-body">
          <p className="font-semibold text-ink">Your privacy choices</p>
          <p className="mt-1 text-muted">
            We use cookies to measure how the site is used{advertising ? " and to show and measure advertising" : ""}. Essential cookies are always on.
            Read our <a className="underline" href="/privacy-policy">Privacy Policy</a>.
          </p>
          {custom && (
            <div className="mt-3 space-y-2">
              {analytics && (
                <label className="flex items-center gap-2"><input type="checkbox" checked={a} onChange={(e) => setA(e.target.checked)} className="h-4 w-4" /> Analytics (anonymous usage statistics)</label>
              )}
              {advertising && (
                <label className="flex items-center gap-2"><input type="checkbox" checked={m} onChange={(e) => setM(e.target.checked)} className="h-4 w-4" /> Advertising (ads and ad measurement)</label>
              )}
            </div>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2 sm:mt-0 sm:flex-col">
          <button type="button" onClick={() => done({ analytics, advertising })} className="rounded bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-black">Accept all</button>
          <button type="button" onClick={() => done({ analytics: false, advertising: false })} className="rounded border border-ink px-4 py-2 text-sm font-semibold text-ink hover:bg-wash">Reject non-essential</button>
          {custom ? (
            <button type="button" onClick={() => done({ analytics: analytics && a, advertising: advertising && m })} className="rounded border border-rule px-4 py-2 text-sm font-semibold hover:bg-wash">Save choices</button>
          ) : (
            <button type="button" onClick={() => setCustom(true)} className="px-4 py-2 text-sm font-semibold underline">Customise</button>
          )}
        </div>
      </div>
    </div>
  );
}

export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))}>
      Cookie settings
    </button>
  );
}
