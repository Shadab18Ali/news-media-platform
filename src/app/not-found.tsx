import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import NotFoundContent from "@/app/(site)/not-found";

// Global 404 (for URLs outside the (site) group) still gets the site chrome.
export const metadata = { title: "Page not found", robots: { index: false, follow: false } };

export default function GlobalNotFound() {
  return (
    <>
      <Header />
      <main id="main" className="mx-auto max-w-7xl px-4 pt-6"><NotFoundContent /></main>
      <Footer />
    </>
  );
}
