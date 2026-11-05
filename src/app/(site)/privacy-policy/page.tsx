import { getSettings } from "@/lib/data/settings";
import { PageShell, staticPageMetadata, mailLink } from "@/components/site/page-shell";
import { CookieSettingsButton } from "@/components/site/consent-banner";

export async function generateMetadata() {
  return staticPageMetadata("Privacy Policy", "/privacy-policy", "How we collect, use and protect your personal information.");
}

export default async function PrivacyPage() {
  const s = await getSettings();
  const name = s.publisher.legalName || s.brand.name;
  const analytics = Boolean(s.integrations.ga4MeasurementId || s.integrations.gtmContainerId);
  return (
    <PageShell title="Privacy Policy" path="/privacy-policy" intro={`How ${s.brand.name} handles your information.`}>
      <p>This policy explains what personal data {name} (“we”, “us”) collects when you use this website, why, and the choices you have. For questions, contact {mailLink(s.publisher.contactEmail)}.</p>
      <h2>Information we collect</h2>
      <ul>
        <li><strong>Newsletter:</strong> your email address, only if you subscribe and consent. You can unsubscribe at any time.</li>
        <li><strong>Contact form:</strong> your name, email and message, used only to reply to you.</li>
        <li><strong>Usage data:</strong> basic technical data (pages viewed, approximate device and browser type) so that we can operate and improve the site{analytics ? ", including via Google Analytics if you consent" : ""}.</li>
      </ul>
      <h2>Cookies and similar technologies</h2>
      <p>Essential cookies make the site work (for example remembering your cookie choice). Non-essential cookies for analytics and advertising are used only if you give consent, and you can change your mind at any time:</p>
      <p><CookieSettingsButton className="rounded border border-ink px-3 py-1.5 font-sans text-sm font-semibold hover:bg-wash" /></p>
      {s.ads.enabled && (
        <>
          <h2>Advertising</h2>
          <p>We show ads served by third parties such as Google AdSense. These providers may use cookies to serve ads based on your visits to this and other websites if you consent. Learn more in Google’s <a href="https://policies.google.com/technologies/ads" rel="noopener noreferrer" target="_blank">advertising policies</a>, and manage personalised ads via <a href="https://adssettings.google.com" rel="noopener noreferrer" target="_blank">Google Ad Settings</a>.</p>
        </>
      )}
      <h2>How we use information</h2>
      <p>To deliver the site and newsletter, respond to enquiries, understand readership, prevent abuse and meet legal obligations. We do not sell your personal data.</p>
      <h2>Sharing</h2>
      <p>We share data only with service providers that help us run the site (hosting, database, email, analytics, advertising), under appropriate safeguards, or where required by law.</p>
      <h2>Retention and your rights</h2>
      <p>We keep personal data only as long as needed for the purposes above. Depending on where you live (including India’s Digital Personal Data Protection Act, 2023, and the GDPR) you may have the right to access, correct, delete or restrict use of your data, and to withdraw consent. Contact {mailLink(s.publisher.contactEmail)} to exercise these rights.</p>
      <h2>Children</h2>
      <p>This site is not directed at children under 13 and we do not knowingly collect their data.</p>
      <h2>Changes</h2>
      <p>We may update this policy and will revise the date below when we do. Last updated: {new Date().getFullYear()}.</p>
    </PageShell>
  );
}
