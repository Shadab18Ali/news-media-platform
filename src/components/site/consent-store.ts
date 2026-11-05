"use client";
import { useMemo, useSyncExternalStore } from "react";
import { CONSENT_COOKIE, CONSENT_EVENT, parseConsent, readConsentCookie, serializeConsent, type Consent } from "@/lib/consent";

function subscribe(cb: () => void) {
  window.addEventListener(CONSENT_EVENT, cb);
  return () => window.removeEventListener(CONSENT_EVENT, cb);
}
const snapshot = () => document.cookie;
const serverSnapshot = () => "";

/** Returns the stored consent (null = not decided yet) and whether we are hydrated. */
export function useConsent(): { consent: Consent | null; ready: boolean } {
  const raw = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const ready = useSyncExternalStore(() => () => {}, () => true, () => false);
  const consent = useMemo(() => readConsentCookie(raw), [raw]);
  return { consent, ready };
}

export function saveConsent(c: Omit<Consent, "v">) {
  const value: Consent = { ...c, v: 1 };
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${serializeConsent(value)}; Max-Age=${60 * 60 * 24 * 180}; Path=/; SameSite=Lax${secure}`;
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

export { parseConsent };
