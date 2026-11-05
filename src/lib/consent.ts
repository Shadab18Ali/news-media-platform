export interface Consent {
  analytics: boolean;
  advertising: boolean;
  /** consent record version; bump to re-ask everyone */
  v: 1;
}

export const CONSENT_COOKIE = "site_consent";
export const CONSENT_EVENT = "consent-changed";
export const OPEN_CONSENT_EVENT = "open-consent";

export function parseConsent(raw: string | null | undefined): Consent | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(decodeURIComponent(raw));
    if (v && v.v === 1 && typeof v.analytics === "boolean" && typeof v.advertising === "boolean") return v as Consent;
  } catch {}
  return null;
}

export function readConsentCookie(cookieString: string): Consent | null {
  const m = cookieString.split("; ").find((c) => c.startsWith(`${CONSENT_COOKIE}=`));
  return parseConsent(m?.slice(CONSENT_COOKIE.length + 1));
}

export function serializeConsent(c: Consent): string {
  return encodeURIComponent(JSON.stringify(c));
}
