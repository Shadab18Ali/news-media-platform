import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { ConsentBanner } from "@/components/site/consent-banner";
import { ThirdPartyScripts } from "@/components/site/third-party-scripts";
import { JsonLd } from "@/components/site/json-ld";
import { getSettings } from "@/lib/data/settings";
import { organizationSchema, websiteSchema } from "@/lib/seo/schema";
import { ADSENSE_RE, GA4_RE, GTM_RE } from "@/lib/settings-schema";

/**
 * Public-site chrome. Consent UI, Google tags and site-wide structured data live here (not in the
 * root layout) so they never load inside /admin.
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  const ga4 = s.integrations.ga4MeasurementId;
  const gtm = s.integrations.gtmContainerId;
  const adsense = s.integrations.adsensePublisherId;
  const analyticsOn = Boolean((ga4 && GA4_RE.test(ga4)) || (gtm && GTM_RE.test(gtm)));
  const adsOn = s.ads.enabled;
  return (
    <>
      <JsonLd data={[organizationSchema(s), websiteSchema(s)]} />
      <Header />
      <main id="main" tabIndex={-1} className="mx-auto max-w-7xl px-4 pt-6 outline-none">{children}</main>
      <Footer />
      <ConsentBanner analytics={analyticsOn} advertising={adsOn && Boolean(adsense && ADSENSE_RE.test(adsense))} />
      <ThirdPartyScripts ga4={ga4} gtm={gtm} adsense={adsense} adsEnabled={adsOn} />
    </>
  );
}
