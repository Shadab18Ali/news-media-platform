import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit, resetRateLimits } from "@/lib/security/rate-limit";
import { detectImageType, buildStoragePath } from "@/lib/media";

// request.ts imports next/headers; test the pure function by importing lazily with a stub-free path.
import { isAuthorizedCron, safeEqual } from "@/lib/security/request";

describe("rateLimit", () => {
  beforeEach(resetRateLimits);
  it("allows up to the limit then blocks, then recovers", () => {
    const t = 1_000_000;
    for (let i = 0; i < 3; i++) expect(rateLimit("k", 3, 1000, t).ok).toBe(true);
    const blocked = rateLimit("k", 3, 1000, t + 10);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
    expect(rateLimit("k", 3, 1000, t + 1500).ok).toBe(true);
  });
  it("isolates keys", () => {
    rateLimit("a", 1, 1000, 1); 
    expect(rateLimit("a", 1, 1000, 2).ok).toBe(false);
    expect(rateLimit("b", 1, 1000, 2).ok).toBe(true);
  });
});

describe("cron auth", () => {
  const secret = "0123456789abcdef0123";
  it("accepts only the exact bearer secret", () => {
    expect(isAuthorizedCron(`Bearer ${secret}`, secret)).toBe(true);
    expect(isAuthorizedCron(`Bearer ${secret}x`, secret)).toBe(false);
    expect(isAuthorizedCron(secret, secret)).toBe(false);
    expect(isAuthorizedCron(null, secret)).toBe(false);
  });
  it("refuses when no/short secret is configured", () => {
    expect(isAuthorizedCron("Bearer ", "")).toBe(false);
    expect(isAuthorizedCron("Bearer short", "short")).toBe(false);
    expect(isAuthorizedCron("Bearer x", undefined)).toBe(false);
  });
  it("safeEqual", () => {
    expect(safeEqual("a", "a")).toBe(true);
    expect(safeEqual("a", "ab")).toBe(false);
  });
});

describe("image validation", () => {
  const pad = (...b: number[]) => new Uint8Array([...b, ...new Array(20).fill(0)]);
  it("detects by magic bytes", () => {
    expect(detectImageType(pad(0xff, 0xd8, 0xff))).toBe("jpeg");
    expect(detectImageType(pad(0x89, 0x50, 0x4e, 0x47))).toBe("png");
    expect(detectImageType(pad(0x47, 0x49, 0x46, 0x38))).toBe("gif");
    expect(detectImageType(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 "))).toBe("webp");
    expect(detectImageType(new TextEncoder().encode("\0\0\0\x1cftypavif\0\0\0\0"))).toBe("avif");
  });
  it("rejects scripts/SVG/text", () => {
    expect(detectImageType(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'></svg>"))).toBeNull();
    expect(detectImageType(new TextEncoder().encode("<?php echo 1; ?> pretend image"))).toBeNull();
    expect(detectImageType(new Uint8Array(3))).toBeNull();
  });
  it("builds descriptive storage paths", () => {
    const { path, filename } = buildStoragePath("Blue Chip Photo.JPG", "webp", new Date("2026-03-05T00:00:00Z"));
    expect(path).toMatch(/^2026\/03\/blue-chip-photo-[0-9a-f]{6}\.webp$/);
    expect(filename).toMatch(/^blue-chip-photo-/);
  });
});
