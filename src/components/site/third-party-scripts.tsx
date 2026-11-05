"use client";
import Script from "next/script";
import { GA4_RE, GTM_RE, ADSENSE_RE } from "@/lib/settings-schema";
import { useConsent } from "./consent-store";

interface Props {
  ga4?: string;
  gtm?: string;
  adsense?: string;
  adsEnabled: boolean;
}

/**
 * Loads Google tags only when (a) the ID is configured AND well-formed and (b) the visitor
 * has consented to the relevant category. Placeholder values never load anything.
 */
export function ThirdPartyScripts({ ga4, gtm, adsense, adsEnabled }: Props) {
  const { consent } = useConsent();
  if (!consent) return null;
  const useGa = consent.analytics && ga4 && GA4_RE.test(ga4);
  const useGtm = consent.analytics && gtm && GTM_RE.test(gtm);
  const useAds = consent.advertising && adsEnabled && adsense && ADSENSE_RE.test(adsense);

  return (
    <>
      {useGa && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga4}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga4}',{anonymize_ip:true});`}</Script>
        </>
      )}
      {useGtm && (
        <Script id="gtm-init" strategy="afterInteractive">{`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm}');`}</Script>
      )}
      {useAds && (
        <Script async strategy="afterInteractive" crossOrigin="anonymous" src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsense}`} />
      )}
    </>
  );
}
