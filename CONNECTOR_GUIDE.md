# Connector guide: let your own ChatGPT send articles to the admin

The connector is a small authenticated API. An external writer (for example a **Custom GPT** with Actions) sends a finished article and it appears in **Admin → Articles as a draft**, with its source links. It **cannot publish**: submissions are saved as machine-written, unverified drafts, and the database refuses to publish them until an editor ticks *reviewed* and *fact-checked*. You publish with one click after a quick check.

## Endpoints (all need `Authorization: Bearer <CONNECTOR_API_KEY>`)
| Method & path | Purpose |
|---|---|
| `GET /api/connector/categories` | Valid category slugs and author slugs |
| `GET /api/connector/articles` | Headlines from the last 3 days (avoid repeating stories) |
| `POST /api/connector/articles` | Create a draft (title, excerpt, `content_html`, `category_slug`, `sources[]` ≥ 1 https link, optional tags/SEO/author/image idea) |
| `GET /api/connector/openapi.json` | Machine-readable description to import into a Custom GPT |

Safeguards: key required (503 if not configured), rate limit 60/hour, body sanitised (scripts removed), at least one https source required, duplicate titles rejected for 24 h, status can't be set by the caller.

## Setup
1. **Make a key**: 40+ random letters and numbers (your password manager's generator).
2. **Vercel** → your project → Settings → Environment Variables → add `CONNECTOR_API_KEY` (type *Secret*) → **Redeploy**.
3. **ChatGPT** (needs a plan that allows custom GPTs) → *Explore GPTs* → *Create* → *Configure* → **Create new action**:
   * *Import from URL*: `https://YOUR-SITE/api/connector/openapi.json`
   * *Authentication* → **API Key** → Auth type **Bearer** → paste the key.
4. In the GPT's **Instructions** paste:
   > You write original news articles for my site. Only use facts from sources I give you or that you can cite with a link; never invent facts, quotes or numbers. Write in your own words (never copy sentences). Call listCategories first, choose a valid category_slug, then call submitDraftArticle with a headline, a 1-2 sentence excerpt, an HTML body (h2/h3/p/ul/ol/li/blockquote/strong/em/a only, 300+ words) and every source link used. Report the review_url the API returns. Never claim an article is published.
5. Ask it, e.g.: "Write an article about … using these sources: …". Open the `review_url` (or Admin → Articles), check the facts, add an image with alt text, tick **reviewed** and **fact-checked** (in the Verification box), and **Publish now**.

## Limits to know
* ChatGPT acts when **you** ask; it does not post on a timer by itself. Timer-based drafting would be a server job (see `CONTENT_PUBLISHING_GUIDE.md`).
* Rewriting other publishers' articles is a copyright and search-quality risk even with a link; use sources for facts and write original analysis.
* Rotate the key (change it in Vercel and the GPT) if it is ever exposed.
