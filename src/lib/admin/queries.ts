import "server-only";
import type { StaffContext } from "@/lib/admin/auth";
import type { Article, Author, Category } from "@/types/db";

export async function listCategories(ctx: StaffContext): Promise<Category[]> {
  const { data } = await ctx.supabase.from("categories").select("*").order("sort_order").order("name");
  return (data ?? []) as Category[];
}
export async function listAuthors(ctx: StaffContext, onlyActive = true): Promise<Author[]> {
  let q = ctx.supabase.from("authors").select("*").order("name");
  if (onlyActive) q = q.eq("is_active", true);
  const { data } = await q;
  return (data ?? []) as Author[];
}
export async function allTagNames(ctx: StaffContext): Promise<string[]> {
  const { data } = await ctx.supabase.from("tags").select("name").order("name").limit(500);
  return (data ?? []).map((t) => t.name as string);
}
export async function getArticleForEdit(ctx: StaffContext, id: string): Promise<{ article: Article; tags: string[] } | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await ctx.supabase.from("articles").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  const { data: t } = await ctx.supabase.from("article_tags").select("tag:tags(name)").eq("article_id", id);
  const tags = ((t ?? []) as unknown as { tag: { name: string } | null }[]).map((r) => r.tag?.name).filter(Boolean) as string[];
  return { article: data as Article, tags };
}
export async function countByStatus(ctx: StaffContext): Promise<Record<string, number>> {
  const statuses = ["draft", "in_review", "scheduled", "published", "archived"];
  const results = await Promise.all(statuses.map((s) => {
    const q = ctx.supabase.from("articles").select("id", { count: "exact", head: true }).eq("status", s);
    return ctx.role === "writer" ? q.eq("created_by", ctx.user.id) : q;
  }));
  return Object.fromEntries(statuses.map((s, i) => [s, results[i].count ?? 0]));
}
