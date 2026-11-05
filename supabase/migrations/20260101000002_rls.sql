-- =============================================================================
-- 0002 · Row Level Security
-- Public: published content only. Writers: own drafts. Editors/Admins: all content.
-- Admin-only: settings, ads, redirects, roles.
-- =============================================================================

alter table public.profiles               enable row level security;
alter table public.authors                enable row level security;
alter table public.categories             enable row level security;
alter table public.tags                   enable row level security;
alter table public.media                  enable row level security;
alter table public.articles               enable row level security;
alter table public.article_tags           enable row level security;
alter table public.article_revisions      enable row level security;
alter table public.advertisements         enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.site_settings          enable row level security;
alter table public.redirects              enable row level security;
alter table public.publish_logs           enable row level security;
alter table public.activity_log           enable row level security;
alter table public.contact_messages       enable row level security;

-- ---- profiles ---------------------------------------------------------------
create policy profiles_select_own  on public.profiles for select using (id = auth.uid() or public.is_staff());
-- users may edit their own profile but never change their own role
create policy profiles_update_own  on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid() and role = public.current_user_role());
create policy profiles_admin_all   on public.profiles for all using (public.is_admin()) with check (public.is_admin());

-- ---- authors ----------------------------------------------------------------
create policy authors_public_read  on public.authors for select using (is_active or public.is_staff());
create policy authors_editor_write on public.authors for all using (public.is_editor()) with check (public.is_editor());

-- ---- categories -------------------------------------------------------------
create policy categories_public_read  on public.categories for select using (true);
create policy categories_editor_write on public.categories for all using (public.is_editor()) with check (public.is_editor());

-- ---- tags -------------------------------------------------------------------
create policy tags_public_read  on public.tags for select using (true);
create policy tags_staff_insert on public.tags for insert with check (public.is_staff());
create policy tags_editor_write on public.tags for update using (public.is_editor()) with check (public.is_editor());
create policy tags_editor_del   on public.tags for delete using (public.is_editor());

-- ---- media ------------------------------------------------------------------
create policy media_public_read   on public.media for select using (true);
create policy media_staff_insert  on public.media for insert with check (public.is_staff());
create policy media_editor_update on public.media for update using (public.is_editor()) with check (public.is_editor());
create policy media_editor_delete on public.media for delete using (public.is_editor());

-- ---- articles ---------------------------------------------------------------
create policy articles_public_read on public.articles for select
  using (status = 'published' and published_at <= now());
create policy articles_staff_read on public.articles for select
  using (public.is_editor() or (public.is_staff() and created_by = auth.uid()));
create policy articles_editor_all on public.articles for all
  using (public.is_editor()) with check (public.is_editor());
-- writers: create and edit their own non-published work only; cannot publish or schedule
create policy articles_writer_insert on public.articles for insert
  with check (public.is_staff() and created_by = auth.uid() and status in ('draft','in_review'));
create policy articles_writer_update on public.articles for update
  using (public.is_staff() and created_by = auth.uid() and status in ('draft','in_review'))
  with check (created_by = auth.uid() and status in ('draft','in_review'));
create policy articles_writer_delete on public.articles for delete
  using (public.is_staff() and created_by = auth.uid() and status = 'draft');

-- ---- article_tags -----------------------------------------------------------
create policy article_tags_public_read on public.article_tags for select using (
  exists (select 1 from public.articles a where a.id = article_id and a.status = 'published' and a.published_at <= now())
  or public.is_staff());
create policy article_tags_staff_write on public.article_tags for all
  using (public.is_staff()) with check (public.is_staff());

-- ---- article_revisions ------------------------------------------------------
create policy revisions_staff_read   on public.article_revisions for select using (public.is_staff());
create policy revisions_staff_insert on public.article_revisions for insert with check (public.is_staff());

-- ---- advertisements ---------------------------------------------------------
create policy ads_public_read on public.advertisements for select
  using (is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()));
create policy ads_staff_read  on public.advertisements for select using (public.is_editor());
create policy ads_admin_write on public.advertisements for all using (public.is_admin()) with check (public.is_admin());

-- ---- newsletter_subscribers: no public access at all (server uses service role) --
create policy newsletter_admin_read   on public.newsletter_subscribers for select using (public.is_editor());
create policy newsletter_admin_update on public.newsletter_subscribers for update using (public.is_admin()) with check (public.is_admin());
create policy newsletter_admin_delete on public.newsletter_subscribers for delete using (public.is_admin());

-- ---- site_settings ----------------------------------------------------------
create policy settings_public_read on public.site_settings for select using (true);
create policy settings_admin_write on public.site_settings for all using (public.is_admin()) with check (public.is_admin());

-- ---- redirects --------------------------------------------------------------
create policy redirects_public_read on public.redirects for select using (is_active);
create policy redirects_editor_read on public.redirects for select using (public.is_editor());
create policy redirects_editor_write on public.redirects for all using (public.is_editor()) with check (public.is_editor());

-- ---- logs / inbox -----------------------------------------------------------
create policy publish_logs_staff_read on public.publish_logs for select using (public.is_staff());
create policy activity_staff_read     on public.activity_log for select using (public.is_staff());
create policy activity_staff_insert   on public.activity_log for insert
  with check (public.is_staff() and actor_id = auth.uid());
create policy contact_editor_read   on public.contact_messages for select using (public.is_editor());
create policy contact_editor_update on public.contact_messages for update using (public.is_editor()) with check (public.is_editor());
create policy contact_admin_delete  on public.contact_messages for delete using (public.is_admin());

-- ---- table privileges -------------------------------------------------------
-- RLS governs rows; grants govern tables. Keep sensitive tables away from anon entirely.
revoke all on public.newsletter_subscribers, public.contact_messages, public.activity_log,
              public.publish_logs, public.article_revisions, public.profiles from anon;
revoke insert, update, delete on public.articles, public.categories, public.authors, public.tags,
              public.media, public.article_tags, public.advertisements, public.site_settings,
              public.redirects from anon;
