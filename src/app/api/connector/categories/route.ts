import { NextResponse } from "next/server";
import { checkConnectorAuth } from "@/lib/connector/auth";
import { createServiceClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lets the writer discover valid category slugs and author slugs. */
export async function GET(req: Request) {
  const denied = checkConnectorAuth(req);
  if (denied) return denied;
  const db = createServiceClient();
  if (!db) return NextResponse.json({ error: "Server is not configured" }, { status: 503 });
  const [c, a] = await Promise.all([
    db.from("categories").select("name,slug,description").order("sort_order"),
    db.from("authors").select("name,slug").eq("is_active", true).order("name"),
  ]);
  return NextResponse.json({ categories: c.data ?? [], authors: a.data ?? [] });
}
