"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

export function MobileNav({ items }: { items: { name: string; href: string }[] }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button type="button" onClick={() => setOpen(true)} aria-expanded={open} aria-controls="mobile-menu" className="rounded p-2 hover:bg-wash">
        <Menu className="h-6 w-6" aria-hidden="true" /><span className="sr-only">Open menu</span>
      </button>
      {open && (
        <div id="mobile-menu" role="dialog" aria-modal="true" aria-label="Site menu" className="fixed inset-0 z-50 overflow-y-auto bg-white">
          <div className="flex items-center justify-between border-b border-rule px-4 py-3">
            <span className="headline text-lg">Menu</span>
            <button type="button" onClick={() => setOpen(false)} className="rounded p-2 hover:bg-wash" autoFocus>
              <X className="h-6 w-6" aria-hidden="true" /><span className="sr-only">Close menu</span>
            </button>
          </div>
          <ul className="divide-y divide-rule px-4">
            {items.map((it) => (
              <li key={it.href}>
                <Link href={it.href} onClick={() => setOpen(false)} className="block py-3.5 text-lg font-semibold text-ink">{it.name}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
