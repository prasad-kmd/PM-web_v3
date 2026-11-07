import type { CinemaMediaType } from "./types";

/**
 * Curated browse surface.
 *
 * Everything here is a literal so the home page has a stable, cacheable shape —
 * no randomisation, no per-request shuffling (the reference app re-sorted its
 * rows with `Math.random()` inside a server component, which is why its home
 * page flickered between navigations).
 *
 * TMDB genre ids are stable public constants; the numbers are spelled out so
 * nobody has to guess what `10765` means in a diff.
 */

const GENRE = {
  action: 28,
  adventure: 12,
  animation: 16,
  comedy: 35,
  crime: 80,
  documentary: 99,
  drama: 18,
  family: 10751,
  fantasy: 14,
  history: 36,
  horror: 27,
  mystery: 9648,
  romance: 10749,
  scifi: 878,
  thriller: 53,
  war: 10752,
  western: 37,
  tvActionAdventure: 10759,
  tvScifiFantasy: 10765,
} as const;

export type CinemaDiscoverSpec = {
  mediaType: CinemaMediaType;
  sortBy:
    | "popularity.desc"
    | "vote_average.desc"
    | "primary_release_date.desc"
    | "first_air_date.desc";
  params: Record<string, string | number>;
};

export type CinemaCollection = {
  id: string;
  label: string;
  blurb: string;
  discover: CinemaDiscoverSpec;
};

export type CinemaMood = {
  id: string;
  label: string;
  discover: CinemaDiscoverSpec;
};

/** Home rows, in render order. `kind` maps to `/api/cinema/list`. */
export type CinemaHomeRow = {
  id: string;
  label: string;
  kind:
    | "trending-movies"
    | "popular-movies"
    | "top-rated-movies"
    | "now-playing-movies"
    | "upcoming-movies"
    | "trending-tv"
    | "airing-today-tv";
  /** Rank rail shows 1…10 behind the posters. */
  ranked?: boolean;
};

export const CINEMA_HOME_ROWS: readonly CinemaHomeRow[] = [
  {
    id: "trending",
    label: "Trending this week",
    kind: "trending-movies",
    ranked: true,
  },
  { id: "in-cinemas", label: "In cinemas now", kind: "now-playing-movies" },
  { id: "top-rated", label: "Top rated films", kind: "top-rated-movies" },
  { id: "popular", label: "Popular right now", kind: "popular-movies" },
  { id: "tv-tonight", label: "Airing tonight", kind: "airing-today-tv" },
  { id: "upcoming", label: "Coming soon", kind: "upcoming-movies" },
] as const;

export const CINEMA_COLLECTIONS: readonly CinemaCollection[] = [
  {
    id: "neo-noir",
    label: "Neo-noir",
    blurb: "Crime with shadows",
    discover: {
      mediaType: "movie",
      sortBy: "vote_average.desc",
      params: {
        with_genres: `${GENRE.crime},${GENRE.thriller}`,
        "vote_count.gte": 400,
      },
    },
  },
  {
    id: "arthouse",
    label: "Arthouse",
    blurb: "A24 and company",
    discover: {
      mediaType: "movie",
      sortBy: "popularity.desc",
      params: { with_companies: 41077 },
    },
  },
  {
    id: "long-takes",
    label: "Long takes",
    blurb: "Two and a half hours plus",
    discover: {
      mediaType: "movie",
      sortBy: "vote_average.desc",
      params: { "with_runtime.gte": 150, "vote_count.gte": 500 },
    },
  },
  {
    id: "sri-lanka",
    label: "Sri Lankan cinema",
    blurb: "Made at home",
    discover: {
      mediaType: "movie",
      sortBy: "popularity.desc",
      params: { with_origin_country: "LK" },
    },
  },
  {
    id: "cozy-tv",
    label: "Cozy series",
    blurb: "Comfort watching",
    discover: {
      mediaType: "tv",
      sortBy: "popularity.desc",
      params: { with_genres: `${GENRE.comedy},${GENRE.family}` },
    },
  },
  {
    id: "deep-space",
    label: "Deep space",
    blurb: "Beyond the atmosphere",
    discover: {
      mediaType: "movie",
      sortBy: "vote_average.desc",
      params: {
        with_genres: `${GENRE.scifi},${GENRE.adventure}`,
        "vote_count.gte": 300,
      },
    },
  },
] as const;

export const CINEMA_MOODS: readonly CinemaMood[] = [
  {
    id: "slow-burn",
    label: "Slow burn",
    discover: {
      mediaType: "movie",
      sortBy: "vote_average.desc",
      params: { with_genres: GENRE.thriller, "vote_count.gte": 800 },
    },
  },
  {
    id: "short",
    label: "Under 100 min",
    discover: {
      mediaType: "movie",
      sortBy: "popularity.desc",
      params: { "with_runtime.lte": 100 },
    },
  },
  {
    id: "feel-good",
    label: "Feel good",
    discover: {
      mediaType: "movie",
      sortBy: "popularity.desc",
      params: { with_genres: GENRE.comedy, "vote_average.gte": 6.8 },
    },
  },
  {
    id: "nineties",
    label: "1990s",
    discover: {
      mediaType: "movie",
      sortBy: "vote_average.desc",
      params: {
        "primary_release_date.gte": "1990-01-01",
        "primary_release_date.lte": "1999-12-31",
        "vote_count.gte": 600,
      },
    },
  },
  {
    id: "anime",
    label: "Anime",
    discover: {
      mediaType: "tv",
      sortBy: "popularity.desc",
      params: { with_genres: GENRE.animation, with_origin_country: "JP" },
    },
  },
  {
    id: "true-crime",
    label: "True crime",
    discover: {
      mediaType: "tv",
      sortBy: "popularity.desc",
      params: { with_genres: `${GENRE.documentary},${GENRE.crime}` },
    },
  },
] as const;

export function findCollection(id: string): CinemaCollection | null {
  return CINEMA_COLLECTIONS.find((item) => item.id === id) ?? null;
}

export function findMood(id: string): CinemaMood | null {
  return CINEMA_MOODS.find((item) => item.id === id) ?? null;
}

export function findHomeRow(id: string): CinemaHomeRow | null {
  return CINEMA_HOME_ROWS.find((item) => item.id === id) ?? null;
}
