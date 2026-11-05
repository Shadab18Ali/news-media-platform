"use client";

export function CopyUrl({ value }: { value: string }) {
  return (
    <input readOnly aria-label="Image URL" value={value} onFocus={(e) => e.currentTarget.select()} className="mt-2 w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs" />
  );
}
