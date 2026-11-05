import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/lib/data/settings";
import { getAuthors } from "@/lib/data/queries";
import { buildMetadata } from "@/lib/seo/metadata";
import { SmartImage } from "@/components/ui/smart-image";

export const revalidate = 300; // must be a literal; mirrors SITE_CONFIG.revalidateSeconds

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return buildMetadata({ settings, title: "Our Authors", path: "/authors", description: `Meet the reporters and editors behind ${settings.brand.name}.` });
}

export default async function AuthorsPage() {
  const authors = await getAuthors();
  return (
    <div>
      <h1 className="headline mb-2 text-4xl">Our authors</h1>
      <p className="mb-8 max-w-2xl text-lg text-muted">The reporters, writers and editors who produce our journalism.</p>
      {authors.length === 0 ? <p className="text-muted">No author profiles have been published yet.</p> : (
        <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {authors.map((a) => (
            <li key={a.id}>
              <Link href={`/author/${a.slug}`} className="card-link flex gap-4">
                <div className="w-20 shrink-0"><SmartImage src={a.avatar_url} alt="" aspect="aspect-square" sizes="80px" fallbackLabel={a.name} className="rounded-full" /></div>
                <div>
                  <h2 className="headline text-xl">{a.name}</h2>
                  {a.job_title && <p className="meta">{a.job_title}</p>}
                  {a.bio && <p className="mt-1 line-clamp-3 text-sm">{a.bio}</p>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
