import type { TocItem } from "@/lib/content";

export function TableOfContents({ items }: { items: TocItem[] }) {
  if (items.length < 3) return null;
  return (
    <nav aria-labelledby="toc-h" className="rounded border border-rule bg-wash p-4 text-sm">
      <h2 id="toc-h" className="kicker !text-ink">In this article</h2>
      <ol className="mt-2 space-y-1.5">
        {items.map((it) => (
          <li key={it.id} className={it.level === 3 ? "ml-4" : ""}>
            <a href={`#${it.id}`} className="text-body underline-offset-2 hover:text-brand hover:underline">{it.text}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
