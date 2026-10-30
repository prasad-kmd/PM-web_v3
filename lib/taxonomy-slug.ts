import { slugify } from "./slugify";

/** Global, cross-collection browse facets. Notion's `Technical` values are
 * browsed as tags (they deep-link into `/tags/...`) but keep their own
 * labelled group on entry pages. See `components/notion/TaxonomyChips`. */
export const TAXONOMY_KINDS = ["categories", "tags"] as const;
export type TaxonomyKind = (typeof TAXONOMY_KINDS)[number];

/** Slug for a category/tag label, or "" for a label with no URL-safe text. */
export function taxonomySlug(label: string): string {
  return slugify(label);
}

/** `/categories/<slug>` or `/tags/<slug>`, or null when the label has no slug. */
export function taxonomyHref(kind: TaxonomyKind, label: string): string | null {
  const slug = taxonomySlug(label);
  return slug ? `/${kind}/${encodeURIComponent(slug)}` : null;
}
