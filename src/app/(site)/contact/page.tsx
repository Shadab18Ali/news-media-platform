import { getSettings } from "@/lib/data/settings";
import { PageShell, staticPageMetadata, mailLink } from "@/components/site/page-shell";
import { ContactForm } from "./contact-form";

export async function generateMetadata() {
  return staticPageMetadata("Contact Us", "/contact", "Get in touch with our editorial team: tips, corrections, partnerships and general enquiries.");
}

export default async function ContactPage() {
  const s = await getSettings();
  const p = s.publisher;
  return (
    <PageShell title="Contact Us" path="/contact" intro="News tips, corrections, partnership enquiries or feedback: we read every message.">
      <ul>
        <li><strong>General &amp; editorial:</strong> {mailLink(p.contactEmail)}</li>
        {p.correctionsEmail && <li><strong>Corrections:</strong> {mailLink(p.correctionsEmail)}</li>}
        {p.advertiseEmail && <li><strong>Advertising:</strong> {mailLink(p.advertiseEmail)}</li>}
        {p.phone && <li><strong>Phone:</strong> {p.phone}</li>}
        {p.address && <li><strong>Address:</strong> {p.address}{p.country ? `, ${p.country}` : ""}</li>}
      </ul>
      <h2>Send us a message</h2>
      <div className="not-prose font-sans"><ContactForm /></div>
    </PageShell>
  );
}
