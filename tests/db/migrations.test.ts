import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";

// Minimal stand-ins for the Supabase-provided schemas/roles so the real migrations can run.
const BOOTSTRAP = `
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth; create schema storage;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}'::jsonb);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
grant usage on schema public, auth, storage to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`;

let db: PGlite;
const ADMIN = "00000000-0000-0000-0000-0000000000a1";
const WRITER = "00000000-0000-0000-0000-0000000000b2";
const READER = "00000000-0000-0000-0000-0000000000c3";

async function as(role: "anon" | "authenticated" | "service_role", uid: string | null, fn: () => Promise<void>) {
  await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${uid ?? ""}', false);`);
  try { await fn(); } finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`); }
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(BOOTSTRAP);
  const dir = path.resolve(__dirname, "../../supabase/migrations");
  for (const f of fs.readdirSync(dir).sort()) {
    await db.exec(fs.readFileSync(path.join(dir, f), "utf8"));
  }
  // Grants must be applied after table creation in this stand-in environment.
  await db.exec(`grant all on all tables in schema public to anon, authenticated, service_role;
                 grant execute on all functions in schema public to anon, authenticated;
                 grant execute on function public.publish_due_articles() to service_role;`);
  // re-apply the revokes from the RLS migration that the blanket grant above overrode
  await db.exec(`revoke all on public.newsletter_subscribers, public.contact_messages, public.activity_log, public.publish_logs, public.article_revisions, public.profiles from anon;
                 revoke insert, update, delete on public.articles, public.categories, public.authors, public.tags, public.media, public.article_tags, public.advertisements, public.site_settings, public.redirects from anon;
                 revoke all on function public.publish_due_articles() from public, anon, authenticated;`);
  await db.exec(`insert into auth.users (id, email) values ('${ADMIN}','admin@x.test'),('${WRITER}','w@x.test'),('${READER}','r@x.test');
                 update public.profiles set role='admin' where id='${ADMIN}';
                 update public.profiles set role='writer' where id='${WRITER}';`);
});

describe("migrations", () => {
  it("creates profiles as reader by default and seeds categories", async () => {
    const p = await db.query<{ role: string }>(`select role from public.profiles where id='${READER}'`);
    expect(p.rows[0].role).toBe("reader");
    const c = await db.query<{ n: string }>(`select count(*)::int n from public.categories`);
    expect(Number(c.rows[0].n)).toBeGreaterThanOrEqual(10);
  });

  it("anonymous visitors only see published, already-live articles", async () => {
    await db.exec(`
      insert into public.articles (title, slug, status, published_at, created_by) values
        ('Live story', 'live-story', 'published', now() - interval '1 hour', '${ADMIN}'),
        ('Future story', 'future-story', 'published', now() + interval '1 day', '${ADMIN}'),
        ('Draft story', 'draft-story', 'draft', null, '${ADMIN}');`);
    await as("anon", null, async () => {
      const r = await db.query<{ slug: string }>(`select slug from public.articles order by slug`);
      expect(r.rows.map((x) => x.slug)).toEqual(["live-story"]);
    });
  });

  it("anonymous visitors cannot read subscribers, messages or write content", async () => {
    await as("anon", null, async () => {
      await expect(db.query(`select * from public.newsletter_subscribers`)).rejects.toThrow();
      await expect(db.query(`insert into public.categories (name, slug) values ('Hack','hack')`)).rejects.toThrow();
      await expect(db.query(`update public.articles set title='pwned'`)).rejects.toThrow();
    });
  });

  it("readers cannot self-promote to admin", async () => {
    await as("authenticated", READER, async () => {
      await expect(db.query(`update public.profiles set role='admin' where id='${READER}'`)).rejects.toThrow();
    });
    const p = await db.query<{ role: string }>(`select role from public.profiles where id='${READER}'`);
    expect(p.rows[0].role).toBe("reader");
  });

  it("writers can create drafts but not publish, and cannot see others' drafts", async () => {
    await as("authenticated", WRITER, async () => {
      await db.query(`insert into public.articles (title, slug, status, created_by) values ('My draft','my-draft','draft','${WRITER}')`);
      await expect(db.query(
        `insert into public.articles (title, slug, status, published_at, created_by) values ('Sneaky','sneaky','published', now(), '${WRITER}')`
      )).rejects.toThrow();
      const r = await db.query<{ slug: string }>(`select slug from public.articles where status <> 'published'`);
      expect(r.rows.map((x) => x.slug)).toEqual(["my-draft"]);
    });
  });

  it("admins can manage everything and settings are admin-only for writes", async () => {
    await as("authenticated", ADMIN, async () => {
      await db.query(`insert into public.site_settings (key, value) values ('brand', '{"name":"Test"}')`);
    });
    await as("authenticated", WRITER, async () => {
      const upd = await db.query(`update public.site_settings set value='{}' where key='brand' returning key`);
      expect(upd.rows.length).toBe(0);
    });
  });

  it("machine-assisted drafts cannot be published without human review and fact check", async () => {
    await expect(db.query(
      `insert into public.articles (title, slug, status, published_at, ai_generated) values ('Bot story','bot-story','published', now(), true)`
    )).rejects.toThrow();
    await db.query(
      `insert into public.articles (title, slug, status, published_at, ai_generated, fact_checked, human_reviewed_at, human_reviewed_by)
       values ('Reviewed bot story','reviewed-bot-story','published', now(), true, true, now(), '${ADMIN}')`);
  });

  it("scheduled publishing is atomic and idempotent, and only the service role may run it", async () => {
    await db.exec(`insert into public.articles (title, slug, status, scheduled_for) values
      ('Due one','due-one','scheduled', now() - interval '5 minutes'),
      ('Due two','due-two','scheduled', now() - interval '1 minute'),
      ('Not yet','not-yet','scheduled', now() + interval '2 hours')`);
    await as("anon", null, async () => {
      await expect(db.query(`select * from public.publish_due_articles()`)).rejects.toThrow();
    });
    await as("authenticated", ADMIN, async () => {
      await expect(db.query(`select * from public.publish_due_articles()`)).rejects.toThrow();
    });
    let first: string[] = [];
    await as("service_role", null, async () => {
      first = (await db.query<{ slug: string }>(`select slug from public.publish_due_articles()`)).rows.map((r) => r.slug);
      const second = await db.query(`select * from public.publish_due_articles()`);
      expect(second.rows.length).toBe(0);
    });
    expect(first.sort()).toEqual(["due-one", "due-two"]);
    const notYet = await db.query<{ status: string }>(`select status from public.articles where slug='not-yet'`);
    expect(notYet.rows[0].status).toBe("scheduled");
    const logs = await db.query<{ n: number }>(`select count(*)::int n from public.publish_logs where level='info'`);
    expect(logs.rows[0].n).toBe(2);
  });

  it("full-text search finds published content", async () => {
    await db.exec(`insert into public.articles (title, slug, status, published_at, content) values
      ('Quantum chips arrive','quantum-chips','published', now() - interval '1 hour','<p>New processors</p>')`);
    const r = await db.query<{ slug: string }>(
      `select slug from public.articles where search_vector @@ websearch_to_tsquery('english','quantum')`);
    expect(r.rows.map((x) => x.slug)).toContain("quantum-chips");
  });
});
