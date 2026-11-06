import "server-only";
import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/security/request";

/** Bearer-token check for the connector API (env CONNECTOR_API_KEY, 32+ chars recommended). */
export function checkConnectorAuth(req: Request): NextResponse | null {
  const key = process.env.CONNECTOR_API_KEY;
  if (!key) return NextResponse.json({ error: "Connector is not enabled: CONNECTOR_API_KEY is not set." }, { status: 503 });
  if (!isAuthorizedCron(req.headers.get("authorization"), key)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}
