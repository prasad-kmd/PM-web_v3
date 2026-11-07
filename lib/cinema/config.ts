/**
 * Cinema Studio — hard-coded configuration.
 *
 * This module is intentionally **env-free**: every value is a literal so it can
 * be imported from client components without leaking anything. Only
 * `lib/cinema/env.ts` (server-only) reads `process.env`.
 *
 * The studio deliberately exposes just three environment variables
 * (`TMDB_API_KEY`, `OMDB_API_KEY`, `NOTION_CINEMA_FAVORITES_ID`); everything
 * else — provider order, timeouts, page sizes, locale, cache windows — is
 * pinned here so behaviour can never drift between deploys.
 */

/** Registry id of the app inside the DesktopOS shell. */
export const CINEMA_APP_ID = "cinema" as const;

export const CINEMA_APP_TITLE = "Cinema Studio";
export const CINEMA_APP_KIND = "Private screening room";
export const CINEMA_APP_DESCRIPTION =
  "Browse films and series, resume playback, and keep a Notion-backed library";

/* -------------------------------------------------------------------------- */
/* Upstream APIs                                                              */
/* -------------------------------------------------------------------------- */

export const TMDB_API_BASE = "https://api.themoviedb.org/3";
export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

/** OMDb is HTTPS-only here; the reference app shipped an `http://` base. */
export const OMDB_API_BASE = "https://www.omdbapi.com/";

/** YTS is keyless, so it needs no environment variable. */
export const YTS_API_BASE = "https://movies-api.accel.li/api/v2";

/* -------------------------------------------------------------------------- */
/* Locale + cache                                                             */
/* -------------------------------------------------------------------------- */

export const CINEMA_LANGUAGE = "en-US";
export const CINEMA_REGION = "US";

/** Seconds. Route handlers pass these into `fetch(..., { next: { revalidate } })`. */
export const CINEMA_REVALIDATE = {
  home: 600,
  search: 60,
  title: 3600,
  person: 1800,
  player: 300,
  omdb: 86400,
  yts: 43200,
} as const;

/* -------------------------------------------------------------------------- */
/* Timeouts                                                                   */
/* -------------------------------------------------------------------------- */

export const CINEMA_UPSTREAM_TIMEOUT_MS = 8000;
export const CINEMA_OMDB_TIMEOUT_MS = 6000;
export const CINEMA_YTS_TIMEOUT_MS = 6000;
/** Reachability probe for a playback provider. Probes run in parallel and are
 *  cached for 5 minutes, so this is the worst case for a cold first open. */
export const CINEMA_PROVIDER_PROBE_TIMEOUT_MS = 2000;
/** Iframe load watchdog in the player stage (Phase 3). */
export const CINEMA_PLAYER_WATCHDOG_MS = 9000;

/* -------------------------------------------------------------------------- */
/* Paging + limits                                                            */
/* -------------------------------------------------------------------------- */

export const CINEMA_PAGE_SIZE = 20;
export const CINEMA_ROW_LIMIT = 18;
export const CINEMA_HERO_POOL_SIZE = 12;
export const CINEMA_FILMOGRAPHY_PAGE_SIZE = 30;
export const CINEMA_MAX_SEARCH_LENGTH = 120;
export const CINEMA_MAX_NOTES_LENGTH = 2000;

/* -------------------------------------------------------------------------- */
/* Playback providers — `vidsrc.to` first, then the reference mirrors          */
/* -------------------------------------------------------------------------- */

export type CinemaPlaybackProvider = {
  id: string;
  /** Short label for the in-player provider strip. */
  label: string;
  /** Origin used to build the embed URL. */
  baseUrl: string;
};

/**
 * Ordered fallback chain. The first entry is always attempted first; the rest
 * exist because these aggregator domains rotate and die without notice.
 * Every provider shares the same path grammar (see `lib/cinema/vidsrc.ts`).
 */
export const CINEMA_PLAYBACK_PROVIDERS: readonly CinemaPlaybackProvider[] = [
  { id: "vidsrc-to", label: "VidSrc", baseUrl: "https://vidsrc.to" },
  { id: "vidsrcme-su", label: "VidSrcMe", baseUrl: "https://vidsrcme.su" },
  {
    id: "vidsrc-embed-su",
    label: "VidSrc Embed",
    baseUrl: "https://vidsrc-embed.su",
  },
  {
    id: "vidsrc-embed-ru",
    label: "VidSrc Embed RU",
    baseUrl: "https://vidsrc-embed.ru",
  },
  { id: "vsrc-su", label: "VSrc", baseUrl: "https://vsrc.su" },
] as const;

export const CINEMA_PRIMARY_PROVIDER_ID = CINEMA_PLAYBACK_PROVIDERS[0].id;

/** Origins the CSP must allow in `frame-src`. Kept here so the policy and the
 *  provider chain can never disagree. */
export const CINEMA_PLAYER_ORIGINS: readonly string[] =
  CINEMA_PLAYBACK_PROVIDERS.map((provider) => provider.baseUrl);

/* -------------------------------------------------------------------------- */
/* In-window navigation                                                       */
/* -------------------------------------------------------------------------- */

export type CinemaViewId = "browse" | "search" | "library" | "settings";

export const CINEMA_VIEWS: readonly {
  id: CinemaViewId;
  label: string;
}[] = [
  { id: "browse", label: "Browse" },
  { id: "search", label: "Search" },
  { id: "library", label: "Library" },
  { id: "settings", label: "Settings" },
] as const;

/** Query-string keys that mirror in-window navigation onto `/cinema`. */
export const CINEMA_QUERY_KEYS = {
  view: "view",
  id: "id",
  type: "type",
  query: "q",
} as const;

/* -------------------------------------------------------------------------- */
/* Library                                                                    */
/* -------------------------------------------------------------------------- */

export const CINEMA_LIBRARY_STATUSES = [
  "Favorite",
  "Watchlist",
  "Watching",
  "Watched",
  "Dropped",
] as const;

export type CinemaLibraryStatus = (typeof CINEMA_LIBRARY_STATUSES)[number];

/** Title of the single row that stores app preferences in the library DB. */
export const CINEMA_PREFS_ROW_TITLE = "__cinema_prefs";

/** Version tag inside the `__kind` envelope written to Notion. */
export const CINEMA_NOTION_ENVELOPE_KIND = "cinema";
export const CINEMA_NOTION_ENVELOPE_VERSION = 1;

/* -------------------------------------------------------------------------- */
/* Image sizes                                                                */
/* -------------------------------------------------------------------------- */

export const TMDB_POSTER_SIZE = {
  tile: "w185",
  card: "w342",
  detail: "w500",
  original: "original",
} as const;

export const TMDB_BACKDROP_SIZE = {
  rail: "w780",
  hero: "w1280",
  original: "original",
} as const;

export const TMDB_PROFILE_SIZE = {
  rail: "w185",
  detail: "h632",
} as const;

/** `sizes` hints so `next/image` never downloads a full-size poster. */
export const TMDB_IMAGE_SIZES_ATTR = {
  posterTile: "(max-width: 640px) 96px, (max-width: 1100px) 116px, 132px",
  posterCard: "(max-width: 640px) 45vw, (max-width: 1100px) 30vw, 22vw",
  hero: "100vw",
  backdropRail: "(max-width: 640px) 70vw, 340px",
  profile: "72px",
} as const;
