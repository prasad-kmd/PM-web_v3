import type { Metadata } from "next";
import { ContentDetailPage } from "@/components/notion/ContentDetailPage";
import {
  collectionDetailMetadata,
  collectionStaticParams,
  type CollectionDetailParams,
} from "@/lib/collection-route";

export const revalidate = 3600;
export const dynamicParams = true;

export function generateStaticParams() {
  return collectionStaticParams("glossary");
}

export function generateMetadata({
  params,
}: {
  params: CollectionDetailParams;
}): Promise<Metadata> {
  return collectionDetailMetadata("glossary", params);
}

export default async function Page({
  params,
}: {
  params: CollectionDetailParams;
}) {
  const { slug } = await params;
  return <ContentDetailPage type="glossary" slug={slug} />;
}
