// Basic automated accessibility audit (axe-core) of key pages.
// Usage: A11Y_BASE=http://localhost:3000 [A11Y_EMAIL=.. A11Y_PASSWORD=..] node scripts/a11y-check.mjs
// Needs Playwright available to Node (e.g. NODE_PATH pointing at a global install) and `axe-core` (devDependency).
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const axeSource = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

const BASE = process.env.A11Y_BASE ?? "http://localhost:3000";
const PUBLIC = (process.env.A11Y_PATHS ?? "/,/category/technology,/about,/contact,/privacy-policy,/search?q=news,/authors,/admin/login").split(",");
const ADMIN = ["/admin", "/admin/articles", "/admin/articles/new", "/admin/categories", "/admin/authors", "/admin/media", "/admin/ads", "/admin/settings", "/admin/calendar", "/admin/logs"];
const EXTRA = (process.env.A11Y_EXTRA ?? "").split(",").filter(Boolean);

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
let failures = 0;

async function audit(path) {
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await page.evaluate(axeSource);
  const res = await page.evaluate(() => axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } }));
  const serious = res.violations.filter((v) => ["serious", "critical"].includes(v.impact));
  console.log(`${serious.length ? "FAIL" : "ok  "} ${path}  (${res.violations.length} violations, ${serious.length} serious/critical)`);
  for (const v of res.violations) console.log(`   - [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} nodes) e.g. ${v.nodes[0].target.join(" ")}`);
  failures += serious.length;
}

for (const p of [...PUBLIC, ...EXTRA]) await audit(p);
if (process.env.A11Y_EMAIL) {
  await page.goto(BASE + "/admin/login");
  await page.fill("#email", process.env.A11Y_EMAIL);
  await page.fill("#password", process.env.A11Y_PASSWORD);
  await page.click('button:has-text("Sign in")');
  await page.waitForURL(BASE + "/admin");
  for (const p of ADMIN) await audit(p);
}
await browser.close();
console.log(failures ? `\n${failures} serious/critical issue(s)` : "\nNo serious or critical accessibility violations found.");
process.exit(failures ? 1 : 0);
