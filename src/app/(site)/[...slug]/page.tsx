import { notFound, permanentRedirect, redirect } from "next/navigation";
import { findRedirect } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

/**
 * Catch-all: any URL that matches no real route is checked against the `redirects` table
 * (managed in /admin/redirects, and auto-created when an article slug changes).
 * No match -> the standard 404 page.
 */
export default async function CatchAll({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const path = "/" + slug.map((s) => decodeURIComponent(s)).join("/");
  const hit = await findRedirect(path);
  if (hit) {
    if (hit.status_code === 301 || hit.status_code === 308) permanentRedirect(hit.to_path);
    redirect(hit.to_path);
  }
  notFound();
}
