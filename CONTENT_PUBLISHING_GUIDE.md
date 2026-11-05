# Content publishing guide

## Daily workflow
1. **Plan** in the Editorial calendar; leave notes on drafts ("angle, sources, deadline").
2. **Write** (or generate a draft — below). Add sources, an original/licensed image with alt text, category, tags.
3. **Review**: writers *Submit for review*; an editor checks facts, headline, SEO checklist and the *Preview*.
4. **Publish now** or **Schedule** (IST). The scheduler publishes due articles, logs each one, and never publishes twice.
5. **After publishing**: correct errors openly (`/corrections-policy`); update the article — its "Updated" date shows automatically.

## Editorial rules the platform enforces or supports
* Every article has a named author, publication date and update date.
* Sponsored articles need a sponsor name and are labelled; affiliate articles show a disclosure.
* Cite sources (Editorial section → Sources); they are displayed and included as `citation` in structured data.
* Use only images you own, have licensed, or generated yourself. Never copy other publishers' images or text.
* Do not fabricate news, quotations or statistics.

## Drafting assistant (optional, off by default)
The site needs **no paid AI service**. If you want drafting help, set `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL` (+ `AI_BASE_URL` for OpenAI-compatible APIs) — see `ENVIRONMENT_VARIABLES.md` — then open **Drafting assistant**.

How it is deliberately constrained:
* **You** do topic discovery and research and paste *verified* facts with source URLs; the assistant drafts an **original** article using *only* those notes, marks gaps as `[VERIFY: …]`, and suggests SEO title, meta description, keywords and an *original image concept*.
* The result is saved as a **draft** flagged "machine-assisted", with sources attached and editorial notes.
* The database **refuses** to publish or schedule it until an editor ticks both *human reviewed* and *facts verified*. Published pieces carry a disclosure line.
* Nothing is ever published automatically.

Changing provider: implement the `AiProvider` interface in `src/lib/ai/types.ts` and register it in `src/lib/ai/provider.ts` (two OpenAI-compatible/Anthropic adapters are included).
Future automation (topic discovery, source retrieval, fact-check tools, image generation) plugs in before the draft step; the human-approval gate stays.
