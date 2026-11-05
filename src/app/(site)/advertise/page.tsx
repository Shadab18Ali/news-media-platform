import { getSettings } from "@/lib/data/settings";
import { PageShell, staticPageMetadata, mailLink } from "@/components/site/page-shell";

export async function generateMetadata() {
  return staticPageMetadata("Advertise With Us", "/advertise", "Reach our readers with display advertising, sponsored content and partnerships.");
}

export default async function AdvertisePage() {
  const s = await getSettings();
  const email = s.publisher.advertiseEmail || s.publisher.contactEmail;
  return (
    <PageShell title="Advertise With Us" path="/advertise" intro={`Reach readers who follow ${s.brand.name} for technology, business and news.`}>
      <h2>Ways to partner</h2>
      <ul>
        <li><strong>Display advertising:</strong> responsive placements across the homepage, sections and articles.</li>
        <li><strong>Sponsored content:</strong> articles written with or for your brand, always clearly labelled “{s.features.sponsoredLabel}”.</li>
        <li><strong>Newsletter sponsorship</strong> and <strong>affiliate partnerships</strong>.</li>
      </ul>
      <h2>Our principles</h2>
      <p>Advertising and sponsored content are kept separate from our reporting, labelled clearly and never allowed to change editorial coverage. We reserve the right to decline any advertisement.</p>
      <h2>Get in touch</h2>
      <p>Email {mailLink(email)} with your goals, timeline and budget, and we will send options and our media kit.</p>
    </PageShell>
  );
}
