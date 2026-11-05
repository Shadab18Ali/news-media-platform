"use client";
import { useEffect, useRef } from "react";
import { useConsent } from "./consent-store";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/** AdSense unit; renders only after the visitor has granted advertising consent. */
export function AdsenseUnit({ client, slot, minHeight }: { client: string; slot: string; minHeight: number }) {
  const { consent } = useConsent();
  const pushed = useRef(false);
  const allowed = Boolean(consent?.advertising);

  useEffect(() => {
    if (!allowed || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.warn("AdSense push failed", e);
    }
  }, [allowed]);

  if (!allowed) return <div style={{ minHeight }} aria-hidden="true" />;
  return (
    <ins className="adsbygoogle" style={{ display: "block", minHeight }} data-ad-client={client} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true" />
  );
}

/**
 * Admin-authored third-party ad markup (direct deals, other networks). Only administrators
 * can create this content. It is injected into the page and its scripts are executed,
 * so it is gated by advertising consent like any other ad.
 */
export function CustomAdHtml({ html }: { html: string }) {
  const { consent } = useConsent();
  const ref = useRef<HTMLDivElement>(null);
  const allowed = Boolean(consent?.advertising);

  useEffect(() => {
    const el = ref.current;
    if (!allowed || !el) return;
    el.innerHTML = "";
    const range = document.createRange();
    range.selectNode(el);
    el.appendChild(range.createContextualFragment(html)); // executes <script> tags
  }, [allowed, html]);

  return <div ref={ref} />;
}
