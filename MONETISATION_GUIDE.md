# Monetisation guide

Everything is **off by default**; no fake ads or earnings are ever displayed.

## Google AdSense
1. Launch with real, original content (a dozen+ articles), the policy pages and a custom domain, then apply at <https://adsense.google.com>.
2. After approval, paste your publisher ID (`ca-pub-…`) in **/admin/settings → Google integrations**.
3. In AdSense create ad units, then in **/admin/ads → Add ad unit** choose type *AdSense*, a placement and the numeric slot ID.
4. Tick **Enable advertising site-wide** and save. `ads.txt` is generated automatically (or paste your own in the ads.txt box).
Ads load only after the visitor accepts advertising cookies (consent banner appears automatically once ads are on). Reserved heights prevent layout shift.

## Placements
Header · Homepage · Homepage feed · Article top · Article middle (auto-placed mid-article, only on articles with ≥ 6 paragraphs) · Article bottom · Sidebar · Footer. Each can be switched off individually.

## Direct advertising & other networks
Create an *Image banner* unit (image + destination URL; links are `rel="sponsored"`) with sponsor name and optional start/end dates, or a *Custom HTML* unit for another network's code (admin-only; paste only trusted code). Lower **priority** number wins when units share a placement.

## Sponsored content
Set article type **Sponsored** and a sponsor name: the article shows a "Sponsored" label and "Paid for by …" notice and the schema records the sponsor. Keep sponsored content clearly separate from reporting.

## Affiliate links
Use type **Affiliate / review** or tick *Contains affiliate links*; a disclosure (editable in settings) is shown. Add `rel="sponsored"` semantics by using reputable programs' disclosure requirements; keep recommendations honest.

## Readers' experience
Ads never appear above the headline and are capped per template; no pop-ups or interstitials are included. Review AdSense policies before enabling.
