import type { SourceRef } from "@/types/db";

/**
 * Provider-agnostic contract for drafting assistance.
 *
 * Workflow position: steps 1–3 (topic discovery, research, fact verification) are performed by a
 * human editor, who supplies source material. The provider then drafts an ORIGINAL article from that
 * material only. The result is always saved as a DRAFT flagged `ai_generated`, which the database
 * refuses to publish until a human has reviewed and fact-checked it.
 */
export interface DraftRequest {
  topic: string;
  angle?: string;
  /** Editor-supplied, trusted source notes. The model must not use facts outside these. */
  sources: { title: string; url: string; notes: string }[];
  categoryName?: string;
  language: string;
}

export interface DraftResult {
  title: string;
  excerpt: string;
  contentHtml: string;
  seoTitle: string;
  metaDescription: string;
  focusKeyword: string;
  keywords: string[];
  imagePrompt: string;
  /** Source references actually relied upon (subset of those supplied). */
  sourcesUsed: SourceRef[];
}

export interface AiProvider {
  readonly id: string;
  readonly label: string;
  isConfigured(): boolean;
  generateDraft(req: DraftRequest): Promise<DraftResult>;
}
