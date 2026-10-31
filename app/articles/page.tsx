import type { Metadata } from "next";
import { ContentIndexPage } from "@/components/notion/ContentIndexPage";
import { collectionMetadata } from "@/lib/collection-route";

export const revalidate = 3600;

export function generateMetadata(): Metadata {
  return collectionMetadata("articles");
}

export default function Page() {
  return <ContentIndexPage type="articles" />;
}
