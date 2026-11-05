import Link from "next/link";

/** Server-rendered, crawlable pagination using ?page=N links. */
export function Pagination({ basePath, page, totalPages, query = {}, pageHref }: {
  basePath?: string; page: number; totalPages: number; query?: Record<string, string>;
  /** Path-style pagination (e.g. /category/x/page/2). Defaults to ?page=N on basePath. */
  pageHref?: (p: number) => string;
}) {
  if (totalPages <= 1) return null;
  const href = (p: number) => {
    if (pageHref) return pageHref(p);
    const params = new URLSearchParams(query);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath!;
  };
  const pages: (number | "…")[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) pages.push(p);
    else if (pages[pages.length - 1] !== "…") pages.push("…");
  }
  const base = "inline-flex h-10 min-w-10 items-center justify-center rounded border px-3 text-sm font-semibold";
  return (
    <nav aria-label="Pagination" className="mt-10 flex flex-wrap items-center justify-center gap-2">
      {page > 1 && <Link rel="prev" href={href(page - 1)} className={`${base} border-rule hover:bg-wash`}>← Previous</Link>}
      {pages.map((p, i) =>
        p === "…" ? <span key={`e${i}`} className="px-1 text-muted" aria-hidden="true">…</span> : (
          <Link key={p} href={href(p)} aria-current={p === page ? "page" : undefined}
            className={`${base} ${p === page ? "border-ink bg-ink text-white" : "border-rule hover:bg-wash"}`}>
            <span className="sr-only">Page </span>{p}
          </Link>
        ),
      )}
      {page < totalPages && <Link rel="next" href={href(page + 1)} className={`${base} border-rule hover:bg-wash`}>Next →</Link>}
    </nav>
  );
}
