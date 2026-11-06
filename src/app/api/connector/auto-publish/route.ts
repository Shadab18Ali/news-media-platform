import { NextResponse } from "next/server";
import { checkConnectorAuth } from "@/lib/connector/auth";
import { createServiceClient } from "@/lib/supabase/admin";
import { runAutoPublish } from "@/lib/connector/auto-publish";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Runs the auto-publish check on demand (the scheduler also runs it every few minutes). See lib/connector/auto-publish.ts. */
export async function POST(req: Request) {
  const denied = checkConnectorAuth(req);
  if (denied) return denied;
  const db = createServiceClient();
  if (!db) return NextResponse.json({ error: "Server is not configured" }, { status: 503 });
  return NextResponse.json(await runAutoPublish(db));
}
