import { notFound, permanentRedirect } from "next/navigation";
import { CategoryListing, categoryMetadata } from "../../listing";

export const revalidate = 300; // must be a literal; mirrors SITE_CONFIG.revalidateSeconds
type Props = { params: Promise<{ slug: string; page: string }> };

function parsePage(raw: string): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 10000 ? n : NaN;
}

export async function generateStaticParams() {
  return [];
}
export async function generateMetadata({ params }: Props) {
  const { slug, page } = await params;
  const n = parsePage(page);
  return categoryMetadata(slug, Number.isNaN(n) ? 1 : n);
}
export default async function CategoryPagedPage({ params }: Props) {
  const { slug, page } = await params;
  const n = parsePage(page);
  if (Number.isNaN(n)) notFound();
  if (n === 1) permanentRedirect(`/category/${slug}`); // page 1 has a single canonical URL
  return <CategoryListing slug={slug} page={n} />;
}
