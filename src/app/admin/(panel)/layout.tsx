import Link from "next/link";
import { requireStaff, hasRole } from "@/lib/admin/auth";
import { logoutAction } from "../_actions/auth";
import { getSettings } from "@/lib/data/settings";
import { AdminNav } from "@/components/admin/admin-nav";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireStaff("writer");
  const settings = await getSettings();
  const items = [
    { href: "/admin", label: "Dashboard", icon: "layout", min: "writer" },
    { href: "/admin/articles", label: "Articles", icon: "file", min: "writer" },
    { href: "/admin/calendar", label: "Editorial calendar", icon: "calendar", min: "writer" },
    { href: "/admin/categories", label: "Categories", icon: "folder", min: "editor" },
    { href: "/admin/authors", label: "Authors", icon: "users", min: "editor" },
    { href: "/admin/media", label: "Media", icon: "image", min: "writer" },
    { href: "/admin/ads", label: "Advertising", icon: "megaphone", min: "admin" },
    { href: "/admin/ai", label: "Drafting assistant", icon: "sparkles", min: "editor" },
    { href: "/admin/subscribers", label: "Subscribers & inbox", icon: "mail", min: "editor" },
    { href: "/admin/redirects", label: "Redirects", icon: "redirect", min: "editor" },
    { href: "/admin/logs", label: "Logs & publishing", icon: "log", min: "writer" },
    { href: "/admin/settings", label: "Site settings", icon: "settings", min: "admin" },
  ].filter((i) => hasRole(ctx.role, i.min as "writer"));

  return (
    <div className="lg:flex">
      <a href="#admin-main" className="skip-link">Skip to content</a>
      <aside className="border-b border-slate-200 bg-white lg:min-h-screen lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-4 py-3 lg:block">
          <Link href="/admin" className="text-lg font-bold text-slate-900">{settings.brand.name}<span className="block text-xs font-normal text-slate-500">Newsroom admin</span></Link>
        </div>
        <AdminNav items={items} />
        <div className="border-t border-slate-200 p-4 text-xs text-slate-600">
          <p className="truncate font-semibold text-slate-800">{ctx.fullName || ctx.user.email}</p>
          <p className="capitalize">{ctx.role}</p>
          <div className="mt-3 flex gap-3">
            <Link href="/" target="_blank" className="underline">View site</Link>
            <form action={logoutAction}><button type="submit" className="underline">Sign out</button></form>
          </div>
        </div>
      </aside>
      <main id="admin-main" className="min-w-0 flex-1 p-4 sm:p-8">{children}</main>
    </div>
  );
}
