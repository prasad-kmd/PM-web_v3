import type { ContentType } from "@/lib/content-types";

export type SearchEntry = {
  id: string;
  type: ContentType;
  slug: string;
  title: string;
  description: string;
  categories: string[];
  tags: string[];
  date: string | null;
  readTime: number | null;
};

export type SearchIndexResponse = {
  entries: SearchEntry[];
  generatedAt: string;
};

function normalizeText(value: string): string {
  return value.toLowerCase().trim();
}

/**
 * Fast, dependency-free multi-token ranker for workspace command search.
 * Returns `0` when any query token fails to match across title, keywords,
 * collection, slug, or description; returns a positive score otherwise.
 */
export function scoreSearchCandidate(
  query: string,
  fields: {
    title: string;
    subtitle?: string;
    keywords?: string[];
    slug?: string;
    date?: string | null;
  },
): number {
  const normQuery = normalizeText(query);
  if (!normQuery) return 1;

  const tokens = normQuery.split(/\s+/).filter(Boolean);
  if (!tokens.length) return 1;

  const title = normalizeText(fields.title);
  const subtitle = normalizeText(fields.subtitle ?? "");
  const slug = normalizeText(fields.slug ?? "");
  const keywords = (fields.keywords ?? []).map(normalizeText).filter(Boolean);

  let score = 0;

  if (title === normQuery) {
    score += 140;
  } else if (title.startsWith(normQuery)) {
    score += 95;
  } else if (title.includes(` ${normQuery}`)) {
    score += 70;
  } else if (title.includes(normQuery)) {
    score += 45;
  }

  for (const token of tokens) {
    let tokenScore = 0;

    if (title === token) {
      tokenScore = 60;
    } else if (title.startsWith(token)) {
      tokenScore = 44;
    } else if (
      title.includes(` ${token}`) ||
      title.includes(`-${token}`) ||
      title.includes(`/${token}`)
    ) {
      tokenScore = 34;
    } else if (title.includes(token)) {
      tokenScore = 22;
    } else if (keywords.some((kw) => kw === token || kw.startsWith(token))) {
      tokenScore = 26;
    } else if (keywords.some((kw) => kw.includes(token))) {
      tokenScore = 16;
    } else if (slug.includes(token)) {
      tokenScore = 14;
    } else if (subtitle.includes(token)) {
      tokenScore = 10;
    }

    if (tokenScore === 0) {
      return 0;
    }
    score += tokenScore;
  }

  if (fields.date) {
    const ts = Date.parse(fields.date);
    if (Number.isFinite(ts)) {
      // Subtle 0..4 recency tie-breaker.
      const ageDays = Math.max(0, (Date.now() - ts) / 86_400_000);
      score += Math.max(0, 4 - Math.min(4, ageDays / 180));
    }
  }

  return score;
}
