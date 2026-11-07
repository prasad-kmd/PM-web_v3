import {
  CINEMA_TASTE_MIN_RATINGS,
  CINEMA_TASTE_GENRES,
  CINEMA_TASTE_VOTE_COUNT_GTE,
  CINEMA_TASTE_VOTE_AVERAGE_GTE,
} from "./config";
import type { CinemaDiscoverSpec } from "./catalog";
import type { CinemaLibraryEntry, CinemaTasteProfile } from "./types";

export function buildTasteProfile(
  entries: readonly CinemaLibraryEntry[],
): CinemaTasteProfile | null {
  const rated = entries.filter((e) => e.rating != null && e.rating > 0);
  if (rated.length < CINEMA_TASTE_MIN_RATINGS) return null;
  const scores = new Map<string, number>();
  const bonus: Record<string, number> = {
    Favorite: 0.35,
    Watching: 0.2,
    Watched: 0.15,
    Dropped: -0.4,
  };
  for (const e of rated) {
    const genres = [...new Set(e.genres.filter(Boolean))];
    const weight =
      ((e.rating! - 5.5) / 4.5 + (bonus[e.status] ?? 0)) /
      Math.sqrt(Math.max(1, genres.length));
    for (const g of genres) scores.set(g, (scores.get(g) ?? 0) + weight);
  }
  const seeds = [...rated].sort(
    (a, b) =>
      b.rating! - a.rating! ||
      b.updatedAt.localeCompare(a.updatedAt) ||
      a.titleKey.localeCompare(b.titleKey),
  );
  return {
    ratedCount: rated.length,
    confidence:
      rated.length >= 8 ? "high" : rated.length >= 4 ? "medium" : "low",
    mediaType: seeds[0].mediaType,
    seeds: seeds.slice(0, 3).map((e) => ({
      titleKey: e.titleKey,
      title: e.title,
      rating: e.rating!,
      year: e.year,
    })),
    genres: [...scores]
      .filter(([, w]) => w > 0)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, CINEMA_TASTE_GENRES)
      .map(([name, weight]) => ({ name, weight, tmdbId: null })),
  };
}
export function tasteReason(profile: CinemaTasteProfile): string {
  const seed = profile.seeds[0];
  return seed
    ? `Because you rated ${seed.title} ${seed.rating}/10`
    : "Based on your ratings";
}
export function tasteSpecs(
  profile: CinemaTasteProfile,
  genreIds: number[],
): CinemaDiscoverSpec[] {
  if (!genreIds.length) return [];
  const make = (joiner: string): CinemaDiscoverSpec => ({
    mediaType: profile.mediaType,
    sortBy: "vote_average.desc",
    params: {
      with_genres: genreIds.join(joiner),
      "vote_count.gte": CINEMA_TASTE_VOTE_COUNT_GTE,
      "vote_average.gte": CINEMA_TASTE_VOTE_AVERAGE_GTE,
    },
  });
  return genreIds.length > 1 ? [make(","), make("|")] : [make(",")];
}
