import type { Metadata } from "next";
import { TaxonomyIndexPage } from "@/components/notion/TaxonomyPages";
import { taxonomyIndexMetadata } from "@/lib/taxonomy-route";

export const revalidate = 3600;

export function generateMetadata(): Metadata {
  return taxonomyIndexMetadata("categories");
}

export default function Page() {
  return <TaxonomyIndexPage kind="categories" />;
}
