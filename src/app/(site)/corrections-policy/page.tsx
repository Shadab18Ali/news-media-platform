import { getSettings } from "@/lib/data/settings";
import { PageShell, staticPageMetadata, mailLink } from "@/components/site/page-shell";

export async function generateMetadata() {
  return staticPageMetadata("Corrections Policy", "/corrections-policy", "How to report an error and how we correct it.");
}

export default async function CorrectionsPage() {
  const s = await getSettings();
  return (
    <PageShell title="Corrections Policy" path="/corrections-policy" intro="We make mistakes. When we do, we fix them openly.">
      <h2>Reporting an error</h2>
      <p>If you believe a story contains a factual error, email {mailLink(s.publisher.correctionsEmail || s.publisher.contactEmail)} with the article link and what you believe is wrong, with supporting evidence if possible.</p>
      <h2>How we respond</h2>
      <ul>
        <li>We review every report and aim to respond within two working days.</li>
        <li>Confirmed errors are corrected in the article.</li>
        <li>Significant corrections carry a visible note describing what changed and when; the article’s “updated” date reflects the change.</li>
        <li>Where a story is fundamentally flawed we may retract it with an explanation.</li>
      </ul>
      <h2>What we do not change</h2>
      <p>We do not alter or remove accurate reporting because of disagreement or pressure, though we will consider requests for updates when circumstances change.</p>
    </PageShell>
  );
}
