"use client";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import type { ActionState } from "@/lib/admin/types";
import { cn } from "@/lib/utils";

export const inputCls = "mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:bg-slate-100";

export function Field({ label, htmlFor, hint, error, children, className }: {
  label: string; htmlFor: string; hint?: string; error?: string | string[]; children: React.ReactNode; className?: string;
}) {
  const msg = Array.isArray(error) ? error[0] : error;
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="text-sm font-semibold text-slate-800">{label}</label>
      {children}
      {hint && !msg && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {msg && <p role="alert" className="mt-1 text-xs font-semibold text-red-700">{msg}</p>}
    </div>
  );
}

export function SubmitButton({ children, variant = "primary", name, value, className, confirm }: {
  children: React.ReactNode; variant?: "primary" | "secondary" | "danger" | "ghost"; name?: string; value?: string; className?: string; confirm?: string;
}) {
  const { pending } = useFormStatus();
  const styles = {
    primary: "bg-slate-900 text-white hover:bg-black",
    secondary: "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
    ghost: "text-slate-700 hover:bg-slate-100",
  }[variant];
  return (
    <button
      type="submit" name={name} value={value} disabled={pending}
      onClick={(e) => { if (confirm && !window.confirm(confirm)) e.preventDefault(); }}
      className={cn("inline-flex items-center justify-center gap-2 rounded px-4 py-2 text-sm font-semibold disabled:opacity-60", styles, className)}
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return (
    <p role={state.ok ? "status" : "alert"} className={cn("rounded border px-3 py-2 text-sm font-semibold", state.ok ? "border-green-300 bg-green-50 text-green-900" : "border-red-300 bg-red-50 text-red-900")}>
      {state.message}
    </p>
  );
}

/** Submit button driven by an explicit `pending` flag (for forms using useKeepAction). */
export function PendingButton({ pending, children, variant = "primary", className, name, value }: {
  pending: boolean; children: React.ReactNode; variant?: "primary" | "secondary" | "danger"; className?: string; name?: string; value?: string;
}) {
  const styles = {
    primary: "bg-slate-900 text-white hover:bg-black",
    secondary: "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
  }[variant];
  return (
    <button type="submit" name={name} value={value} disabled={pending} className={cn("inline-flex items-center justify-center gap-2 rounded px-4 py-2 text-sm font-semibold disabled:opacity-60", styles, className)}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}{children}
    </button>
  );
}
