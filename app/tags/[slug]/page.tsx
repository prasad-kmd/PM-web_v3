import type { Metadata } from "next";
import { TaxonomyTermPage } from "@/components/notion/TaxonomyPages";
import {
  taxonomyStaticParams,
  taxonomyTermMetadata,
  type TaxonomyTermParams,
} from "@/lib/taxonomy-route";

export const revalidate = 3600;
export const dynamicParams = true;

export function generateStaticParams() {
  return taxonomyStaticParams("tags");
}

export function generateMetadata({
  params,
}: {
  params: TaxonomyTermParams;
}): Promise<Metadata> {
  return taxonomyTermMetadata("tags", params);
}

export default async function Page({ params }: { params: TaxonomyTermParams }) {
  const { slug } = await params;
  return <TaxonomyTermPage kind="tags" slug={slug} />;
}
