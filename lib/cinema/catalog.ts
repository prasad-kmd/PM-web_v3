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

/** `@region` in a param value is replaced with the region saved in Settings. */
export const REGION_TOKEN = "@region";

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
  /** Tried when the primary spec comes back empty (merged or renamed ids). */
  fallbacks?: readonly CinemaDiscoverSpec[];
};

/** TMDB production companies / networks used below. */
const COMPANY = {
  marvelStudios: 420,
  dcFilms: 128064,
  dcStudios: 184898,
  hbo: 49,
  paramount: 4,
  a24: 41077,
  ghibli: 10342,
} as const;

/**
 * TMDB **watch provider** ids — a different namespace from companies/networks.
 * Verified against `/watch/providers/movie`: Netflix 8, Prime Video 9,
 * Disney+ 337, Max 1899, Apple TV+ 350 (Hulu 15, Paramount+ 2303|2616,
 * Peacock 386|387 are the next ones to add).
 */
export const CINEMA_SERVICE_PROVIDER_IDS = "8|9|337|1899|350";
export const CINEMA_SERVICE_LABELS =
  "Netflix · Prime Video · Disney+ · Max · Apple TV+";

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
    id: "mcu",
    label: "Marvel Cinematic Universe",
    blurb: "In release order, Infinity Saga to now",
    discover: {
      mediaType: "movie",
      sortBy: "primary_release_date.desc",
      params: {
        with_companies: COMPANY.marvelStudios,
        "vote_count.gte": 200,
      },
    },
    /* If Marvel Studios' page is ever restructured, fall back to its parent. */
    fallbacks: [
      {
        mediaType: "movie",
        sortBy: "primary_release_date.desc",
        params: { with_companies: 13252, "vote_count.gte": 200 },
      },
    ],
  },
  {
    id: "dc",
    label: "DC — DCEU & DCU",
    blurb: "DC Films, then DC Studios",
    discover: {
      mediaType: "movie",
      sortBy: "primary_release_date.desc",
      params: {
        with_companies: `${COMPANY.dcFilms}|${COMPANY.dcStudios}`,
        "vote_count.gte": 100,
      },
    },
    fallbacks: [
      {
        mediaType: "movie",
        sortBy: "primary_release_date.desc",
        params: { with_keywords: "9715", "vote_count.gte": 300 },
      },
    ],
  },
  {
    id: "hbo",
    label: "HBO prestige",
    blurb: "The network that kept the bar high",
    discover: {
      mediaType: "tv",
      sortBy: "vote_average.desc",
      params: {
        with_networks: COMPANY.hbo,
        "vote_count.gte": 250,
      },
    },
  },
  {
    id: "paramount",
    label: "Paramount",
    blurb: "The mountain, from classics to tentpoles",
    discover: {
      mediaType: "movie",
      sortBy: "popularity.desc",
      params: {
        with_companies: COMPANY.paramount,
        "vote_count.gte": 200,
      },
    },
  },
  {
    id: "a24",
    label: "A24 & friends",
    blurb: "Arthouse, on purpose",
    discover: {
      mediaType: "movie",
      sortBy: "vote_average.desc",
      params: {
        with_companies: COMPANY.a24,
        "vote_count.gte": 150,
      },
    },
  },
  {
    id: "ghibli",
    label: "Studio Ghibli",
    blurb: "Hand-drawn and unhurried",
    discover: {
      mediaType: "movie",
      sortBy: "vote_average.desc",
      params: {
        with_companies: COMPANY.ghibli,
        "vote_count.gte": 100,
      },
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
  {
    id: "your-services",
    label: "On your services",
    blurb: `${CINEMA_SERVICE_LABELS} — in your region`,
    discover: {
      mediaType: "movie",
      sortBy: "popularity.desc",
      params: {
        with_watch_providers: CINEMA_SERVICE_PROVIDER_IDS,
        watch_region: REGION_TOKEN,
        with_watch_monetization_types: "flatrate",
        "vote_count.gte": 50,
      },
    },
    /* Nothing streaming in a small region? Show what is streaming anywhere. */
    fallbacks: [
      {
        mediaType: "tv",
        sortBy: "popularity.desc",
        params: {
          with_watch_providers: CINEMA_SERVICE_PROVIDER_IDS,
          watch_region: REGION_TOKEN,
          with_watch_monetization_types: "flatrate",
        },
      },
    ],
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

/** Primary spec first, then any fallbacks — the order the API walks. */
export function collectionSpecs(
  collection: CinemaCollection,
): readonly CinemaDiscoverSpec[] {
  return [collection.discover, ...(collection.fallbacks ?? [])];
}

export function findMood(id: string): CinemaMood | null {
  return CINEMA_MOODS.find((item) => item.id === id) ?? null;
}

export function findHomeRow(id: string): CinemaHomeRow | null {
  return CINEMA_HOME_ROWS.find((item) => item.id === id) ?? null;
}
