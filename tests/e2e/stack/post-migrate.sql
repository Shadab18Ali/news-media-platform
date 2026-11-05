-- mimic Supabase's default grants (anon/authenticated get table privileges; RLS does the gating)
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated;
grant execute on function public.publish_due_articles() to service_role;
revoke all on public.newsletter_subscribers, public.contact_messages, public.activity_log, public.publish_logs, public.article_revisions, public.profiles from anon;
revoke insert, update, delete on public.articles, public.categories, public.authors, public.tags, public.media, public.article_tags, public.advertisements, public.site_settings, public.redirects from anon;
revoke all on function public.publish_due_articles() from public, anon, authenticated;
-- test accounts (password for all: Passw0rd!test)
insert into auth.users (id, email, encrypted_password) values
  ('00000000-0000-0000-0000-0000000000a1','admin@example.test', crypt('Passw0rd!test', gen_salt('bf'))),
  ('00000000-0000-0000-0000-0000000000e1','editor@example.test', crypt('Passw0rd!test', gen_salt('bf'))),
  ('00000000-0000-0000-0000-0000000000b2','writer@example.test', crypt('Passw0rd!test', gen_salt('bf'))),
  ('00000000-0000-0000-0000-0000000000c3','reader@example.test', crypt('Passw0rd!test', gen_salt('bf')));
update public.profiles set role='admin' where id='00000000-0000-0000-0000-0000000000a1';
update public.profiles set role='editor' where id='00000000-0000-0000-0000-0000000000e1';
update public.profiles set role='writer' where id='00000000-0000-0000-0000-0000000000b2';
