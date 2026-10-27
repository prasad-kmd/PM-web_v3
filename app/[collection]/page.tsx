import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentIndexPage } from "@/components/notion/ContentIndexPage";
import {
  CONTENT_META,
  CONTENT_TYPES,
  type ContentType,
} from "@/lib/notion-cms";
import type { ListingSearchParams } from "@/lib/content-listing";
import { getSiteUrl } from "@/lib/site";
import { ogImageUrl } from "@/lib/content-metadata";

export const revalidate = 3600;
type Props = {
  params: Promise<{ collection: string }>;
  searchParams: Promise<ListingSearchParams>;
};
function collectionType(value: string): ContentType | null {
  return CONTENT_TYPES.includes(value as ContentType)
    ? (value as ContentType)
    : null;
}
export function generateStaticParams() {
  return CONTENT_TYPES.map((collection) => ({ collection }));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const type = collectionType((await params).collection);
  if (!type) return { title: "Not found" };
  const meta = CONTENT_META[type];
  const url = `${getSiteUrl()}/${type}`;
  const image = ogImageUrl(meta.label, meta.description, type);
  return {
    title: meta.label,
    description: meta.description,
    alternates: { canonical: url },
    openGraph: {
      title: meta.label,
      description: meta.description,
      url,
      type: "website",
      images: [{ url: image, width: 1280, height: 720 }],
    },
    twitter: { card: "summary_large_image", images: [image] },
  };
}
export default async function CollectionPage({ params, searchParams }: Props) {
  const type = collectionType((await params).collection);
  if (!type) notFound();
  return <ContentIndexPage type={type} searchParams={await searchParams} />;
}
