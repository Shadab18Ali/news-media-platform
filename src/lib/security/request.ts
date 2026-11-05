import { headers } from "next/headers";
import { timingSafeEqual } from "node:crypto";

export async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  return (fwd?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim();
}

/** Constant-time comparison for secrets. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** Validates `Authorization: Bearer <CRON_SECRET>` (the scheme Vercel Cron uses). */
export function isAuthorizedCron(authHeader: string | null, secret = process.env.CRON_SECRET): boolean {
  if (!secret || secret.length < 16) return false;
  if (!authHeader?.startsWith("Bearer ")) return false;
  return safeEqual(authHeader.slice(7), secret);
}
