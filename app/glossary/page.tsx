import type { Metadata } from "next";
import { ContentIndexPage } from "@/components/notion/ContentIndexPage";
import type { ListingSearchParams } from "@/lib/content-listing";
import { collectionMetadata } from "@/lib/collection-route";

export const revalidate = 3600;

export function generateMetadata(): Metadata {
  return collectionMetadata("glossary");
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<ListingSearchParams>;
}) {
  return <ContentIndexPage type="glossary" searchParams={await searchParams} />;
}
