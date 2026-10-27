import type { ContentType } from "@/lib/content-types";
import { CONTENT_TYPES } from "@/lib/content-types";

/** Lean entry shipped to the 404 view for "Did you mean" suggestions. */
export type SuggestionEntry = {
  type: ContentType;
  slug: string;
  title: string;
  category: string | null;
  date: string | null;
};

function tokens(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1);
}

function bigrams(value: string) {
  const text = value.toLowerCase().replace(/[^a-z0-9]/g, "");
  const set = new Map<string, number>();
  for (let i = 0; i < text.length - 1; i++) {
    const pair = text.slice(i, i + 2);
    set.set(pair, (set.get(pair) ?? 0) + 1);
  }
  return set;
}

/** Sørensen–Dice coefficient over character bigrams (0…1). */
function dice(a: string, b: string) {
  const left = bigrams(a);
  const right = bigrams(b);
  let overlap = 0;
  let total = 0;
  left.forEach((count, pair) => {
    total += count;
    overlap += Math.min(count, right.get(pair) ?? 0);
  });
  right.forEach((count) => (total += count));
  return total ? (2 * overlap) / total : 0;
}

/**
 * Ranks published entries against a missing path. The final path segment
 * is compared to slugs (typos, renamed slugs) and titles (word overlap);
 * entries in the collection named by the first segment get a small boost.
 */
export function suggestEntries(
  pathname: string,
  entries: SuggestionEntry[],
  limit = 3,
): SuggestionEntry[] {
  const segments = pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    });
  const needle = (segments.at(-1) ?? "").slice(0, 200);
  if (!needle) return [];
  const section = CONTENT_TYPES.find((type) => type === segments[0]);
  const needleTokens = new Set(tokens(needle));
  return entries
    .map((entry) => {
      const entryTokens = new Set([
        ...tokens(entry.slug),
        ...tokens(entry.title),
      ]);
      let shared = 0;
      needleTokens.forEach((token) => {
        if (entryTokens.has(token)) shared += 1;
      });
      const overlap = needleTokens.size ? shared / needleTokens.size : 0;
      const score =
        Math.max(dice(needle, entry.slug), dice(needle, entry.title)) * 0.6 +
        overlap * 0.4 +
        (section && entry.type === section ? 0.08 : 0);
      return { entry, score };
    })
    .filter(({ score }) => score >= 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ entry }) => entry);
}
