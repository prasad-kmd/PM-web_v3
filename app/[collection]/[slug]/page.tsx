import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentDetailPage } from "@/components/notion/ContentDetailPage";
import {
  CONTENT_TYPES,
  getContentIndex,
  type ContentType,
} from "@/lib/notion-cms";
import { getContentMetadata } from "@/lib/content-metadata";

export const revalidate = 3600;
export const dynamicParams = true;
type Props = { params: Promise<{ collection: string; slug: string }> };
function collectionType(value: string): ContentType | null {
  return CONTENT_TYPES.includes(value as ContentType)
    ? (value as ContentType)
    : null;
}
export async function generateStaticParams({
  params,
}: {
  params: { collection: string };
}) {
  const type = collectionType(params.collection);
  if (!type) return [];
  const index = await getContentIndex(type);
  return index.items.map((item) => ({ slug: item.slug }));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { collection, slug } = await params;
  const type = collectionType(collection);
  if (!type) return { title: "Not found" };
  const result = await getContentIndex(type);
  const item = result.items.find((entry) => entry.slug === slug);
  return item ? getContentMetadata(item, type) : { title: "Entry unavailable" };
}
export default async function DetailPage({ params }: Props) {
  const { collection, slug } = await params;
  const type = collectionType(collection);
  if (!type) notFound();
  return <ContentDetailPage type={type} slug={slug} />;
}
