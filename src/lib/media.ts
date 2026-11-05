import { randomBytes } from "node:crypto";
import { slugify } from "@/lib/utils";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export type DetectedType = "jpeg" | "png" | "webp" | "gif" | "avif";

/** Identify an image by its magic bytes. The client-supplied MIME type / extension is never trusted. */
export function detectImageType(buf: Uint8Array): DetectedType | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return "gif";
  const ascii = (s: number, e: number) => String.fromCharCode(...buf.slice(s, e));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  if (ascii(4, 8) === "ftyp" && /^(avif|avis)$/.test(ascii(8, 12))) return "avif";
  return null;
}

/** Descriptive, SEO-friendly filename: "<alt-or-name>-<6 hex>.webp" under a year/month folder. */
export function buildStoragePath(descriptor: string, ext = "webp", now = new Date()): { path: string; filename: string } {
  const base = slugify(descriptor.replace(/\.[a-z0-9]{2,5}$/i, ""), 70) || "image";
  const filename = `${base}-${randomBytes(3).toString("hex")}.${ext}`;
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return { path: `${y}/${m}/${filename}`, filename };
}
