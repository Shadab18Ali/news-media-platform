import "server-only";
import type { AiProvider, DraftRequest, DraftResult } from "./types";
import { buildUserPrompt, parseDraftJson, SYSTEM_PROMPT } from "./prompt";

/** Used when no provider is configured: the site works fully without any paid API. */
const none: AiProvider = {
  id: "none",
  label: "Not configured",
  isConfigured: () => false,
  async generateDraft(): Promise<DraftResult> {
    throw new Error("No drafting provider is configured. Set AI_PROVIDER and AI_API_KEY (see ENVIRONMENT_VARIABLES.md).");
  },
};

async function postJson(url: string, headers: Record<string, string>, body: unknown): Promise<unknown> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(90_000) });
  if (!res.ok) throw new Error(`Provider request failed (${res.status}).`);
  return res.json();
}

export function openAiCompatible(env = process.env): AiProvider {
  return {
    id: "openai-compatible",
    label: "OpenAI-compatible API",
    isConfigured: () => Boolean(env.AI_API_KEY && env.AI_MODEL && env.AI_BASE_URL),
    async generateDraft(req: DraftRequest) {
      const data = (await postJson(`${env.AI_BASE_URL!.replace(/\/+$/, "")}/chat/completions`, { authorization: `Bearer ${env.AI_API_KEY}` }, {
        model: env.AI_MODEL, temperature: 0.3,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: buildUserPrompt(req) }],
      })) as { choices?: { message?: { content?: string } }[] };
      return parseDraftJson(data.choices?.[0]?.message?.content ?? "");
    },
  };
}

export function anthropicProvider(env = process.env): AiProvider {
  return {
    id: "anthropic",
    label: "Anthropic API",
    isConfigured: () => Boolean(env.AI_API_KEY && env.AI_MODEL),
    async generateDraft(req: DraftRequest) {
      const data = (await postJson("https://api.anthropic.com/v1/messages", { "x-api-key": env.AI_API_KEY!, "anthropic-version": "2023-06-01" }, {
        model: env.AI_MODEL, max_tokens: 4096, temperature: 0.3, system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildUserPrompt(req) }],
      })) as { content?: { type: string; text?: string }[] };
      return parseDraftJson(data.content?.find((c) => c.type === "text")?.text ?? "");
    },
  };
}

/** Resolve the provider from env. Add a new provider by implementing AiProvider and registering it here. */
export function aiProvider(env = process.env): AiProvider {
  switch ((env.AI_PROVIDER ?? "none").toLowerCase()) {
    case "openai-compatible": return openAiCompatible(env);
    case "anthropic": return anthropicProvider(env);
    default: return none;
  }
}
