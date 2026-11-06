-- =============================================================================
-- 0005 · API privileges
-- Newer Supabase projects do NOT automatically let the Data API (anon / authenticated /
-- service_role) touch tables created in the SQL editor. Row Level Security (migration 0002)
-- still decides which ROWS each role may see; this file only grants table access.
-- Safe to run more than once.
-- =============================================================================
grant usage on schema public to anon, authenticated, service_role;

-- Public visitors: read-only access to publicly readable tables (RLS limits to published/active rows).
grant select on public.articles, public.categories, public.authors, public.tags, public.media,
               public.article_tags, public.advertisements, public.site_settings, public.redirects to anon;

-- Signed-in users and the server: full table access, gated by RLS policies (service_role bypasses RLS).
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

-- Functions used by policies and the site.
grant execute on function public.current_user_role(), public.is_staff(), public.is_editor(), public.is_admin()
  to anon, authenticated, service_role;
grant execute on function public.increment_article_views(uuid) to anon, authenticated;
revoke all on function public.publish_due_articles() from public, anon, authenticated;
grant execute on function public.publish_due_articles() to service_role;
