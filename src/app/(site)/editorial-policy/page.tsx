import Link from "next/link";
import { getSettings } from "@/lib/data/settings";
import { PageShell, staticPageMetadata, mailLink } from "@/components/site/page-shell";

export async function generateMetadata() {
  return staticPageMetadata("Editorial Policy", "/editorial-policy", "The standards we hold ourselves to: accuracy, independence, sourcing and transparency.");
}

export default async function EditorialPolicyPage() {
  const s = await getSettings();
  return (
    <PageShell title="Editorial Policy" path="/editorial-policy" intro="How we decide what to publish and the standards every story must meet.">
      <h2>Accuracy and sourcing</h2>
      <p>We verify facts before publication, prefer primary sources and named sources, and cite where information comes from. We do not fabricate quotes, statistics or sources, and we do not copy other publishers’ work.</p>
      <h2>Independence</h2>
      <p>Editorial decisions are made independently of advertisers, sponsors and affiliate partners. Commercial content is always clearly labelled (“{s.features.sponsoredLabel}”) and kept separate from reporting.</p>
      <h2>Authorship and transparency</h2>
      <p>Each article names its author and shows when it was published and last updated. Author profiles are on our <Link href="/authors">Authors page</Link>.</p>
      <h2>Use of automated tools</h2>
      {s.features.autoPublishHours > 0 ? (
        <p>Automated tools help us draft stories from named, linked sources. Most are reviewed and fact-checked by an editor before publication. Some drafts are published automatically after a short window of about {s.features.autoPublishHours} hour{s.features.autoPublishHours === 1 ? "" : "s"} if no editor has changed them; every such story carries a visible label saying it was published without editor review. We correct errors promptly (see below).</p>
      ) : (
        <p>Automated tools may assist with research, drafting or summarising. Nothing is published unless a human editor has reviewed it and verified its facts. Any story substantially prepared with such tools carries a disclosure.</p>
      )}
      <h2>Images</h2>
      <p>We use images we own, have licensed, or that are created for us, and we do not use other publishers’ photographs without permission. Image credits and captions are provided where applicable.</p>
      <h2>Corrections</h2>
      <p>We correct errors promptly and openly. See our <Link href="/corrections-policy">Corrections Policy</Link>.</p>
      <h2>Contact the editors</h2>
      <p>{s.publisher.editorInChief ? `${s.publisher.editorInChief}, Editor-in-chief. ` : ""}Email {mailLink(s.publisher.contactEmail)}.</p>
    </PageShell>
  );
}
