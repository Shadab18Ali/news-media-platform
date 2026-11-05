import Link from "next/link";
import { getSettings } from "@/lib/data/settings";
import { getCategories } from "@/lib/data/queries";
import { formatDate } from "@/lib/utils";
import { SearchForm } from "./search-form";
import { MobileNav } from "./mobile-nav";
import { AdSlot } from "./ad-slot";

export function Logo({ name, logoUrl }: { name: string; logoUrl?: string }) {
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUrl} alt={name} className="h-9 w-auto sm:h-11" height={44} />;
  }
  return <span className="headline text-2xl uppercase tracking-tight text-ink sm:text-3xl">{name}</span>;
}

export async function Header() {
  const [settings, categories] = await Promise.all([getSettings(), getCategories()]);
  const nav = categories.filter((c) => c.show_in_nav).map((c) => ({ name: c.name, href: `/category/${c.slug}` }));
  const social = [
    ["X / Twitter", settings.brand.twitter], ["Facebook", settings.brand.facebook],
    ["Instagram", settings.brand.instagram], ["YouTube", settings.brand.youtube],
  ].filter(([, url]) => url) as [string, string][];

  return (
    <header className="border-b border-rule bg-white">
      <a href="#main" className="skip-link">Skip to main content</a>
      <div className="hidden border-b border-rule bg-wash text-xs text-muted sm:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5">
          <span suppressHydrationWarning>{formatDate(new Date().toISOString(), { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
          <nav aria-label="Secondary" className="flex items-center gap-4">
            <Link href="/about" className="hover:text-brand">About</Link>
            <Link href="/contact" className="hover:text-brand">Contact</Link>
            <Link href="/advertise" className="hover:text-brand">Advertise</Link>
            {social.map(([label, url]) => (
              <a key={label} href={url} rel="me noopener noreferrer" target="_blank" className="hover:text-brand">{label}</a>
            ))}
          </nav>
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" aria-label={`${settings.brand.name} home`} className="min-w-0">
          <Logo name={settings.brand.name} logoUrl={settings.brand.logoUrl} />
          {settings.brand.tagline && <p className="meta mt-0.5 hidden truncate sm:block">{settings.brand.tagline}</p>}
        </Link>
        <div className="flex items-center gap-2">
          <SearchForm className="hidden w-64 md:block" id="q-header" />
          <MobileNav items={[...nav, { name: "Search", href: "/search" }, { name: "About", href: "/about" }, { name: "Contact", href: "/contact" }]} />
        </div>
      </div>
      <nav aria-label="Primary" className="hidden border-t border-rule lg:block">
        <ul className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4">
          <li><Link href="/" className="block px-3 py-3 text-sm font-bold uppercase tracking-wide text-ink hover:text-brand">Home</Link></li>
          {nav.map((it) => (
            <li key={it.href}><Link href={it.href} className="block whitespace-nowrap px-3 py-3 text-sm font-bold uppercase tracking-wide text-ink hover:text-brand">{it.name}</Link></li>
          ))}
        </ul>
      </nav>
      <div className="mx-auto max-w-7xl px-4"><AdSlot placement="header" className="!my-3" /></div>
    </header>
  );
}
