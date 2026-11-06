-- =============================================================================
-- 0006 · Optional auto-publishing of machine-written drafts after a review window
-- Adds a flag that marks articles published automatically (never reviewed by an editor) and lets
-- the human-review rule accept them. Auto-publishing itself stays OFF until an admin sets
-- "Auto-publish after (hours)" above 0 in Admin > Site settings > Features.
-- Safe to run more than once.
-- =============================================================================
alter table public.articles add column if not exists auto_published boolean not null default false;

alter table public.articles drop constraint if exists articles_ai_requires_human_review;
alter table public.articles add constraint articles_ai_requires_human_review check (
  not (ai_generated and status in ('published','scheduled')
       and not auto_published
       and (human_reviewed_at is null or fact_checked is not true))
);
