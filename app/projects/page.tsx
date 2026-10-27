import type { Metadata } from "next";
import { ContentIndexPage } from "@/components/notion/ContentIndexPage";
import type { ListingSearchParams } from "@/lib/content-listing";
import { collectionMetadata } from "@/lib/collection-route";

export const revalidate = 3600;

export function generateMetadata(): Metadata {
  return collectionMetadata("projects");
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<ListingSearchParams>;
}) {
  return <ContentIndexPage type="projects" searchParams={await searchParams} />;
}
