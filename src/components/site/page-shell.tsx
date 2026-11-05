import type { Metadata } from "next";
import { getSettings } from "@/lib/data/settings";
import { buildMetadata } from "@/lib/seo/metadata";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { JsonLd } from "./json-ld";
import { breadcrumbSchema } from "@/lib/seo/schema";

export async function staticPageMetadata(title: string, path: string, description: string): Promise<Metadata> {
  const settings = await getSettings();
  return buildMetadata({ settings, title, path, description });
}

export function PageShell({ title, path, intro, children }: { title: string; path: string; intro?: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl">
      <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: title, path }])} />
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: title }]} />
      <h1 className="headline mt-3 text-4xl sm:text-5xl">{title}</h1>
      {intro && <p className="mt-3 text-xl text-muted">{intro}</p>}
      <div className="prose-article mt-8 !text-[1.05rem]">{children}</div>
    </div>
  );
}

export function mailLink(email?: string) {
  return email ? <a href={`mailto:${email}`}>{email}</a> : <em>(contact email not configured yet)</em>;
}
