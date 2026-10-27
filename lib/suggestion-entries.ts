import "server-only";
import { CONTENT_TYPES, getContentIndex } from "@/lib/notion-cms";
import type { SuggestionEntry } from "@/lib/suggestions";

/**
 * Lean list of every published entry for 404 suggestions. Indexes come
 * from the same cached Notion queries as the collection pages, so this
 * normally costs no extra API calls. Failures degrade to no suggestions.
 */
export async function getSuggestionEntries(): Promise<SuggestionEntry[]> {
  const results = await Promise.all(
    CONTENT_TYPES.map(async (type) => {
      try {
        const index = await getContentIndex(type);
        return index.items.map((item) => ({
          type,
          slug: item.slug,
          title: item.title,
          category: item.categories[0] ?? null,
          date: item.date,
        }));
      } catch {
        return [];
      }
    }),
  );
  return results.flat();
}
