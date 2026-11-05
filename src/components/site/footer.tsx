import Link from "next/link";
import { getSettings } from "@/lib/data/settings";
import { getCategories } from "@/lib/data/queries";
import { NewsletterForm } from "./newsletter-form";
import { CookieSettingsButton } from "./consent-banner";
import { AdSlot } from "./ad-slot";
import { Logo } from "./header";

export async function Footer() {
  const [settings, categories] = await Promise.all([getSettings(), getCategories()]);
  const year = new Date().getFullYear();
  const company = [
    ["About Us", "/about"], ["Authors", "/authors"], ["Contact Us", "/contact"], ["Advertise With Us", "/advertise"],
  ];
  const legal = [
    ["Editorial Policy", "/editorial-policy"], ["Corrections Policy", "/corrections-policy"], ["Privacy Policy", "/privacy-policy"],
    ["Terms & Conditions", "/terms-and-conditions"], ["Disclaimer", "/disclaimer"],
  ];
  return (
    <footer className="mt-16 bg-accent text-white/90">
      <div className="mx-auto max-w-7xl px-4 pt-6"><AdSlot placement="footer" className="[&_p]:text-white/60" /></div>
      {settings.features.newsletter && (
        <div className="mx-auto max-w-7xl px-4 pt-10">
          <NewsletterForm headline={settings.features.newsletterHeadline} blurb={settings.features.newsletterBlurb} source="footer" dark />
        </div>
      )}
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-4">
        <div className="md:col-span-1">
          <div className="text-white [&_span]:!text-white"><Logo name={settings.brand.name} logoUrl={settings.brand.logoUrl} /></div>
          <p className="mt-3 text-sm text-white/70">{settings.brand.description}</p>
        </div>
        <nav aria-label="Sections">
          <h2 className="kicker !text-white/60">Sections</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {categories.map((c) => <li key={c.id}><Link className="hover:underline" href={`/category/${c.slug}`}>{c.name}</Link></li>)}
          </ul>
        </nav>
        <nav aria-label="Company">
          <h2 className="kicker !text-white/60">Company</h2>
          <ul className="mt-3 space-y-2 text-sm">{company.map(([n, h]) => <li key={h}><Link className="hover:underline" href={h}>{n}</Link></li>)}</ul>
        </nav>
        <nav aria-label="Legal">
          <h2 className="kicker !text-white/60">Policies</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {legal.map(([n, h]) => <li key={h}><Link className="hover:underline" href={h}>{n}</Link></li>)}
            <li><Link className="hover:underline" href="/feed.xml">RSS feed</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/15">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-white/70 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} {settings.publisher.legalName || settings.brand.name}. All rights reserved.</p>
          <CookieSettingsButton className="text-left underline hover:text-white" />
        </div>
      </div>
    </footer>
  );
}
