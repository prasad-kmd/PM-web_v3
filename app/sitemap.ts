import type { MetadataRoute } from "next";
import { CONTENT_TYPES, getContentIndex } from "@/lib/notion-cms";
import { LEGAL_LAST_UPDATED_ISO, LEGAL_ROUTES } from "@/lib/legal";
import { getSiteUrl } from "@/lib/site";
import { TAXONOMY_INDEX_MIN_ITEMS, getTaxonomyIndex } from "@/lib/taxonomy";
export const revalidate = 3600;
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const [indexes, taxonomy] = await Promise.all([
    Promise.all(CONTENT_TYPES.map((type) => getContentIndex(type))),
    getTaxonomyIndex(),
  ]);
  const staticPaths: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/resume`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/contact`, changeFrequency: "monthly", priority: 0.5 },
    ...CONTENT_TYPES.map((type) => ({
      url: `${base}/${type}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    { url: `${base}/categories`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/tags`, changeFrequency: "weekly", priority: 0.5 },
    ...LEGAL_ROUTES.map((route) => ({
      url: `${base}${route}`,
      lastModified: new Date(LEGAL_LAST_UPDATED_ISO),
      changeFrequency: "yearly" as const,
      priority: route === "/legal" ? 0.4 : 0.3,
    })),
  ];
  return [
    ...staticPaths,
    // Only terms with enough entries to be a useful landing page; singleton
    // term pages stay reachable from entries but out of the sitemap/index.
    ...(["categories", "tags"] as const).flatMap((kind) =>
      taxonomy.terms[kind]
        .filter((term) => term.count >= TAXONOMY_INDEX_MIN_ITEMS)
        .map((term) => {
          const time = Date.parse(term.lastModified || "");
          return {
            url: `${base}/${kind}/${encodeURIComponent(term.slug)}`,
            ...(Number.isFinite(time) ? { lastModified: new Date(time) } : {}),
            changeFrequency: "monthly" as const,
            priority: 0.5,
          };
        }),
    ),
    ...indexes.flatMap((index) =>
      index.items.map((item) => {
        const time = Date.parse(item.lastEditedTime || item.date || "");
        return {
          url: `${base}/${item.type}/${encodeURIComponent(item.slug)}`,
          ...(Number.isFinite(time) ? { lastModified: new Date(time) } : {}),
          changeFrequency: "monthly" as const,
          priority: 0.6,
        };
      }),
    ),
  ];
}
