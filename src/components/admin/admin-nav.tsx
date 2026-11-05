"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, FileText, Folder, Image as ImageIcon, LayoutDashboard, Mail, Megaphone, ScrollText, Settings, Shuffle, Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = { layout: LayoutDashboard, file: FileText, calendar: Calendar, folder: Folder, users: Users, image: ImageIcon, megaphone: Megaphone, sparkles: Sparkles, mail: Mail, redirect: Shuffle, log: ScrollText, settings: Settings } as const;

export function AdminNav({ items }: { items: { href: string; label: string; icon: string }[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Admin" className="flex gap-1 overflow-x-auto px-2 pb-2 lg:block lg:space-y-0.5 lg:overflow-visible lg:px-3 lg:pb-4">
      {items.map((it) => {
        const Icon = ICONS[it.icon as keyof typeof ICONS] ?? FileText;
        const active = it.href === "/admin" ? path === "/admin" : path.startsWith(it.href);
        return (
          <Link key={it.href} href={it.href} aria-current={active ? "page" : undefined}
            className={cn("flex shrink-0 items-center gap-2 whitespace-nowrap rounded px-3 py-2 text-sm font-medium", active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100")}>
            <Icon className="h-4 w-4" aria-hidden="true" />{it.label}
          </Link>
        );
      })}
    </nav>
  );
}
