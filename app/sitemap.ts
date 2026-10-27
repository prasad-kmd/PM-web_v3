import type { MetadataRoute } from "next";
import { CONTENT_TYPES, getContentIndex } from "@/lib/notion-cms";
import { getSiteUrl } from "@/lib/site";
export const revalidate = 3600;
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const indexes = await Promise.all(
    CONTENT_TYPES.map((type) => getContentIndex(type)),
  );
  const staticPaths: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/resume`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/contact`, changeFrequency: "monthly", priority: 0.5 },
    ...CONTENT_TYPES.map((type) => ({
      url: `${base}/${type}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
  return [
    ...staticPaths,
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
