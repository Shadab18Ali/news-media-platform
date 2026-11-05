import { getArticlesByCategory, getCategories, getFlaggedArticles, getLatestArticles, getMostRead } from "./queries";
import type { ArticleCardData, Category } from "@/types/db";

export const HOME_SECTION_SLUGS = ["technology", "ai", "business", "india", "world", "entertainment"] as const;

export interface HomeData {
  breaking: ArticleCardData[];
  hero: ArticleCardData | null;
  heroSide: ArticleCardData[];
  secondary: ArticleCardData[];
  feed: ArticleCardData[];
  trending: ArticleCardData[];
  mostRead: ArticleCardData[];
  sections: { category: Category; articles: ArticleCardData[] }[];
  hasContent: boolean;
}

/** Pure composition of the homepage from raw lists (unit-tested). */
export function composeHome(input: {
  latest: ArticleCardData[]; featured: ArticleCardData[]; breaking: ArticleCardData[]; trending: ArticleCardData[]; mostRead: ArticleCardData[];
}): Omit<HomeData, "sections"> {
  const used = new Set<string>();
  const take = (list: ArticleCardData[], n: number) => {
    const out: ArticleCardData[] = [];
    for (const a of list) {
      if (out.length >= n) break;
      if (!used.has(a.id)) { used.add(a.id); out.push(a); }
    }
    return out;
  };
  const pool = [...input.featured, ...input.latest];
  const [hero = null] = take(pool, 1);
  const heroSide = take(pool, 4);
  const secondary = take(input.latest, 4);
  const feed = take(input.latest, 8);
  return {
    breaking: input.breaking,
    hero, heroSide, secondary, feed,
    trending: input.trending.slice(0, 5),
    mostRead: input.mostRead,
    hasContent: input.latest.length > 0,
  };
}

export async function getHomeData(): Promise<HomeData> {
  const [categories, latest, featured, breaking, trendingFlag, mostRead] = await Promise.all([
    getCategories(),
    getLatestArticles(30),
    getFlaggedArticles("is_featured", 5),
    getFlaggedArticles("is_breaking", 5),
    getFlaggedArticles("is_trending", 5),
    getMostRead(5),
  ]);
  const base = composeHome({ latest, featured, breaking, trending: trendingFlag.length ? trendingFlag : latest.slice(0, 5), mostRead });

  const wanted = HOME_SECTION_SLUGS.map((s) => categories.find((c) => c.slug === s)).filter(Boolean) as Category[];
  const sections = (
    await Promise.all(wanted.map(async (category) => ({ category, articles: await getArticlesByCategory(category.id, 4) })))
  ).filter((s) => s.articles.length > 0);

  return { ...base, sections };
}
