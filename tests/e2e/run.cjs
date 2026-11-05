/* End-to-end checks driven through a real browser against the production build.
 * Requires the local stack (tests/e2e/README.md). Run:  node tests/e2e/run.cjs
 */
const { chromium, request: pwRequest } = require("playwright");
const { execSync } = require("node:child_process");
const sharp = require("sharp");
const fs = require("node:fs");

const BASE = process.env.E2E_BASE ?? "http://localhost:3100";
const OUT = process.env.E2E_OUT ?? "/tmp/e2e-out";
const CRON = process.env.CRON_SECRET ?? "e2e-cron-secret-0123456789abcdef";
const PW = "Passw0rd!test";
fs.mkdirSync(OUT, { recursive: true });
const sql = (q) => execSync(`psql -h 127.0.0.1 -p 54329 -U postgres -t -A -c ${JSON.stringify(q)}`).toString().trim();

const results = [];
function check(name, ok, extra = "") { results.push({ name, ok: Boolean(ok), extra }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  " + extra}`); }

async function login(page, email, password = PW) {
  await page.goto(`${BASE}/admin/login`);
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button:has-text("Sign in")');
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));

  // ------------------------------------------------------------ auth & access control
  await page.goto(`${BASE}/admin`);
  check("anonymous /admin redirects to login", page.url().includes("/admin/login"));
  await login(page, "admin@example.test", "wrong-password");
  await page.waitForSelector('p[role="alert"]');
  check("wrong password shows generic error", (await page.textContent('p[role="alert"]')).includes("Invalid email or password"));
  await login(page, "reader@example.test");
  await page.waitForSelector('p[role="alert"]');
  check("reader account is refused dashboard access", (await page.textContent('p[role="alert"]')).includes("does not have dashboard access"));
  const reg = await page.request.get(`${BASE}/admin/register`);
  check("no public admin registration route", reg.status() === 404 || reg.url().includes("login"));

  await login(page, "admin@example.test");
  await page.waitForURL(`${BASE}/admin`);
  check("admin can sign in and sees dashboard", (await page.textContent("h1")).includes("Dashboard"));
  await page.screenshot({ path: `${OUT}/admin-dashboard.png`, fullPage: true });

  // ------------------------------------------------------------ settings (brand is data)
  await page.goto(`${BASE}/admin/settings`);
  await page.fill("#brand-name", "Meridian Post");
  await page.fill("#brand-tagline", "News that moves markets and minds");
  await page.fill("#brand-description", "Independent reporting on technology, business, India and the world.");
  await page.locator("#brand-primaryColor").fill("#0b5fa5");
  await page.locator("#brand form, form").filter({ has: page.locator("#brand-name") }).locator('button:has-text("Save")').click();
  await page.waitForSelector("text=Settings saved.");
  await page.fill("#publisher-legalName", "Meridian Media Pvt Ltd");
  await page.fill("#publisher-contactEmail", "newsroom@example.com");
  await page.fill("#publisher-editorInChief", "A. Editor");
  await page.locator("form").filter({ has: page.locator("#publisher-legalName") }).locator('button:has-text("Save")').click();
  await page.waitForSelector("text=Settings saved.");
  await page.fill("#seo-titleTemplate", "%s | Meridian Post");
  await page.locator("form").filter({ has: page.locator("#seo-titleTemplate") }).locator('button:has-text("Save")').click();
  await page.waitForSelector("text=Settings saved.");
  // invalid GA id must be rejected, not stored
  await page.fill("#integrations-ga4MeasurementId", "G-PLACEHOLDER-123");
  await page.locator("form").filter({ has: page.locator("#integrations-ga4MeasurementId") }).locator('button:has-text("Save")').click();
  await page.waitForSelector("text=Format: G-XXXXXXXXXX");
  check("invalid/placeholder GA4 id is rejected", true);
  await page.fill("#integrations-ga4MeasurementId", "");

  // ------------------------------------------------------------ author
  await page.goto(`${BASE}/admin/authors`);
  const addForm = page.locator("section", { hasText: "Add author" }).locator("form");
  await addForm.locator('input[name="name"]').fill("Priya Sharma");
  await addForm.locator('input[name="job_title"]').fill("Technology Editor");
  await addForm.locator('textarea[name="bio"]').fill("Priya covers consumer technology and the Indian startup ecosystem.");
  await addForm.locator('input[name="twitter"]').fill("https://x.com/example");
  await addForm.locator('button:has-text("Add author")').click();
  await page.waitForSelector("text=Author created.");
  check("author created", sql("select count(*) from authors where slug='priya-sharma'") === "1");

  // ------------------------------------------------------------ media upload (sharp pipeline)
  const png = await sharp({ create: { width: 2400, height: 1350, channels: 3, background: { r: 20, g: 90, b: 160 } } })
    .composite([{ input: Buffer.from(`<svg width="2400" height="1350"><rect x="200" y="200" width="1000" height="600" fill="#f5b700"/><circle cx="1700" cy="700" r="400" fill="#ffffff"/></svg>`) }]).png().toBuffer();
  fs.writeFileSync(`${OUT}/hero.png`, png);
  fs.writeFileSync(`${OUT}/notimage.png`, Buffer.from("this is not an image, just text pretending"));
  await page.goto(`${BASE}/admin/media`);
  await page.fill("#mu-alt", "Blue abstract chip illustration with yellow block");
  await page.setInputFiles('input[type="file"]', `${OUT}/hero.png`);
  await page.waitForSelector("text=uploaded and optimised");
  const media = sql("select filename||'|'||width||'|'||mime_type||'|'||(og_url is not null) from media limit 1").split("|");
  check("image uploaded, converted to WebP, <=2000px, OG variant generated", media[2] === "image/webp" && Number(media[1]) <= 2000 && media[3] === "true", media.join("|"));
  check("descriptive filename generated from alt text", media[0].startsWith("blue-abstract-chip-illustration"), media[0]);
  await page.setInputFiles('input[type="file"]', `${OUT}/notimage.png`);
  await page.waitForSelector("text=Unsupported file");
  check("non-image disguised as .png is rejected", true);
  const mediaUrl = sql("select url from media limit 1");
  const imgRes = await page.request.get(mediaUrl);
  check("uploaded image is publicly reachable", imgRes.status() === 200 && (imgRes.headers()["content-type"] ?? "").includes("webp"));

  // ------------------------------------------------------------ article creation through the editor
  await page.goto(`${BASE}/admin/articles/new`);
  await page.fill("#title", "India's Chip Makers Race To Build Local Supply Chains");
  check("slug auto-generated from headline", (await page.inputValue("#slug")) === "indias-chip-makers-race-to-build-local-supply-chains", await page.inputValue("#slug"));
  await page.fill("#excerpt", "Domestic semiconductor firms are expanding capacity as demand for electronics grows across the country.");
  const editor = page.locator(".tiptap");
  await editor.click();
  const para = async (t) => { await page.keyboard.type(t); await page.keyboard.press("Enter"); };
  const heading = async (t) => { await page.click('button[aria-label="Heading 2"]'); await page.keyboard.type(t); await page.keyboard.press("Enter"); };
  await para("India's semiconductor industry is moving from ambition to execution, according to industry filings reviewed for this report.");
  await para("Several companies have announced packaging and assembly plants, and suppliers say orders are rising steadily this year.");
  await heading("Why local supply chains matter");
  await para("Dependence on imported components exposes manufacturers to price swings and shipping delays that are hard to predict.");
  await para("Executives told reporters that proximity to customers shortens design cycles and reduces inventory costs for device makers.");
  await heading("What comes next");
  await para("Analysts expect the next two years to determine which plants reach commercial volumes and which remain on paper.");
  await para("Readers can follow our related coverage of startups and business for further developments in this fast moving story.");
  await heading("The bottom line");
  await para("The transition will be gradual, but the direction of travel is clear for the country's electronics sector as a whole.");
  await page.selectOption("#article_type", "news");
  await page.selectOption("#category_id", { label: "Technology" });
  await page.selectOption("#author_id", { label: "Priya Sharma" });
  await page.fill("#tags", "semiconductors, India, manufacturing");
  // featured image via picker
  await page.click('button[aria-label="Choose / upload image"]');
  await page.waitForSelector('[role="dialog"] img');
  await page.locator('[role="dialog"] ul button').first().click();
  await page.waitForFunction(() => document.querySelector('input[name="featured_image_url"]').value.startsWith("http"));
  check("media picker selects library image and pre-fills alt text", (await page.inputValue("#featured_image_alt")).includes("Blue abstract chip"));
  await page.fill("#featured_image_caption", "Illustration: original artwork");
  await page.fill("#focus_keyword", "semiconductor");
  await page.fill("#meta_description", "India's semiconductor makers are building local supply chains as electronics demand surges, reports Meridian Post.");
  await page.check('input[name="is_featured"]');
  await page.screenshot({ path: `${OUT}/editor.png`, fullPage: true });
  // publish validation: missing alt should block. Clear alt first.
  const alt = await page.inputValue("#featured_image_alt");
  await page.fill("#featured_image_alt", "");
  await page.click('button[value="publish"]');
  await page.waitForSelector("text=Alt text is required");
  check("publishing blocked without featured image alt text", true);
  await page.fill("#featured_image_alt", alt);
  await page.click('button[value="publish"]');
  await page.waitForURL(/\/edit\?saved=publish/);
  check("article published from editor", sql("select status from articles where slug='indias-chip-makers-race-to-build-local-supply-chains'") === "published");
  check("content sanitised/stored with headings and reading time", Number(sql("select reading_time_minutes from articles limit 1")) >= 1 && sql("select content like '%<h2>%' from articles limit 1") === "t");
  check("tags stored", sql("select count(*) from article_tags") === "3");
  check("activity logged", Number(sql("select count(*) from activity_log")) > 0);
  const articleId = sql("select id from articles limit 1");

  // ------------------------------------------------------------ public rendering & SEO
  const pub = await ctx.newPage();
  const slug = "indias-chip-makers-race-to-build-local-supply-chains";
  await pub.goto(`${BASE}/news/${slug}`);
  check("article page renders", (await pub.textContent("h1")).includes("Chip Makers"));
  check("brand comes from settings", (await pub.textContent("header")).includes("Meridian Post"));
  check("page <title> uses SEO template", (await pub.title()).includes("| Meridian Post"), await pub.title());
  const meta = async (sel) => pub.locator(sel).first().getAttribute("content");
  check("meta description set", (await meta('meta[name="description"]')).includes("semiconductor makers"));
  check("canonical URL set", (await pub.locator('link[rel="canonical"]').first().getAttribute("href")) === `http://localhost:3100/news/${slug}`);
  check("open graph article tags", (await meta('meta[property="og:type"]')) === "article" && (await meta('meta[property="og:image"]')).startsWith("http"));
  check("twitter card tags", (await meta('meta[name="twitter:card"]')) === "summary_large_image");
  check("robots index,follow", (await meta('meta[name="robots"]')).includes("index"));
  const ld = (await pub.locator('script[type="application/ld+json"]').allTextContents()).map((t) => JSON.parse(t)).flat().find((x) => x["@type"] === "NewsArticle");
  check("NewsArticle structured data", ld && ld["@type"] === "NewsArticle" && ld.headline && ld.datePublished && ld.author?.name === "Priya Sharma" && ld.image?.length, JSON.stringify(ld).slice(0, 200));
  const lds = await pub.locator('script[type="application/ld+json"]').allTextContents();
  const flat = lds.map((t) => JSON.parse(t)).flat();
  check("Organization + WebSite + Breadcrumb schema present", ["NewsMediaOrganization", "WebSite", "BreadcrumbList"].every((t) => flat.some((x) => x["@type"] === t)));
  check("table of contents rendered", await pub.locator('nav[aria-labelledby="toc-h"]').isVisible());
  check("headings have anchor ids", await pub.locator(".prose-article h2[id]").count() === 3);
  check("breadcrumb nav", (await pub.locator('nav[aria-label="Breadcrumb"]').textContent()).includes("Technology"));
  check("share buttons", await pub.locator('[aria-label="Share on X"]').count() === 1);
  check("author box + byline link", await pub.locator('a[href="/author/priya-sharma"]').count() >= 1);
  check("tags links", await pub.locator('a[href="/tag/semiconductors"]').count() === 1);
  check("featured image alt text rendered", (await pub.locator("figure img").first().getAttribute("alt")).includes("Blue abstract"));
  check("no ad markup while ads are disabled", await pub.locator('aside[aria-label="Advertisement"]').count() === 0 && await pub.locator("script[src*=adsbygoogle]").count() === 0);
  check("no analytics scripts or consent banner when nothing is configured", await pub.locator('[role="dialog"][aria-label="Cookie preferences"]').count() === 0 && await pub.locator("script[src*=googletagmanager]").count() === 0);
  await pub.screenshot({ path: `${OUT}/article-desktop.png`, fullPage: true });

  await pub.goto(`${BASE}/`);
  check("homepage lists the article (hero)", (await pub.textContent("main")).includes("Chip Makers"));
  await pub.screenshot({ path: `${OUT}/home-desktop.png`, fullPage: true });
  await pub.goto(`${BASE}/category/technology`);
  check("category page lists article + heading", (await pub.textContent("h1")) === "Technology" && (await pub.textContent("main")).includes("Chip Makers"));
  check("category canonical", (await pub.locator('link[rel="canonical"]').first().getAttribute("href")).endsWith("/category/technology"));
  await pub.goto(`${BASE}/category/world`);
  check("empty category shows empty state", (await pub.textContent("main")).includes("No stories in this section yet"));
  const nf = await pub.goto(`${BASE}/category/does-not-exist`);
  check("unknown category -> 404", nf.status() === 404);
  await pub.goto(`${BASE}/search?q=semiconductor`);
  check("search finds article, page noindex", (await pub.textContent("main")).includes("Chip Makers") && (await pub.locator('meta[name="robots"]').getAttribute("content")).includes("noindex"));
  await pub.goto(`${BASE}/search?q=zzzzqq`);
  check("search no results message", (await pub.textContent("main")).includes("No stories matched"));
  await pub.goto(`${BASE}/search?q=%27%3B%20drop%20table%20articles%3B--`);
  check("search handles hostile input safely", (await pub.textContent("main")).includes("Search") && sql("select count(*) from articles") !== "");
  await pub.goto(`${BASE}/tag/semiconductors`);
  check("tag page", (await pub.textContent("main")).includes("Chip Makers"));
  await pub.goto(`${BASE}/author/priya-sharma`);
  check("author page with Person schema", (await pub.textContent("h1")) === "Priya Sharma" && (await pub.locator('script[type="application/ld+json"]').allTextContents()).join("").includes('"Person"'));
  for (const p of ["about", "contact", "privacy-policy", "terms-and-conditions", "disclaimer", "editorial-policy", "corrections-policy", "authors", "advertise"]) {
    const r = await pub.goto(`${BASE}/${p}`);
    check(`/${p} renders`, r.status() === 200);
  }
  await pub.goto(`${BASE}/about`);
  check("About shows publisher details from settings", (await pub.textContent("main")).includes("Meridian Media Pvt Ltd") && (await pub.textContent("main")).includes("newsroom@example.com"));

  // sitemap, robots, feeds
  const sm = await (await pub.request.get(`${BASE}/sitemap.xml`)).text();
  check("sitemap lists article, category, author", sm.includes(`/news/${slug}`) && sm.includes("/category/technology") && sm.includes("/author/priya-sharma"));
  const rb = await (await pub.request.get(`${BASE}/robots.txt`)).text();
  check("robots.txt disallows admin/api and links sitemaps", rb.includes("Disallow: /admin") && rb.includes("Sitemap:") && rb.includes("news-sitemap.xml"));
  const ns = await (await pub.request.get(`${BASE}/news-sitemap.xml`)).text();
  check("Google News sitemap includes the news article", ns.includes("<news:title>") && ns.includes(slug));
  const feed = await (await pub.request.get(`${BASE}/feed.xml`)).text();
  check("RSS feed", feed.includes("<item>") && feed.includes("Chip Makers"));
  const adsTxt = await pub.request.get(`${BASE}/ads.txt`);
  check("ads.txt is empty until configured", adsTxt.status() === 200 && (await adsTxt.text()) === "");

  // ------------------------------------------------------------ drafts stay private; preview works
  await page.goto(`${BASE}/admin/articles/new`);
  await page.fill("#title", "Secret Draft Story About Upcoming Earnings");
  await page.locator(".tiptap").click();
  await page.keyboard.type("Draft body that must never leak to the public site before approval by an editor.");
  await page.click('button[value="save"]');
  await page.waitForURL(/\/edit\?saved=save/);
  const draftSlug = "secret-draft-story-about-upcoming-earnings";
  const dr = await pub.goto(`${BASE}/news/${draftSlug}`);
  check("draft is not publicly accessible (404)", dr.status() === 404);
  check("draft absent from sitemap/search/home", !(await (await pub.request.get(`${BASE}/sitemap.xml`)).text()).includes(draftSlug));
  const draftId = sql(`select id from articles where slug='${draftSlug}'`);
  await page.goto(`${BASE}/admin/articles/${draftId}/preview`);
  check("admin preview renders draft, noindex", (await page.textContent("h1")).includes("Secret Draft") && (await page.locator('meta[name="robots"]').first().getAttribute("content")).includes("noindex"));

  // ------------------------------------------------------------ slug change creates redirect
  await page.goto(`${BASE}/admin/articles/${articleId}/edit`);
  await page.fill("#slug", "india-chip-makers-local-supply-chains");
  await page.click('button[value="publish"]');
  await page.waitForURL(/saved=publish/);
  const oldRes = await pub.goto(`${BASE}/news/${slug}`);
  check("old slug 301/308-redirects to new slug", pub.url().endsWith("/news/india-chip-makers-local-supply-chains") && oldRes.status() === 200, pub.url());
  check("redirect row created", sql("select count(*) from redirects where from_path='/news/" + slug + "'") === "1");
  await pub.goto(`${BASE}/old-page-that-moved`);
  sql("insert into redirects (from_path,to_path) values ('/old-page-that-moved','/about')");
  const rr = await pub.goto(`${BASE}/old-page-that-moved`);
  check("manual redirect works via catch-all", pub.url().endsWith("/about"), pub.url());

  // ------------------------------------------------------------ scheduling + cron
  await page.goto(`${BASE}/admin/articles/${draftId}/edit`);
  await page.selectOption("#category_id", { label: "Business" });
  await page.fill("#excerpt", "A story prepared in advance for scheduled release.");
  await page.fill("#scheduled_for_local", "2030-01-15T09:30");
  await page.click('button[value="schedule"]');
  await page.waitForURL(/saved=schedule/);
  const sched = sql(`select status||'|'||scheduled_for at time zone 'Asia/Kolkata' from articles where id='${draftId}'`);
  check("scheduled for 2030-01-15 09:30 IST stored correctly", sched.startsWith("scheduled|2030-01-15 09:30"), sched);
  await page.fill("#scheduled_for_local", "2020-01-01T09:30");
  await page.click('button[value="schedule"]');
  await page.waitForSelector("text=must be in the future");
  check("past schedule time rejected", true);
  // simulate time passing
  sql(`update articles set scheduled_for = now() - interval '1 minute' where id='${draftId}'`);
  const c1 = await pub.request.get(`${BASE}/api/cron/publish-scheduled`);
  check("cron without secret -> 401", c1.status() === 401);
  const c2 = await pub.request.get(`${BASE}/api/cron/publish-scheduled`, { headers: { authorization: "Bearer wrong-secret-wrong-secret" } });
  check("cron with wrong secret -> 401", c2.status() === 401);
  const c3 = await pub.request.get(`${BASE}/api/cron/publish-scheduled`, { headers: { authorization: `Bearer ${CRON}` } });
  const j3 = await c3.json();
  check("cron publishes due article", c3.status() === 200 && j3.published === 1, JSON.stringify(j3));
  const c4 = await (await pub.request.get(`${BASE}/api/cron/publish-scheduled`, { headers: { authorization: `Bearer ${CRON}` } })).json();
  check("cron is idempotent (no duplicate publishing)", c4.published === 0, JSON.stringify(c4));
  check("publish logged", Number(sql("select count(*) from publish_logs where level='info'")) === 1);
  const live = await pub.goto(`${BASE}/news/${draftSlug}`);
  check("scheduled article is now live", live.status() === 200);

  // manual run button
  sql(`insert into articles (title, slug, status, scheduled_for, category_id, content, excerpt) values ('Manual run story','manual-run-story','scheduled', now() - interval '1 minute', (select id from categories limit 1), '<p>${"x ".repeat(40)}</p>', 'excerpt')`);
  await page.goto(`${BASE}/admin/logs`);
  await page.click('button:has-text("Run scheduler now")');
  await page.waitForSelector("text=1 scheduled article published");
  check("manual scheduler run from admin works", sql("select status from articles where slug='manual-run-story'") === "published");

  // ------------------------------------------------------------ AI-safety rail
  await page.goto(`${BASE}/admin/articles/new`);
  await page.fill("#title", "Machine drafted explainer on interest rates");
  await page.fill("#excerpt", "An explainer.");
  await page.locator(".tiptap").click();
  await page.keyboard.type("This is a sufficiently long body of text so the validation for content length passes without trouble for this particular test case.");
  await page.selectOption("#category_id", { label: "Business" });
  await page.check('input[name="ai_generated"]');
  await page.click('button[value="publish"]');
  await page.waitForSelector("text=need human review and fact-checking");
  check("machine-assisted draft cannot be published without review + fact-check", sql("select count(*) from articles where slug='machine-drafted-explainer-on-interest-rates'") === "0");
  await page.check('input[name="fact_checked"]'); await page.check('input[name="human_reviewed"]');
  await page.click('button[value="publish"]');
  await page.waitForURL(/saved=publish/);
  check("…but can once an editor confirms both", sql("select ai_generated and fact_checked and human_reviewed_at is not null from articles where slug='machine-drafted-explainer-on-interest-rates'") === "t");

  // ------------------------------------------------------------ advertising
  await page.goto(`${BASE}/admin/ads`);
  const adForm = page.locator("section", { hasText: "Add ad unit" }).locator("form");
  await adForm.locator('input[name="name"]').fill("Direct banner");
  await adForm.locator('select[name="placement"]').selectOption("sidebar");
  await adForm.locator('select[name="ad_type"]').selectOption("image");
  await adForm.locator('input[name="link_url"]').fill("https://advertiser.example/offer");
  await adForm.locator('button[aria-label$="banner image (image type)"]').click();
  await page.locator('[role="dialog"] ul button').first().click();
  await adForm.locator('input[name="sponsor_name"]').fill("Example Advertiser");
  await adForm.locator('input[name="is_active"]').check();
  await adForm.locator('button:has-text("Add ad unit")').click();
  await page.waitForSelector("text=Ad unit created.");
  await pub.goto(`${BASE}/news/india-chip-makers-local-supply-chains`);
  check("ad unit does NOT render while master switch is off", await pub.locator('aside[aria-label="Advertisement"]').count() === 0);
  await page.goto(`${BASE}/admin/ads`);
  await page.locator('input[name="enabled"]').check();
  await page.locator("form").filter({ has: page.locator('input[name="enabled"]') }).locator('button:has-text("Save advertising settings")').click();
  await page.waitForSelector("text=Advertising settings saved.");
  await pub.goto(`${BASE}/news/india-chip-makers-local-supply-chains`);
  check("image ad renders in sidebar once master switch is on", await pub.locator('aside[aria-label="Advertisement"] a[rel~="sponsored"]').count() === 1);
  check("ad is labelled as advertisement with sponsor", (await pub.locator('aside[aria-label="Advertisement"]').textContent()).includes("Sponsored by Example Advertiser"));
  await page.goto(`${BASE}/admin/ads`);
  await page.locator('input[name="placement_sidebar"]').uncheck();
  await page.locator("form").filter({ has: page.locator('input[name="enabled"]') }).locator('button:has-text("Save advertising settings")').click();
  await page.waitForSelector("text=Advertising settings saved.");
  await pub.goto(`${BASE}/news/india-chip-makers-local-supply-chains`);
  check("disabling the sidebar placement removes the ad", await pub.locator('aside[aria-label="Advertisement"]').count() === 0);
  await page.goto(`${BASE}/admin/ads`);
  await page.locator('input[name="placement_sidebar"]').check();
  await page.locator("form").filter({ has: page.locator('input[name="enabled"]') }).locator('button:has-text("Save advertising settings")').click();
  await page.waitForSelector("text=Advertising settings saved.");

  // AdSense + GA: configured IDs gated by consent
  await page.goto(`${BASE}/admin/settings`);
  await page.fill("#integrations-ga4MeasurementId", "G-ABCDE12345");
  await page.fill("#integrations-adsensePublisherId", "ca-pub-1234567890123456");
  await page.locator("form").filter({ has: page.locator("#integrations-ga4MeasurementId") }).locator('button:has-text("Save")').click();
  await page.waitForSelector("text=Settings saved.");
  await page.goto(`${BASE}/admin/ads`);
  const adsenseForm = page.locator("section", { hasText: "Add ad unit" }).locator("form");
  await adsenseForm.locator('input[name="name"]').fill("AdSense article middle");
  await adsenseForm.locator('select[name="placement"]').selectOption("article_middle");
  await adsenseForm.locator('input[name="adsense_slot"]').fill("1234567890");
  await adsenseForm.locator('input[name="is_active"]').check();
  await adsenseForm.locator('button:has-text("Add ad unit")').click();
  await page.waitForSelector("text=Ad unit created.");
  const fresh = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const vp = await fresh.newPage();
  await vp.goto(`${BASE}/news/india-chip-makers-local-supply-chains`);
  await vp.waitForSelector('[role="dialog"][aria-label="Cookie preferences"]');
  check("consent banner appears once analytics/ads are configured", true);
  check("no GA / AdSense scripts before consent", await vp.locator("script[src*=googletagmanager], script[src*=adsbygoogle]").count() === 0);
  check("AdSense <ins> not rendered before consent", await vp.locator("ins.adsbygoogle").count() === 0);
  await vp.screenshot({ path: `${OUT}/consent-banner.png` });
  await vp.click('button:has-text("Reject non-essential")');
  await vp.reload();
  check("rejecting keeps trackers off after reload", await vp.locator("script[src*=googletagmanager], script[src*=adsbygoogle]").count() === 0 && await vp.locator('[role="dialog"][aria-label="Cookie preferences"]').count() === 0);
  await vp.evaluate(() => window.dispatchEvent(new Event("open-consent")));
  await vp.click('button:has-text("Accept all")');
  await vp.waitForTimeout(800);
  check("accepting loads GA4 + AdSense scripts", await vp.locator("script[src*='googletagmanager.com/gtag/js?id=G-ABCDE12345']").count() === 1 && await vp.locator("script[src*='adsbygoogle.js?client=ca-pub-1234567890123456']").count() === 1);
  check("AdSense unit renders after ad consent", await vp.locator("ins.adsbygoogle[data-ad-slot='1234567890']").count() === 1);
  await fresh.close();

  // ------------------------------------------------------------ forms: newsletter, contact
  const nl = await ctx.newPage();
  await nl.goto(`${BASE}/about`);
  await nl.locator('footer input[type="email"]').fill("reader@example.org");
  await nl.locator('footer input[name="consent"]').check();
  await nl.locator('footer button:has-text("Subscribe")').click();
  await nl.waitForSelector("footer >> text=Thanks for subscribing");
  check("newsletter sign-up stored", sql("select count(*) from newsletter_subscribers where email='reader@example.org'") === "1");
  await nl.goto(`${BASE}/about`);
  await nl.locator('footer input[type="email"]').fill("READER@example.org");
  await nl.locator('footer input[name="consent"]').check();
  await nl.locator('footer button:has-text("Subscribe")').click();
  await nl.waitForSelector("footer >> text=Thanks for subscribing");
  check("duplicate (case-insensitive) sign-up does not create a second row", sql("select count(*) from newsletter_subscribers") === "1");
  await nl.goto(`${BASE}/contact`);
  await nl.fill("#c-name", "Sam Reader"); await nl.fill("#c-email", "sam@example.org"); await nl.fill("#c-message", "Hello, I would like to share a news tip about a local story.");
  await nl.click('button:has-text("Send message")');
  await nl.waitForSelector("text=Your message has been sent");
  check("contact message stored", sql("select count(*) from contact_messages where email='sam@example.org'") === "1");

  // ------------------------------------------------------------ roles: writer
  const wctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  const w = await wctx.newPage();
  await login(w, "writer@example.test");
  await w.waitForURL(`${BASE}/admin`);
  check("writer sees limited navigation", (await w.locator('nav[aria-label="Admin"]').textContent()).includes("Articles") && !(await w.locator('nav[aria-label="Admin"]').textContent()).includes("Site settings"));
  await w.goto(`${BASE}/admin/settings`);
  check("writer is blocked from settings", w.url().includes("/admin?denied=1"), w.url());
  await w.goto(`${BASE}/admin/ads`);
  check("writer is blocked from advertising", w.url().includes("/admin?denied=1"));
  await w.goto(`${BASE}/admin/articles/new`);
  check("writer cannot see Publish button", await w.locator('button[value="publish"]').count() === 0 && await w.locator('button[value="submit_review"]').count() === 1);
  await w.fill("#title", "Writer pitch about local elections");
  await w.locator(".tiptap").click(); await w.keyboard.type("Pitch body text for the editors to consider for the upcoming coverage plan.");
  await w.click('button[value="submit_review"]');
  await w.waitForURL(/saved=submit_review/);
  check("writer can submit for review", sql("select status from articles where slug='writer-pitch-about-local-elections'") === "in_review");
  await w.goto(`${BASE}/admin/articles`);
  check("writer sees only own articles", !(await w.textContent("main")).includes("Chip Makers") && (await w.textContent("main")).includes("Writer pitch"));
  const mediaApi = await w.request.get(`${BASE}/api/admin/media`);
  check("writer can list media", mediaApi.status() === 200);
  const subApi = await w.request.get(`${BASE}/api/admin/subscribers`);
  check("writer cannot export subscribers", subApi.status() === 401);
  const anon = await pwRequest.newContext();
  const anonApi = await anon.get(`${BASE}/api/admin/media`);
  check("anonymous media API -> 401", anonApi.status() === 401);
  const anonUp = await anon.post(`${BASE}/api/admin/media`, { multipart: { file: { name: "x.png", mimeType: "image/png", buffer: png } } });
  check("anonymous upload -> 401", anonUp.status() === 401);
  await wctx.close();

  // ------------------------------------------------------------ editor: admin export + delete
  const sub = await page.request.get(`${BASE}/api/admin/subscribers`);
  check("admin can export subscribers CSV", sub.status() === 200 && (await sub.text()).includes("reader@example.org"));
  await page.goto(`${BASE}/admin/articles`);
  page.once("dialog", (d) => d.accept());
  await page.locator("tr", { hasText: "Manual run story" }).locator('button:has-text("Delete")').click();
  await page.waitForSelector("text=Article deleted.");
  check("article deleted", sql("select count(*) from articles where slug='manual-run-story'") === "0");
  await page.goto(`${BASE}/admin/articles?q=chip&status=published`);
  check("article list filter/search works", (await page.textContent("main")).includes("Chip Makers") && !(await page.textContent("main")).includes("Writer pitch"));
  await page.goto(`${BASE}/admin/calendar`);
  check("editorial calendar renders", (await page.textContent("h1")).includes("Editorial calendar"));
  await page.screenshot({ path: `${OUT}/calendar.png`, fullPage: true });
  for (const p of ["categories", "media", "ads", "settings", "logs", "subscribers", "redirects", "ai"]) {
    const r = await page.goto(`${BASE}/admin/${p}`);
    check(`admin /${p} loads`, r.status() === 200);
  }

  // ------------------------------------------------------------ mobile
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const m = await mctx.newPage();
  await m.goto(`${BASE}/`);
  await m.screenshot({ path: `${OUT}/home-mobile.png`, fullPage: true });
  const overflow = await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  check("homepage has no horizontal overflow on mobile", !overflow);
  await m.click('button:has-text("Open menu")');
  check("mobile menu opens", await m.locator('[role="dialog"][aria-label="Site menu"]').isVisible());
  await m.keyboard.press("Escape");
  await m.goto(`${BASE}/news/india-chip-makers-local-supply-chains`);
  await m.screenshot({ path: `${OUT}/article-mobile.png`, fullPage: true });
  check("article has no horizontal overflow on mobile", !(await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
  await mctx.close();

  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error("E2E crashed:", e); process.exit(2); });
