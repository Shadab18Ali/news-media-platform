import Link from "next/link";
import { getSettings } from "@/lib/data/settings";
import { PageShell, staticPageMetadata, mailLink } from "@/components/site/page-shell";

export async function generateMetadata() {
  return staticPageMetadata("Terms and Conditions", "/terms-and-conditions", "The terms that apply when you use this website.");
}

export default async function TermsPage() {
  const s = await getSettings();
  const name = s.publisher.legalName || s.brand.name;
  return (
    <PageShell title="Terms and Conditions" path="/terms-and-conditions">
      <p>By accessing this website you agree to these terms. If you do not agree, please do not use the site.</p>
      <h2>Use of content</h2>
      <p>All articles, images and design on this site are owned by {name} or its licensors and are protected by copyright. You may share links and short quotations with attribution. You may not republish, scrape or commercially reuse our content without written permission.</p>
      <h2>Acceptable use</h2>
      <p>You agree not to misuse the site: no attempts to disrupt it, gain unauthorised access, or submit unlawful, abusive or misleading content through our forms.</p>
      <h2>Accuracy and liability</h2>
      <p>We work to publish accurate information (see our <Link href="/editorial-policy">Editorial Policy</Link>) but provide the site “as is”. See our <Link href="/disclaimer">Disclaimer</Link>. To the extent permitted by law, we are not liable for losses arising from use of or reliance on the site.</p>
      <h2>Third-party links and advertising</h2>
      <p>The site may link to or display third-party websites and advertisements. We do not control and are not responsible for their content or practices.</p>
      <h2>Changes and governing law</h2>
      <p>We may update these terms from time to time. These terms are governed by the laws of {s.publisher.country || "India"}. Questions: {mailLink(s.publisher.contactEmail)}.</p>
    </PageShell>
  );
}
