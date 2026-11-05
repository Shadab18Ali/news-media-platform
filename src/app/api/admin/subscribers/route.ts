import { NextResponse } from "next/server";
import { getStaff, hasRole } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

const csvCell = (v: string) => {
  // Neutralise spreadsheet formula injection (=, +, -, @) in exported cells.
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return `"${safe.replace(/"/g, '""')}"`;
};

export async function GET() {
  const ctx = await getStaff();
  if (!ctx || !hasRole(ctx.role, "editor")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await ctx.supabase.from("newsletter_subscribers").select("email,status,source,created_at").order("created_at", { ascending: false }).limit(50000);
  if (error) return NextResponse.json({ error: "Could not export" }, { status: 500 });
  const rows = ["email,status,source,subscribed_at", ...(data ?? []).map((r) => [r.email, r.status, r.source ?? "", r.created_at].map((c) => csvCell(String(c))).join(","))];
  return new NextResponse(rows.join("\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="subscribers.csv"', "Cache-Control": "no-store" } });
}
