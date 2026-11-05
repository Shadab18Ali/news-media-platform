-- =============================================================================
-- 0001 · Core schema
-- News & blogging platform. Run migrations in filename order.
-- =============================================================================

-- ---------- helpers ----------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- profiles ---------------------------------------------------------
-- One row per auth user. New users are ALWAYS 'reader' (no dashboard access).
-- Promote staff manually (see DATABASE_SETUP.md).
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  avatar_url  text,
  role        text not null default 'reader' check (role in ('reader','writer','editor','admin')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Role helpers (security definer so RLS policies can call them without recursion)
create or replace function public.current_user_role()
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'reader')
$$;
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_user_role() in ('writer','editor','admin')
$$;
create or replace function public.is_editor()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_user_role() in ('editor','admin')
$$;
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_user_role() = 'admin'
$$;

-- ---------- authors ----------------------------------------------------------
create table public.authors (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid references public.profiles(id) on delete set null,
  name        text not null check (char_length(name) between 2 and 120),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  job_title   text,
  bio         text check (bio is null or char_length(bio) <= 3000),
  avatar_url  text,
  email       text,
  social      jsonb not null default '{}'::jsonb,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger authors_updated_at before update on public.authors
  for each row execute function public.set_updated_at();

-- ---------- categories -------------------------------------------------------
create table public.categories (
  id              uuid primary key default gen_random_uuid(),
  name            text not null check (char_length(name) between 2 and 80),
  slug            text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description     text check (description is null or char_length(description) <= 1000),
  image_url       text,
  image_alt       text,
  sort_order      integer not null default 100,
  show_in_nav     boolean not null default true,
  seo_title       text check (seo_title is null or char_length(seo_title) <= 120),
  seo_description text check (seo_description is null or char_length(seo_description) <= 320),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

-- ---------- tags -------------------------------------------------------------
create table public.tags (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 60),
  slug       text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  created_at timestamptz not null default now()
);

-- ---------- media ------------------------------------------------------------
create table public.media (
  id           uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  url          text not null,
  og_url       text,
  filename     text not null,
  alt_text     text,
  caption      text,
  mime_type    text not null,
  size_bytes   integer not null check (size_bytes > 0),
  width        integer,
  height       integer,
  uploaded_by  uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger media_updated_at before update on public.media
  for each row execute function public.set_updated_at();
create index media_created_idx on public.media (created_at desc);

-- ---------- articles ---------------------------------------------------------
create table public.articles (
  id                      uuid primary key default gen_random_uuid(),
  title                   text not null check (char_length(title) between 3 and 300),
  slug                    text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 200),
  excerpt                 text check (excerpt is null or char_length(excerpt) <= 600),
  content                 text not null default '',
  article_type            text not null default 'article' check (article_type in ('article','news','sponsored','affiliate')),
  status                  text not null default 'draft' check (status in ('draft','in_review','scheduled','published','archived')),
  published_at            timestamptz,
  scheduled_for           timestamptz,
  category_id             uuid references public.categories(id) on delete restrict,
  author_id               uuid references public.authors(id) on delete set null,
  created_by              uuid references public.profiles(id) on delete set null,
  updated_by              uuid references public.profiles(id) on delete set null,
  language                text not null default 'en' check (language ~ '^[a-z]{2}(-[A-Za-z]{2,4})?$'),
  translation_group       uuid,

  featured_image_id       uuid references public.media(id) on delete set null,
  featured_image_url      text,
  featured_image_alt      text,
  featured_image_caption  text,
  og_image_url            text,

  seo_title               text check (seo_title is null or char_length(seo_title) <= 120),
  meta_description        text check (meta_description is null or char_length(meta_description) <= 320),
  focus_keyword           text check (focus_keyword is null or char_length(focus_keyword) <= 100),
  canonical_url           text check (canonical_url is null or canonical_url ~ '^https?://'),
  noindex                 boolean not null default false,

  is_featured             boolean not null default false,
  is_breaking             boolean not null default false,
  is_trending             boolean not null default false,
  reading_time_minutes    integer not null default 1 check (reading_time_minutes >= 1),
  view_count              bigint not null default 0,

  sponsor_name            text,
  has_affiliate_links     boolean not null default false,

  editorial_notes         text,
  sources                 jsonb not null default '[]'::jsonb,
  ai_generated            boolean not null default false,
  fact_checked            boolean not null default false,
  human_reviewed_by       uuid references public.profiles(id) on delete set null,
  human_reviewed_at       timestamptz,

  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(excerpt, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(focus_keyword, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'C')
  ) stored,

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  constraint articles_published_has_date check (status <> 'published' or published_at is not null),
  constraint articles_scheduled_has_time check (status <> 'scheduled' or scheduled_for is not null),
  -- Editorial safety rail: machine-assisted drafts can never go live (or be scheduled)
  -- until a human has reviewed them AND confirmed the facts.
  constraint articles_ai_requires_human_review check (
    not (ai_generated and status in ('published','scheduled')
         and (human_reviewed_at is null or fact_checked is not true))
  ),
  constraint articles_sponsor_label check (article_type <> 'sponsored' or sponsor_name is not null or status not in ('published','scheduled'))
);
create trigger articles_updated_at before update on public.articles
  for each row execute function public.set_updated_at();

create index articles_pub_idx        on public.articles (published_at desc) where status = 'published';
create index articles_cat_pub_idx    on public.articles (category_id, published_at desc) where status = 'published';
create index articles_author_pub_idx on public.articles (author_id, published_at desc) where status = 'published';
create index articles_status_idx     on public.articles (status, updated_at desc);
create index articles_sched_idx      on public.articles (scheduled_for) where status = 'scheduled';
create index articles_views_idx      on public.articles (view_count desc) where status = 'published';
create index articles_flags_idx      on public.articles (published_at desc) where status = 'published' and (is_featured or is_breaking or is_trending);
create index articles_search_idx     on public.articles using gin (search_vector);
create index articles_created_by_idx on public.articles (created_by);

-- ---------- article_tags -----------------------------------------------------
create table public.article_tags (
  article_id uuid not null references public.articles(id) on delete cascade,
  tag_id     uuid not null references public.tags(id) on delete cascade,
  primary key (article_id, tag_id)
);
create index article_tags_tag_idx on public.article_tags (tag_id);

-- ---------- article_revisions ------------------------------------------------
create table public.article_revisions (
  id              uuid primary key default gen_random_uuid(),
  article_id      uuid not null references public.articles(id) on delete cascade,
  revision_number integer not null,
  title           text not null,
  excerpt         text,
  content         text not null,
  snapshot        jsonb not null default '{}'::jsonb,
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  unique (article_id, revision_number)
);
create index article_revisions_article_idx on public.article_revisions (article_id, revision_number desc);

-- ---------- advertisements ---------------------------------------------------
create table public.advertisements (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 2 and 120),
  placement    text not null check (placement in
                 ('header','homepage','homepage_feed','article_top','article_middle','article_bottom','sidebar','footer')),
  ad_type      text not null default 'adsense' check (ad_type in ('adsense','custom_html','image')),
  adsense_slot text check (adsense_slot is null or adsense_slot ~ '^[0-9]{6,15}$'),
  custom_html  text,
  image_url    text,
  link_url     text check (link_url is null or link_url ~ '^https?://'),
  image_alt    text,
  sponsor_name text,
  is_active    boolean not null default false,
  priority     integer not null default 100,
  starts_at    timestamptz,
  ends_at      timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint advertisements_window check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create trigger advertisements_updated_at before update on public.advertisements
  for each row execute function public.set_updated_at();
create index advertisements_placement_idx on public.advertisements (placement) where is_active;

-- ---------- newsletter_subscribers ------------------------------------------
create table public.newsletter_subscribers (
  id                uuid primary key default gen_random_uuid(),
  email             text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  status            text not null default 'subscribed' check (status in ('subscribed','unsubscribed')),
  source            text,
  unsubscribe_token uuid not null default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  unsubscribed_at   timestamptz
);
create unique index newsletter_email_uidx on public.newsletter_subscribers (lower(email));

-- ---------- site_settings ----------------------------------------------------
-- Non-secret configuration only (brand, SEO, public integration IDs, ad toggles).
-- Secrets live in environment variables, never here: this table is publicly readable.
create table public.site_settings (
  key        text primary key check (key in ('brand','publisher','seo','integrations','ads','features')),
  value      jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);
create trigger site_settings_updated_at before update on public.site_settings
  for each row execute function public.set_updated_at();

-- ---------- redirects --------------------------------------------------------
create table public.redirects (
  id          uuid primary key default gen_random_uuid(),
  from_path   text not null unique check (from_path ~ '^/' and char_length(from_path) <= 500),
  to_path     text not null check (to_path ~ '^(/|https?://)' and char_length(to_path) <= 500),
  status_code integer not null default 301 check (status_code in (301,302,307,308)),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  constraint redirects_not_self check (from_path <> to_path)
);

-- ---------- logs / inbox -----------------------------------------------------
create table public.publish_logs (
  id         bigint generated always as identity primary key,
  article_id uuid,
  title      text,
  level      text not null default 'info' check (level in ('info','error')),
  message    text not null,
  created_at timestamptz not null default now()
);
create index publish_logs_created_idx on public.publish_logs (created_at desc);

create table public.activity_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid references public.profiles(id) on delete set null,
  actor_email text,
  action      text not null,
  entity_type text not null,
  entity_id   text,
  summary     text,
  created_at  timestamptz not null default now()
);
create index activity_log_created_idx on public.activity_log (created_at desc);

create table public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 120),
  email      text not null check (char_length(email) <= 254),
  subject    text check (subject is null or char_length(subject) <= 200),
  message    text not null check (char_length(message) between 10 and 5000),
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);
create index contact_messages_created_idx on public.contact_messages (created_at desc);

-- ---------- functions --------------------------------------------------------
-- Atomic scheduled publishing. Safe to call concurrently: rows are locked with
-- SKIP LOCKED and their status flips inside the same statement, so an article can
-- never be published twice. Every publish is logged.
create or replace function public.publish_due_articles()
returns table (id uuid, title text, slug text)
language plpgsql security definer set search_path = public as $$
begin
  return query
  with due as (
    select a.id from public.articles a
    where a.status = 'scheduled' and a.scheduled_for <= now()
    order by a.scheduled_for
    for update skip locked
  ),
  done as (
    update public.articles a
       set status = 'published',
           published_at = coalesce(a.scheduled_for, now()),
           scheduled_for = null
      from due where a.id = due.id
    returning a.id, a.title, a.slug
  ),
  logged as (
    insert into public.publish_logs (article_id, title, level, message)
    select d.id, d.title, 'info', 'Scheduled article published' from done d
  )
  select done.id, done.title, done.slug from done;
end $$;

create or replace function public.increment_article_views(p_article_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.articles set view_count = view_count + 1
  where id = p_article_id and status = 'published';
$$;

-- Defence in depth: only the service role may run the publisher.
revoke all on function public.publish_due_articles() from public, anon, authenticated;
grant execute on function public.publish_due_articles() to service_role;
grant execute on function public.increment_article_views(uuid) to anon, authenticated;
