import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function Breadcrumbs({ items }: { items: { name: string; path?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="meta">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
            {it.path && i < items.length - 1 ? (
              <Link href={it.path} className="hover:text-brand hover:underline">{it.name}</Link>
            ) : (
              <span aria-current="page" className="max-w-[16rem] truncate text-ink sm:max-w-md">{it.name}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
