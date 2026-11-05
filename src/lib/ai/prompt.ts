import { z } from "zod";
import type { DraftRequest, DraftResult } from "./types";

export const SYSTEM_PROMPT = `You are a careful news writer's assistant for a professional publication.
Rules you must follow without exception:
- Write an ORIGINAL article in your own words. Never copy sentences from the sources.
- Use ONLY facts contained in the supplied source notes. Do not add facts, statistics, dates, names or quotations from memory.
- Never fabricate quotations. Only quote text that appears verbatim in the notes, and attribute it.
- If the notes are insufficient for a claim, leave it out or write "[VERIFY: …]" for the editor to resolve.
- Attribute information to its source in the text ("according to …").
- Use neutral, precise, non-sensational language. Headline under 70 characters.
- Output HTML using only <h2>, <h3>, <p>, <ul>, <ol>, <li>, <blockquote>, <strong>, <em>, <a>. No <h1>.
Return ONLY a JSON object with keys: title, excerpt (max 280 chars), contentHtml, seoTitle (max 60), metaDescription (max 155), focusKeyword, keywords (array, max 8), imagePrompt (describe an ORIGINAL illustration or photo concept; do not reference real people or copyrighted works), sourcesUsed (array of {title,url} chosen from the supplied sources).`;

export function buildUserPrompt(req: DraftRequest): string {
  const sources = req.sources.map((s, i) => `[${i + 1}] ${s.title} (${s.url})\n${s.notes}`).join("\n\n");
  return `Topic: ${req.topic}
${req.angle ? `Angle: ${req.angle}\n` : ""}${req.categoryName ? `Section: ${req.categoryName}\n` : ""}Language: ${req.language}

SOURCE NOTES (the only permitted facts):
${sources}`;
}

const resultSchema = z.object({
  title: z.string().min(3).max(300),
  excerpt: z.string().max(600).default(""),
  contentHtml: z.string().min(20),
  seoTitle: z.string().max(120).default(""),
  metaDescription: z.string().max(320).default(""),
  focusKeyword: z.string().max(100).default(""),
  keywords: z.array(z.string()).max(20).default([]),
  imagePrompt: z.string().max(1000).default(""),
  sourcesUsed: z.array(z.object({ title: z.string(), url: z.string().url() })).default([]),
});

/** Extracts and validates the JSON object from a model reply (tolerates code fences / prose). */
export function parseDraftJson(raw: string): DraftResult {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("The provider did not return JSON.");
  const parsed = resultSchema.safeParse(JSON.parse(raw.slice(start, end + 1)));
  if (!parsed.success) throw new Error("The provider returned an unexpected format.");
  return parsed.data;
}
