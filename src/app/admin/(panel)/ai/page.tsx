import { requireStaff } from "@/lib/admin/auth";
import { aiProvider } from "@/lib/ai/provider";
import { listCategories } from "@/lib/admin/queries";
import { Card, Notice, PageHeader } from "@/components/admin/layout-bits";
import { AiDraftForm } from "@/components/admin/ai-form";

export const metadata = { title: "Drafting assistant" };

export default async function AiPage() {
  const ctx = await requireStaff("editor");
  const provider = aiProvider();
  const categories = await listCategories(ctx);
  return (
    <>
      <PageHeader title="Drafting assistant" description="Optional. Turns source notes you have verified into a first draft. The site works fully without it." />
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Notice tone={provider.isConfigured() ? "success" : "info"}>
          Provider: <strong>{provider.label}</strong>. {provider.isConfigured() ? "Ready." : "Not configured. Set AI_PROVIDER, AI_API_KEY and AI_MODEL (and AI_BASE_URL for OpenAI-compatible APIs) in your environment. No paid API is required to use the rest of the platform."}
        </Notice>
        <Notice tone="warn"><strong>Safeguards.</strong> Drafts use only the notes you supply, are saved as <em>drafts</em> flagged as machine-assisted, and the database refuses to publish or schedule them until an editor confirms human review and fact-checking. Nothing is ever published automatically.</Notice>
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <Card title="Create a draft from your sources">
          {provider.isConfigured() ? <AiDraftForm categories={categories} /> : <p className="text-sm text-slate-600">Configure a provider to enable drafting. Until then, write articles directly in the editor.</p>}
        </Card>
        <Card title="Recommended workflow">
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            <li>Discover a topic and read trusted primary sources yourself.</li>
            <li>Paste verified facts and quotes as source notes.</li>
            <li>Generate a draft: title, excerpt, SEO fields, keywords and an image concept.</li>
            <li>Check every statement against the sources; resolve any “[VERIFY]” markers.</li>
            <li>Add an original or licensed image with alt text.</li>
            <li>Tick “reviewed” and “fact-checked”, then publish or schedule.</li>
          </ol>
        </Card>
      </div>
    </>
  );
}
