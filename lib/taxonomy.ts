import "server-only";
import { cache } from "react";
import { CONTENT_TYPES, type ContentType } from "./content-types";
import { getContentIndex, type ContentItem } from "./notion-cms";
import { slugify } from "./slugify";
import type { TaxonomyKind } from "./taxonomy-slug";

export type { TaxonomyKind } from "./taxonomy-slug";

/** Terms with fewer published entries stay reachable and follow-able, but are
 * kept out of the sitemap and search index (thin landing pages). */
export const TAXONOMY_INDEX_MIN_ITEMS = 2;

export type TaxonomyTerm = {
  kind: TaxonomyKind;
  slug: string;
  /** Canonical display label (most frequent exact spelling in Notion). */
  label: string;
  /** Published entries carrying this term, newest first (glossary A–Z). */
  items: ContentItem[];
  count: number;
  countsByType: Partial<Record<ContentType, number>>;
  /** ISO timestamp of the most recently edited entry, for the sitemap. */
  lastModified: string | null;
};

export type TaxonomyIndex = {
  terms: Record<TaxonomyKind, TaxonomyTerm[]>;
  bySlug: Record<TaxonomyKind, Map<string, TaxonomyTerm>>;
  totalItems: number;
  /** At least one collection is connected to Notion. */
  configured: boolean;
  /** Every collection is connected and loaded without an error, so a
   * missing term is a genuine 404 rather than a partial index. */
  complete: boolean;
};

export const TAXONOMY_META: Record<
  TaxonomyKind,
  { label: string; singular: string; description: string }
> = {
  categories: {
    label: "Categories",
    singular: "Category",
    description:
      "Browse every project, post, article, tutorial, glossary term and story by its Notion category.",
  },
  tags: {
    label: "Tags",
    singular: "Tag",
    description:
      "Browse every project, post, article, tutorial, glossary term and story by tag and technical topic.",
  },
};

type TermBuilder = {
  kind: TaxonomyKind;
  slug: string;
  labelCounts: Map<string, number>;
  itemsById: Map<string, ContentItem>;
};

function labelsFor(item: ContentItem, kind: TaxonomyKind): string[] {
  // `Technical` is a browsable facet of the tags index: an entry tagged
  // Technical=“Next.js” is found at /tags/next-js alongside Tags=“Next.js”.
  return kind === "categories"
    ? item.categories
    : [...item.tags, ...item.technical];
}

function sortTermItems(items: ContentItem[]): ContentItem[] {
  return [...items].sort((a, b) => {
    if (a.type === "glossary" && b.type === "glossary") {
      return a.title.localeCompare(b.title, "en", { sensitivity: "base" });
    }
    const dateOrder =
      Date.parse(b.date || "1970-01-01") - Date.parse(a.date || "1970-01-01");
    return dateOrder || a.title.localeCompare(b.title);
  });
}

function finishTerm(builder: TermBuilder): TaxonomyTerm {
  const label =
    [...builder.labelCounts].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    )[0]?.[0] ?? builder.slug;
  const items = sortTermItems([...builder.itemsById.values()]);
  const countsByType: Partial<Record<ContentType, number>> = {};
  let lastModified: string | null = null;
  let lastTime = -Infinity;
  for (const item of items) {
    countsByType[item.type] = (countsByType[item.type] ?? 0) + 1;
    const time = Date.parse(item.lastEditedTime || item.date || "");
    if (Number.isFinite(time) && time > lastTime) {
      lastTime = time;
      lastModified = item.lastEditedTime || item.date;
    }
  }
  return {
    kind: builder.kind,
    slug: builder.slug,
    label,
    items,
    count: items.length,
    countsByType,
    lastModified,
  };
}

/**
 * Cross-collection category/tag index.
 *
 * Reuses the cached per-collection indexes (`getContentIndex` is React-cached
 * and ISR-cached for an hour upstream), so opening a taxonomy page costs no
 * extra Notion queries beyond the listings themselves. Labels that slugify
 * to the same value (“Control Systems” / “control systems”) are one term;
 * an entry listing both spellings is still counted once.
 */
export const getTaxonomyIndex = cache(async (): Promise<TaxonomyIndex> => {
  const indexes = await Promise.all(
    CONTENT_TYPES.map((type) => getContentIndex(type)),
  );
  const builders: Record<TaxonomyKind, Map<string, TermBuilder>> = {
    categories: new Map(),
    tags: new Map(),
  };
  let totalItems = 0;

  for (const index of indexes) {
    totalItems += index.items.length;
    for (const item of index.items) {
      for (const kind of ["categories", "tags"] as const) {
        const seenInItem = new Set<string>();
        for (const rawLabel of labelsFor(item, kind)) {
          const label = rawLabel.trim();
          const slug = slugify(label);
          if (!label || !slug || seenInItem.has(slug)) continue;
          seenInItem.add(slug);
          let builder = builders[kind].get(slug);
          if (!builder) {
            builder = {
              kind,
              slug,
              labelCounts: new Map(),
              itemsById: new Map(),
            };
            builders[kind].set(slug, builder);
          }
          builder.labelCounts.set(
            label,
            (builder.labelCounts.get(label) ?? 0) + 1,
          );
          builder.itemsById.set(`${item.type}:${item.id}`, item);
        }
      }
    }
  }

  const terms = {
    categories: [...builders.categories.values()]
      .map(finishTerm)
      .sort((a, b) =>
        a.label.localeCompare(b.label, "en", { sensitivity: "base" }),
      ),
    tags: [...builders.tags.values()]
      .map(finishTerm)
      .sort((a, b) =>
        a.label.localeCompare(b.label, "en", { sensitivity: "base" }),
      ),
  } satisfies Record<TaxonomyKind, TaxonomyTerm[]>;

  return {
    terms,
    bySlug: {
      categories: new Map(terms.categories.map((term) => [term.slug, term])),
      tags: new Map(terms.tags.map((term) => [term.slug, term])),
    },
    totalItems,
    configured: indexes.some((index) => index.configured),
    complete: indexes.every((index) => index.configured && !index.error),
  };
});

export async function getTaxonomyTerm(
  kind: TaxonomyKind,
  slug: string,
): Promise<{ term: TaxonomyTerm | null; index: TaxonomyIndex }> {
  const index = await getTaxonomyIndex();
  return { term: index.bySlug[kind].get(slugify(slug)) ?? null, index };
}
