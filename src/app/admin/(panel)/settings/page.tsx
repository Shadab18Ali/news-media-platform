import Link from "next/link";
import { requireStaff } from "@/lib/admin/auth";
import { getSettings } from "@/lib/data/settings";
import { Card, Notice, PageHeader } from "@/components/admin/layout-bits";
import { SettingsGroupForm, type FieldDef } from "@/components/admin/settings-forms";

export const metadata = { title: "Site settings" };

const BRAND: FieldDef[] = [
  { name: "name", label: "Site name" }, { name: "tagline", label: "Tagline" },
  { name: "description", label: "Description", type: "textarea", hint: "Used in the footer, About page and default meta description." },
  { name: "logoUrl", label: "Logo", type: "image", hint: "Shown in the header and in structured data. Without one, the site name is set in type." },
  { name: "faviconUrl", label: "Favicon", type: "image" },
  { name: "defaultOgImage", label: "Default social-sharing image", type: "image", hint: "1200×630. Used when an article has no image." },
  { name: "primaryColor", label: "Primary colour", type: "color" }, { name: "accentColor", label: "Accent / dark colour", type: "color" },
  { name: "foundedYear", label: "Founded (year)", type: "number" }, { name: "twitterHandle", label: "X / Twitter handle", placeholder: "@yourbrand" },
  { name: "twitter", label: "X / Twitter URL", type: "url" }, { name: "facebook", label: "Facebook URL", type: "url" },
  { name: "instagram", label: "Instagram URL", type: "url" }, { name: "youtube", label: "YouTube URL", type: "url" }, { name: "linkedin", label: "LinkedIn URL", type: "url" },
];
const PUBLISHER: FieldDef[] = [
  { name: "legalName", label: "Legal / publisher name", hint: "Shown on About, in the footer and in schema.org data (Google News transparency)." },
  { name: "editorInChief", label: "Editor-in-chief" },
  { name: "contactEmail", label: "Contact email", type: "email" }, { name: "correctionsEmail", label: "Corrections email", type: "email" },
  { name: "advertiseEmail", label: "Advertising email", type: "email" }, { name: "phone", label: "Phone" },
  { name: "address", label: "Postal address", type: "textarea" }, { name: "country", label: "Country" },
];
const SEO: FieldDef[] = [
  { name: "titleTemplate", label: "Page title template", hint: "Must contain %s, e.g. “%s | Your Brand”." },
  { name: "defaultDescription", label: "Default meta description", type: "textarea" },
  { name: "googleSiteVerification", label: "Google Search Console verification token", hint: "Only the token from the HTML-tag method (the content=\"…\" value)." },
  { name: "bingSiteVerification", label: "Bing Webmaster verification token" },
];
const INTEGRATIONS: FieldDef[] = [
  { name: "ga4MeasurementId", label: "Google Analytics 4 measurement ID", placeholder: "G-XXXXXXXXXX", hint: "Leave empty to keep analytics off. Loads only after visitor consent." },
  { name: "gtmContainerId", label: "Google Tag Manager container ID", placeholder: "GTM-XXXXXXX", hint: "Optional. Use either GA4 here or inside GTM, not both." },
  { name: "adsensePublisherId", label: "AdSense publisher ID", placeholder: "ca-pub-0000000000000000", hint: "Needed before any AdSense unit can show. Ads also need the master switch on the Advertising page." },
];
const FEATURES: FieldDef[] = [
  { name: "newsletter", label: "Show newsletter sign-up forms", type: "checkbox" }, { name: "breakingTicker", label: "Show breaking-news banner on the homepage", type: "checkbox" },
  { name: "newsletterHeadline", label: "Newsletter headline" }, { name: "newsletterBlurb", label: "Newsletter description" },
  { name: "sponsoredLabel", label: "Sponsored-content label" },
  { name: "autoPublishHours", label: "Auto-publish drafts after (hours)", type: "number", hint: "0 = off. When above 0, machine-written drafts that nobody has edited are published automatically after this many hours, with a visible label saying they were not reviewed by an editor. Requires migration 0006 in Supabase." },
  { name: "affiliateDisclosure", label: "Affiliate disclosure text", type: "textarea", hint: "Shown on affiliate articles and any article flagged as containing affiliate links." },
];

export default async function SettingsPage() {
  await requireStaff("admin");
  const s = await getSettings();
  const sections: [string, string, string, FieldDef[], Record<string, unknown>][] = [
    ["brand", "Brand identity", "Name, logo and colours are applied everywhere automatically.", BRAND, s.brand],
    ["publisher", "Publisher details", "Public transparency information for readers and Google News.", PUBLISHER, s.publisher],
    ["seo", "SEO & verification", "Defaults for metadata and site-ownership verification.", SEO, s.seo],
    ["integrations", "Google integrations", "Public identifiers only. Never paste secrets here.", INTEGRATIONS, s.integrations],
    ["features", "Features & disclosures", "", FEATURES, s.features],
  ];
  return (
    <>
      <PageHeader title="Site settings" description="Everything about the brand is configured here; nothing is hardcoded." />
      <div className="mb-6"><Notice>Secrets (service-role key, cron secret, drafting-provider key) live in environment variables, not here. Advertising switches are on the <Link className="underline" href="/admin/ads">Advertising</Link> page.</Notice></div>
      <div className="space-y-6">
        {sections.map(([group, title, desc, fields, values]) => (
          <Card key={group} title={title}>
            {desc && <p className="mb-4 text-sm text-slate-600">{desc}</p>}
            <SettingsGroupForm group={group} fields={fields} values={values} />
          </Card>
        ))}
      </div>
    </>
  );
}
