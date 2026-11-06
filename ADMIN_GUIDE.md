# Admin guide

Sign in at `/admin/login`. The sidebar shows only what your role may use (see roles in `DATABASE_SETUP.md`). Times are in **Asia/Kolkata (IST)**.

## Dashboard
Counts of total/published/draft/scheduled articles and categories, recent articles, what is scheduled next, most-read stories (first-party read counts), recent activity and a **Setup status** list showing which integrations are configured. Traffic and revenue reports live in Google Analytics / AdSense once connected — the dashboard never shows made-up figures.

## Articles
* **New article** → headline (slug auto-generates; edit it any time), excerpt, body in the rich-text editor (H2/H3, bold/italic/underline, links, lists, quotes, tables, images from the library), category, author, tags, type (news / article / sponsored / affiliate), featured image + **alt text** + caption, SEO panel (title, meta description, focus keyword, canonical URL, social image, noindex) with a live checklist.
* **Buttons**: *Publish now*, *Schedule* (set the IST date/time), *Save without changing status*, *Unpublish*, *Archive*, *Submit for review* (writers). *Preview* shows exactly what readers will see, for any status.
* **List**: filter by status/category, search, edit, view live, **duplicate**, delete. Changing the slug of a live article automatically creates a 301 redirect from the old URL. Every save keeps a revision.
* Publishing requires: body text, a category, an excerpt, and alt text if there is a featured image.

### Publishing many drafts at once
In **Articles**, tick the drafts (or *Select all drafts on this page*), choose **Release: all now** or **one every 5/10/30/60 minutes**, tick the confirmation that you reviewed them and checked the facts, and click **Publish selected**. Incomplete drafts (no category, excerpt, sources for machine-written ones, alt text for images) are skipped and listed with the reason. Timed releases are published by the scheduler.

## Categories, authors
Add/edit/delete with descriptions, images and SEO fields (categories) or bio, photo and social links (authors). A category with articles cannot be deleted; deleting an author keeps their articles (without a byline).

## Media
Upload JPEG/PNG/WebP/GIF/AVIF (≤ 8 MB). Files are verified by content, auto-rotated, resized to ≤ 2000 px, converted to WebP, given a descriptive filename from the alt text, and a 1200×630 social version is generated. Edit alt text/captions, copy URLs, delete **only unused** images.

## Advertising (admin only)
Master switch, per-placement switches, ad units (AdSense, image banner, custom HTML), schedule windows, priorities, `ads.txt`. See `MONETISATION_GUIDE.md`.

## Other sections
* **Editorial calendar** — month view of published/scheduled stories plus the draft/in-review pipeline with editorial notes.
* **Drafting assistant** — optional; see `CONTENT_PUBLISHING_GUIDE.md`.
* **Subscribers & inbox** — newsletter list (CSV export) and contact-form messages.
* **Redirects** — manual 301/302/307/308 redirects.
* **Logs & publishing** — scheduler status, **Run scheduler now**, publish log, activity log.
* **Site settings** (admin) — brand, publisher details, SEO defaults, Google IDs, feature toggles and disclosure texts.

## Adding staff
Create the user in Supabase (Authentication → Users), then set their role — see `DATABASE_SETUP.md` §4. Link them to an author profile under **Authors → Linked staff login** so their articles default to their byline.
