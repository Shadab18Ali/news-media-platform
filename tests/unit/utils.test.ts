import { describe, it, expect } from "vitest";
import { slugify, readingTime, countWords, stripHtml, truncate, zonedLocalToUtcIso, utcIsoToZonedLocal, escapeLike, pageFromParam, isSafeHttpUrl, timeAgo } from "@/lib/utils";

describe("slugify", () => {
  it("builds clean ASCII slugs", () => {
    expect(slugify("India's Chip Makers: Race to Build!")).toBe("indias-chip-makers-race-to-build");
    expect(slugify("Café & Crème")).toBe("cafe-and-creme");
    expect(slugify("  --Hello   World--  ")).toBe("hello-world");
    expect(slugify("!!!")).toBe("");
  });
  it("truncates on word boundaries", () => {
    const s = slugify("alpha beta gamma delta epsilon", 14);
    expect(s.length).toBeLessThanOrEqual(14);
    expect(s).toBe("alpha-beta");
  });
});

describe("content helpers", () => {
  it("counts words and reading time", () => {
    const html = `<p>${"word ".repeat(440)}</p>`;
    expect(countWords(html)).toBe(440);
    expect(readingTime(html)).toBe(2);
    expect(readingTime("")).toBe(1);
  });
  it("strips tags and entities", () => {
    expect(stripHtml("<p>Tom &amp; <b>Jerry</b></p><script>x()</script>")).toBe("Tom & Jerry");
  });
  it("truncates with ellipsis", () => {
    expect(truncate("one two three four", 10)).toBe("one two…");
    expect(truncate("short", 10)).toBe("short");
  });
});

describe("timezones (Asia/Kolkata)", () => {
  it("converts IST local input to UTC", () => {
    expect(zonedLocalToUtcIso("2030-01-15T09:30", "Asia/Kolkata")).toBe("2030-01-15T04:00:00.000Z");
  });
  it("round-trips", () => {
    const iso = zonedLocalToUtcIso("2026-12-31T23:45", "Asia/Kolkata")!;
    expect(utcIsoToZonedLocal(iso, "Asia/Kolkata")).toBe("2026-12-31T23:45");
  });
  it("handles DST zones", () => {
    expect(zonedLocalToUtcIso("2026-07-01T12:00", "America/New_York")).toBe("2026-07-01T16:00:00.000Z");
    expect(zonedLocalToUtcIso("2026-01-01T12:00", "America/New_York")).toBe("2026-01-01T17:00:00.000Z");
  });
  it("rejects garbage", () => {
    expect(zonedLocalToUtcIso("tomorrow")).toBeNull();
    expect(utcIsoToZonedLocal(null)).toBe("");
  });
});

describe("misc", () => {
  it("escapes filter metacharacters", () => {
    expect(escapeLike("a%b_c,(d)")).toBe("a b c d");
  });
  it("parses page params safely", () => {
    expect(pageFromParam("3")).toBe(3);
    expect(pageFromParam("-1")).toBe(1);
    expect(pageFromParam("abc")).toBe(1);
    expect(pageFromParam(undefined)).toBe(1);
    expect(pageFromParam("99999999")).toBe(1);
  });
  it("validates http urls", () => {
    expect(isSafeHttpUrl("https://a.com")).toBe(true);
    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeHttpUrl(null)).toBe(false);
  });
  it("timeAgo", () => {
    const now = Date.parse("2026-01-01T12:00:00Z");
    expect(timeAgo("2026-01-01T11:30:00Z", now)).toBe("30 min ago");
    expect(timeAgo("2026-01-01T09:00:00Z", now)).toBe("3 hr ago");
  });
});
