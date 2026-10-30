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
  return taxonomyStaticParams("categories");
}

export function generateMetadata({
  params,
}: {
  params: TaxonomyTermParams;
}): Promise<Metadata> {
  return taxonomyTermMetadata("categories", params);
}

export default async function Page({ params }: { params: TaxonomyTermParams }) {
  const { slug } = await params;
  return <TaxonomyTermPage kind="categories" slug={slug} />;
}
