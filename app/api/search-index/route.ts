import { NextResponse } from "next/server";
import { CONTENT_TYPES } from "@/lib/content-types";
import { getContentIndex } from "@/lib/notion-cms";
import type { SearchEntry, SearchIndexResponse } from "@/lib/search-score";

export const runtime = "nodejs";
export const revalidate = 3600;

export async function GET() {
  const indexes = await Promise.all(
    CONTENT_TYPES.map((type) => getContentIndex(type)),
  );

  const entries: SearchEntry[] = [];
  for (let i = 0; i < CONTENT_TYPES.length; i += 1) {
    const type = CONTENT_TYPES[i];
    for (const item of indexes[i].items) {
      entries.push({
        id: item.id,
        type,
        slug: item.slug,
        title: item.title,
        description: item.description.slice(0, 220),
        categories: item.categories.slice(0, 6),
        tags: [...item.tags, ...item.technical].slice(0, 8),
        date: item.date,
        readTime: item.readTime,
      });
    }
  }

  entries.sort((a, b) => {
    const ta = a.date ? Date.parse(a.date) : 0;
    const tb = b.date ? Date.parse(b.date) : 0;
    return (
      (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0) ||
      a.title.localeCompare(b.title)
    );
  });

  const payload: SearchIndexResponse = {
    entries,
    generatedAt: new Date().toISOString(),
  };

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
