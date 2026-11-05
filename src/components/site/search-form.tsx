import { Search } from "lucide-react";

export function SearchForm({ className, id = "q" }: { className?: string; id?: string }) {
  return (
    <form action="/search" method="get" role="search" className={className}>
      <label htmlFor={id} className="sr-only">Search articles</label>
      <div className="flex">
        <input id={id} name="q" type="search" minLength={2} maxLength={100} placeholder="Search news…" autoComplete="off"
          className="min-w-0 flex-1 rounded-l border border-rule bg-white px-3 py-2 text-sm text-ink" />
        <button type="submit" className="rounded-r bg-ink px-3 text-white hover:bg-black" aria-label="Search">
          <Search className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}
