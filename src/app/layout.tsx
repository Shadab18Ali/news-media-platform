import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getSettings } from "@/lib/data/settings";
import { siteUrl } from "@/lib/utils";
import { SITE_CONFIG } from "@/config/site";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    metadataBase: new URL(siteUrl()),
    applicationName: s.brand.name,
    title: { default: s.brand.tagline ? `${s.brand.name}: ${s.brand.tagline}` : s.brand.name, template: s.seo.titleTemplate },
    description: s.seo.defaultDescription ?? s.brand.description,
    verification: {
      google: s.seo.googleSiteVerification,
      other: s.seo.bingSiteVerification ? { "msvalidate.01": s.seo.bingSiteVerification } : undefined,
    },
    icons: s.brand.faviconUrl ? { icon: s.brand.faviconUrl } : undefined,
    alternates: { types: { "application/rss+xml": "/feed.xml" } },
    formatDetection: { telephone: false },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const s = await getSettings();
  return { width: "device-width", initialScale: 1, themeColor: s.brand.primaryColor };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();

  return (
    <html lang={SITE_CONFIG.defaultLocale} style={{ "--brand": s.brand.primaryColor, "--accent": s.brand.accentColor } as React.CSSProperties}>
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
