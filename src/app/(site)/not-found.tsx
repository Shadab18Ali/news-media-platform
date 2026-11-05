import Link from "next/link";
import { SearchForm } from "@/components/site/search-form";

export const metadata = { title: "Page not found", robots: { index: false, follow: false } };

export default function NotFound() {
  return (
    <section className="mx-auto max-w-xl py-20 text-center">
      <p className="kicker">Error 404</p>
      <h1 className="headline mt-2 text-4xl">We can’t find that page</h1>
      <p className="mt-3 text-lg text-muted">The story may have moved or no longer exists. Try searching, or head back to the front page.</p>
      <SearchForm className="mx-auto mt-6 max-w-sm" id="q-404" />
      <Link href="/" className="mt-6 inline-block rounded bg-ink px-5 py-2.5 font-semibold text-white hover:bg-black">Back to the homepage</Link>
    </section>
  );
}
