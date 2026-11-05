import Link from "next/link";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-slate-600">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, children, className, actions }: { title?: string; children: React.ReactNode; className?: string; actions?: React.ReactNode }) {
  return (
    <section className={cn("rounded-lg border border-slate-200 bg-white p-5 shadow-sm", className)}>
      {(title || actions) && (
        <div className="mb-3 flex items-center justify-between">
          {title && <h2 className="text-base font-bold text-slate-900">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  in_review: "bg-amber-100 text-amber-900",
  scheduled: "bg-blue-100 text-blue-900",
  published: "bg-green-100 text-green-900",
  archived: "bg-zinc-200 text-zinc-700",
};
export function StatusBadge({ status }: { status: string }) {
  return <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize", STATUS_STYLES[status] ?? "bg-slate-100")}>{status.replace("_", " ")}</span>;
}

export function LinkButton({ href, children, variant = "primary" }: { href: string; children: React.ReactNode; variant?: "primary" | "secondary" }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 rounded px-4 py-2 text-sm font-semibold", variant === "primary" ? "bg-slate-900 text-white hover:bg-black" : "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50")}>
      {children}
    </Link>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warn" | "success"; children: React.ReactNode }) {
  const t = { info: "border-blue-200 bg-blue-50 text-blue-950", warn: "border-amber-300 bg-amber-50 text-amber-950", success: "border-green-300 bg-green-50 text-green-950" }[tone];
  return <div role="note" className={cn("rounded border px-4 py-3 text-sm", t)}>{children}</div>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">{children}</p>;
}
