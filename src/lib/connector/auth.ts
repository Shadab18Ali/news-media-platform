import "server-only";
import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/security/request";

/**
 * Bearer-token check for the connector API (env CONNECTOR_API_KEY, 32+ chars recommended).
 * Leading/trailing whitespace on either side is ignored: a stray space or newline pasted along with a
 * key is the most common setup mistake and does not weaken the key itself.
 */
export function checkConnectorAuth(req: Request): NextResponse | null {
  const key = process.env.CONNECTOR_API_KEY?.trim();
  if (!key) return NextResponse.json({ error: "Connector is not enabled: CONNECTOR_API_KEY is not set." }, { status: 503 });
  const header = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "Bearer ").trim();
  if (!isAuthorizedCron(header, key)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}
