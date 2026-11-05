import Link from "next/link";
import { getSettings } from "@/lib/data/settings";
import { PageShell, staticPageMetadata } from "@/components/site/page-shell";

export async function generateMetadata() {
  return staticPageMetadata("Disclaimer", "/disclaimer", "Important information about the content published on this website.");
}

export default async function DisclaimerPage() {
  const s = await getSettings();
  return (
    <PageShell title="Disclaimer" path="/disclaimer">
      <p>The content on {s.brand.name} is provided for general information only.</p>
      <h2>Not professional advice</h2>
      <p>Articles about business, finance, investing, health, law or any other regulated topic are not financial, legal, medical or other professional advice. Consult a qualified professional before making decisions.</p>
      <h2>Opinions</h2>
      <p>Opinion pieces and third-party quotations reflect the views of their authors, not necessarily of {s.brand.name}.</p>
      <h2>Sponsored and affiliate content</h2>
      <p>Some content is sponsored or contains affiliate links and is always labelled as such. We may earn a commission if you buy through affiliate links; this never affects our editorial independence.</p>
      <h2>External links</h2>
      <p>We are not responsible for the content of external websites we link to.</p>
      <h2>Errors</h2>
      <p>Despite our care, errors can occur. Tell us via the <Link href="/contact">contact page</Link> and see our <Link href="/corrections-policy">Corrections Policy</Link>.</p>
    </PageShell>
  );
}
