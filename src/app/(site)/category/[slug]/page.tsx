import { CategoryListing, categoryMetadata } from "./listing";

export const revalidate = 300; // must be a literal; mirrors SITE_CONFIG.revalidateSeconds
type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return [];
}
export async function generateMetadata({ params }: Props) {
  return categoryMetadata((await params).slug, 1);
}
export default async function CategoryPage({ params }: Props) {
  return <CategoryListing slug={(await params).slug} page={1} />;
}
