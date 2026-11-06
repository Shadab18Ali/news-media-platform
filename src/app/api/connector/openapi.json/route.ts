import { siteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** OpenAPI 3.1 description for importing into a Custom GPT (Actions). The spec itself contains no secrets. */
export function GET() {
  const spec = {
    openapi: "3.1.0",
    info: { title: "Newsroom connector", version: "1.0.0", description: "Submit finished articles as drafts for human review. Articles never go live automatically." },
    servers: [{ url: siteUrl() }],
    paths: {
      "/api/connector/categories": {
        get: { operationId: "listCategories", summary: "List valid category slugs and author slugs", responses: { "200": { description: "OK" } } },
      },
      "/api/connector/articles": {
        get: { operationId: "listRecentArticles", summary: "List headlines from the last 3 days to avoid repeating stories", responses: { "200": { description: "OK" } } },
        post: {
          operationId: "submitDraftArticle",
          summary: "Submit an original article as a DRAFT",
          description: "Write an original article in your own words, based on facts you verified. Include at least one https source link. Saved as a draft for human review.",
          requestBody: {
            required: true,
            content: { "application/json": { schema: {
              type: "object",
              required: ["title", "excerpt", "content_html", "category_slug", "sources"],
              properties: {
                title: { type: "string", description: "Headline, under 70 characters if possible" },
                excerpt: { type: "string", description: "1-2 sentence standfirst, max 280 characters" },
                content_html: { type: "string", description: "Article body as HTML using only h2, h3, p, ul, ol, li, blockquote, strong, em, a. No h1. At least 300 words." },
                category_slug: { type: "string", description: "A slug from listCategories" },
                article_type: { type: "string", enum: ["article", "news"] },
                tags: { type: "array", items: { type: "string" }, maxItems: 10 },
                seo_title: { type: "string" }, meta_description: { type: "string", description: "Max 155 characters" }, focus_keyword: { type: "string" },
                author_slug: { type: "string" },
                image_prompt: { type: "string", description: "Concept for an ORIGINAL illustration; do not reference real people or copyrighted works" },
                sources: { type: "array", minItems: 1, items: { type: "object", required: ["title", "url"], properties: { title: { type: "string" }, url: { type: "string", format: "uri" } } } },
              },
            } } },
          },
          responses: { "201": { description: "Draft created" }, "409": { description: "Duplicate title" }, "422": { description: "Validation error" } },
        },
      },
    },
    components: { securitySchemes: { bearer: { type: "http", scheme: "bearer" } } },
    security: [{ bearer: [] }],
  };
  return Response.json(spec);
}
