-- =============================================================================
-- 0004 · Seed: starter categories only. No sample articles are ever created.
-- Safe to re-run; edit/delete categories freely from /admin/categories.
-- =============================================================================
insert into public.categories (name, slug, description, sort_order, show_in_nav) values
  ('Technology', 'technology', 'Gadgets, software, internet and the technology shaping everyday life.', 10, true),
  ('AI', 'ai', 'Artificial intelligence news, research, tools and their impact on work and society.', 20, true),
  ('Business', 'business', 'Business, markets, economy and personal finance.', 30, true),
  ('Startups', 'startups', 'Funding, founders and the startup ecosystem in India and worldwide.', 40, true),
  ('India', 'india', 'The latest news from across India.', 50, true),
  ('World', 'world', 'International news and analysis.', 60, true),
  ('Trending', 'trending', 'Stories people are talking about right now.', 70, false),
  ('Education', 'education', 'Education, exams, skills and careers.', 80, true),
  ('Entertainment', 'entertainment', 'Movies, streaming, music and celebrity news.', 90, true),
  ('Lifestyle', 'lifestyle', 'Health, travel, food and living well.', 100, true)
on conflict (slug) do nothing;
