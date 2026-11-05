import Link from "next/link";
import { getSettings } from "@/lib/data/settings";
import { PageShell, staticPageMetadata, mailLink } from "@/components/site/page-shell";

export async function generateMetadata() {
  const s = await getSettings();
  return staticPageMetadata("About Us", "/about", `About ${s.brand.name}: who we are, what we cover and how we work.`);
}

export default async function AboutPage() {
  const s = await getSettings();
  const p = s.publisher;
  return (
    <PageShell title="About Us" path="/about" intro={s.brand.description}>
      <p>{s.brand.name} is an independent digital publication covering technology, artificial intelligence, business and finance, startups, Indian and international news, education and careers, entertainment and lifestyle.</p>
      <h2>Our mission</h2>
      <p>To publish accurate, clearly explained and useful reporting for readers in India and around the world, and to be transparent about how we work and who is responsible for it.</p>
      <h2>Who we are</h2>
      <ul>
        {p.legalName && <li><strong>Publisher:</strong> {p.legalName}</li>}
        {p.editorInChief && <li><strong>Editor-in-chief:</strong> {p.editorInChief}</li>}
        {s.brand.foundedYear && <li><strong>Founded:</strong> {s.brand.foundedYear}</li>}
        {p.address && <li><strong>Address:</strong> {p.address}{p.country ? `, ${p.country}` : ""}</li>}
        <li><strong>Contact:</strong> {mailLink(p.contactEmail)}</li>
      </ul>
      <h2>How we work</h2>
      <p>Every story is attributed to a named author, carries its publication and update dates, and follows our <Link href="/editorial-policy">Editorial Policy</Link>. If we get something wrong we correct it openly under our <Link href="/corrections-policy">Corrections Policy</Link>. You can meet our reporters on the <Link href="/authors">Authors page</Link>.</p>
      <h2>Advertising and sponsorship</h2>
      <p>We are supported by advertising, affiliate partnerships and clearly labelled sponsored content. These never influence what we report. Details are on our <Link href="/advertise">Advertise With Us</Link> page.</p>
    </PageShell>
  );
}
