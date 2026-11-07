import "server-only";

import {
  CINEMA_LANGUAGE,
  CINEMA_MAX_SEARCH_LENGTH,
  CINEMA_REVALIDATE,
  CINEMA_REGION,
  CINEMA_UPSTREAM_TIMEOUT_MS,
  TMDB_API_BASE,
} from "./config";
import type { CinemaDiscoverSpec } from "./catalog";
import { getTmdbAuth } from "./env";
import { fetchJson, parsePayload } from "./http";
import {
  TmdbPageSchema,
  TmdbPersonSchema,
  TmdbSeasonDetailSchema,
  TmdbTitleDetailSchema,
  cinemaFail,
  cinemaOk,
  titleKey,
  type CinemaEpisode,
  type CinemaFilmography,
  type CinemaFilmographyCredit,
  type CinemaMediaType,
  type CinemaPerson,
  type CinemaPersonSummary,
  type CinemaResult,
  type CinemaSearchResults,
  type CinemaSeasonSummary,
  type CinemaTitle,
  type CinemaTitleDetail,
  type TmdbMediaItem,
  type TmdbPerson,
  type TmdbTitleDetail,
} from "./types";

/* -------------------------------------------------------------------------- */
/* Transport                                                                  */
/* -------------------------------------------------------------------------- */

type QueryParams = Record<string, string | number | boolean | null | undefined>;

type Schema<T> = {
  safeParse: (
    input: unknown,
  ) => { success: true; data: T } | { success: false };
};

type TmdbRequestOptions = {
  revalidate?: number;
  tags?: readonly string[];
};

function buildUrl(path: string, params: QueryParams): string | null {
  const auth = getTmdbAuth();
  if (!auth) return null;

  const search = new URLSearchParams({
    language: CINEMA_LANGUAGE,
    region: CINEMA_REGION,
  });
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    search.set(key, String(value));
  }
  // A v3 key travels in the query string; a v4 read token is sent as a header.
  if (auth.kind === "key") search.set("api_key", auth.value);
  return `${TMDB_API_BASE}${path}?${search.toString()}`;
}

async function tmdbRequest<T>(
  path: string,
  schema: Schema<T>,
  label: string,
  params: QueryParams = {},
  options: TmdbRequestOptions = {},
): Promise<CinemaResult<T>> {
  const auth = getTmdbAuth();
  if (!auth) {
    return cinemaFail(
      "not_configured",
      "TMDB_API_KEY is not configured for this deployment.",
    );
  }

  const url = buildUrl(path, params);
  if (!url) {
    return cinemaFail("not_configured", "TMDB credentials are not readable.");
  }

  const response = await fetchJson({
    url,
    label,
    timeoutMs: CINEMA_UPSTREAM_TIMEOUT_MS,
    revalidate: options.revalidate ?? CINEMA_REVALIDATE.title,
    tags: options.tags,
    ...(auth.kind === "bearer"
      ? { headers: { Authorization: `Bearer ${auth.value}` } }
      : {}),
  });
  if (!response.ok) return response;

  return parsePayload(schema, response.data, label);
}

/* Image URL helpers live in `images.ts` so client components can use them
   without pulling this server-only module into the browser bundle. */
export { tmdbBackdropUrl, tmdbPosterUrl, tmdbProfileUrl } from "./images";

/* -------------------------------------------------------------------------- */
/* Normalisers                                                                */
/* -------------------------------------------------------------------------- */

function toYear(date: string | null | undefined): number | null {
  if (!date) return null;
  const match = /^(\d{4})/.exec(date);
  if (!match) return null;
  const year = Number.parseInt(match[1], 10);
  return Number.isFinite(year) && year > 1800 ? year : null;
}

function toRating(value: number | null | undefined): number {
  if (!value || !Number.isFinite(value)) return 0;
  return Math.round(value * 10) / 10;
}

function pickType(item: TmdbMediaItem): CinemaMediaType | null {
  if (item.media_type === "movie" || item.media_type === "tv") {
    return item.media_type;
  }
  // List endpoints omit `media_type`; the field shape disambiguates.
  if (item.title ?? item.release_date) return "movie";
  if (item.name ?? item.first_air_date) return "tv";
  return null;
}

/** Stable, non-null card model. Returns `null` for unusable rows. */
export function toCinemaTitle(
  item: TmdbMediaItem,
  forcedType?: CinemaMediaType,
): CinemaTitle | null {
  const mediaType = forcedType ?? pickType(item);
  if (!mediaType) return null;
  const title = (mediaType === "movie" ? item.title : item.name)?.trim();
  if (!title) return null;

  return {
    key: titleKey(mediaType, item.id),
    tmdbId: item.id,
    mediaType,
    title,
    year: toYear(
      mediaType === "movie" ? item.release_date : item.first_air_date,
    ),
    overview: item.overview?.trim() ?? "",
    posterPath: item.poster_path ?? null,
    backdropPath: item.backdrop_path ?? null,
    rating: toRating(item.vote_average),
    voteCount: item.vote_count ?? 0,
    popularity: item.popularity ?? 0,
    originalLanguage: item.original_language ?? null,
  };
}

function toTitles(
  items: readonly TmdbMediaItem[] | null | undefined,
  forcedType?: CinemaMediaType,
): CinemaTitle[] {
  const seen = new Set<string>();
  const output: CinemaTitle[] = [];
  for (const item of items ?? []) {
    const title = toCinemaTitle(item, forcedType);
    if (!title || seen.has(title.key)) continue;
    seen.add(title.key);
    output.push(title);
  }
  return output;
}

export function toCinemaTitleDetail(
  detail: TmdbTitleDetail,
  mediaType: CinemaMediaType,
): CinemaTitleDetail {
  const name = (
    mediaType === "movie"
      ? (detail.title ?? detail.original_title)
      : (detail.name ?? detail.original_name)
  )?.trim();

  const base: CinemaTitle = {
    key: titleKey(mediaType, detail.id),
    tmdbId: detail.id,
    mediaType,
    title: name || "Untitled",
    year: toYear(
      mediaType === "movie" ? detail.release_date : detail.first_air_date,
    ),
    overview: detail.overview?.trim() ?? "",
    posterPath: detail.poster_path ?? null,
    backdropPath: detail.backdrop_path ?? null,
    rating: toRating(detail.vote_average),
    voteCount: detail.vote_count ?? 0,
    popularity: detail.popularity ?? 0,
    originalLanguage: detail.original_language ?? null,
  };

  const cast = (detail.credits?.cast ?? [])
    .filter((member) => Boolean(member.name))
    .slice(0, 24)
    .map((member) => ({
      tmdbId: member.id,
      name: member.name,
      character: member.character?.trim() || null,
      profilePath: member.profile_path ?? null,
      order: member.order ?? 0,
    }));

  const crew = (detail.credits?.crew ?? [])
    .filter((member) => Boolean(member.name))
    .map((member) => ({
      tmdbId: member.id,
      name: member.name,
      job: member.job?.trim() || null,
      department: member.department?.trim() || null,
      profilePath: member.profile_path ?? null,
    }));

  const directors = Array.from(
    new Set(
      crew
        .filter((member) => member.job === "Director")
        .map((member) => member.name),
    ),
  );

  const videos = (detail.videos?.results ?? [])
    .filter((video) => video.site === "YouTube" && Boolean(video.key))
    .slice(0, 6)
    .map((video) => ({
      key: video.key as string,
      name: video.name?.trim() || "Trailer",
      site: video.site as string,
      type: video.type?.trim() || "Trailer",
      official: Boolean(video.official),
    }));

  const runtimeMinutes =
    mediaType === "movie"
      ? (detail.runtime ?? null)
      : (detail.episode_run_time?.[0] ?? null);

  const seasonSummaries: CinemaSeasonSummary[] = (detail.seasons ?? [])
    .filter((season) => typeof season.season_number === "number")
    .map((season) => {
      const seasonNumber = season.season_number as number;
      return {
        seasonNumber,
        name:
          season.name?.trim() ||
          (seasonNumber === 0 ? "Specials" : `Season ${seasonNumber}`),
        episodeCount: season.episode_count ?? 0,
        airDate: season.air_date ?? null,
        posterPath: season.poster_path ?? null,
        overview: season.overview?.trim() ?? "",
      };
    })
    .sort((a, b) => a.seasonNumber - b.seasonNumber);

  return {
    ...base,
    tagline: detail.tagline?.trim() ?? "",
    status: detail.status ?? null,
    runtimeMinutes:
      runtimeMinutes && runtimeMinutes > 0 ? runtimeMinutes : null,
    seasons:
      mediaType === "tv"
        ? (detail.number_of_seasons ?? seasonSummaries.length ?? null)
        : null,
    episodes: mediaType === "tv" ? (detail.number_of_episodes ?? null) : null,
    genres: (detail.genres ?? [])
      .map((genre) => genre.name?.trim() ?? "")
      .filter(Boolean),
    imdbId: detail.imdb_id?.trim() || null,
    countries: (detail.production_countries ?? [])
      .map((country) => country.iso_3166_1?.trim() ?? "")
      .filter(Boolean),
    languages: (detail.spoken_languages ?? [])
      .map((language) => language.english_name?.trim() ?? "")
      .filter(Boolean),
    directors,
    cast,
    crew,
    videos,
    recommendations: toTitles(
      detail.recommendations?.results ?? detail.similar?.results,
    ).slice(0, 12),
    collection: detail.belongs_to_collection?.name
      ? {
          id: detail.belongs_to_collection.id,
          name: detail.belongs_to_collection.name.trim(),
        }
      : null,
    seasonSummaries,
  };
}

export function toCinemaPerson(person: TmdbPerson): CinemaPerson {
  return {
    tmdbId: person.id,
    name: person.name,
    biography: person.biography?.trim() ?? "",
    birthday: person.birthday ?? null,
    deathday: person.deathday ?? null,
    placeOfBirth: person.place_of_birth ?? null,
    profilePath: person.profile_path ?? null,
    knownForDepartment: person.known_for_department ?? null,
    popularity: person.popularity ?? 0,
  };
}

/* -------------------------------------------------------------------------- */
/* List endpoints                                                             */
/* -------------------------------------------------------------------------- */

export type CinemaListKind =
  | "trending-movies"
  | "trending-tv"
  | "popular-movies"
  | "top-rated-movies"
  | "now-playing-movies"
  | "upcoming-movies"
  | "popular-tv"
  | "top-rated-tv"
  | "airing-today-tv";

const LIST_ROUTES: Record<
  CinemaListKind,
  { path: string; mediaType: CinemaMediaType }
> = {
  "trending-movies": { path: "/trending/movie/week", mediaType: "movie" },
  "trending-tv": { path: "/trending/tv/week", mediaType: "tv" },
  "popular-movies": { path: "/movie/popular", mediaType: "movie" },
  "top-rated-movies": { path: "/movie/top_rated", mediaType: "movie" },
  "now-playing-movies": { path: "/movie/now_playing", mediaType: "movie" },
  "upcoming-movies": { path: "/movie/upcoming", mediaType: "movie" },
  "popular-tv": { path: "/tv/popular", mediaType: "tv" },
  "top-rated-tv": { path: "/tv/top_rated", mediaType: "tv" },
  "airing-today-tv": { path: "/tv/airing_today", mediaType: "tv" },
};

export type CinemaListPage = {
  items: CinemaTitle[];
  page: number;
  totalPages: number;
  totalResults: number;
};

export async function fetchCinemaList(
  kind: CinemaListKind,
  page = 1,
  options: TmdbRequestOptions = {},
): Promise<CinemaResult<CinemaListPage>> {
  const route = LIST_ROUTES[kind];
  const response = await tmdbRequest(
    route.path,
    TmdbPageSchema,
    `TMDB ${kind}`,
    { page },
    {
      revalidate: options.revalidate ?? CINEMA_REVALIDATE.home,
      tags: options.tags,
    },
  );
  if (!response.ok) return response;

  return cinemaOk({
    items: toTitles(response.data.results, route.mediaType),
    page: response.data.page ?? page,
    totalPages: Math.min(response.data.total_pages ?? 1, 500),
    totalResults: response.data.total_results ?? 0,
  });
}

/**
 * Generic discover for curated rails, collections and moods.
 * The spec is a literal from `lib/cinema/catalog.ts`, so the query can never be
 * assembled from user input.
 */
export async function discoverCinema(
  spec: CinemaDiscoverSpec,
  page = 1,
  options: TmdbRequestOptions = {},
): Promise<CinemaResult<CinemaListPage>> {
  const path = spec.mediaType === "movie" ? "/discover/movie" : "/discover/tv";
  const response = await tmdbRequest(
    path,
    TmdbPageSchema,
    "TMDB discover",
    { ...spec.params, sort_by: spec.sortBy, page, include_adult: false },
    {
      revalidate: options.revalidate ?? CINEMA_REVALIDATE.home,
      tags: options.tags,
    },
  );
  if (!response.ok) return response;

  return cinemaOk({
    items: toTitles(response.data.results, spec.mediaType),
    page: response.data.page ?? page,
    totalPages: Math.min(response.data.total_pages ?? 1, 500),
    totalResults: response.data.total_results ?? 0,
  });
}

/* -------------------------------------------------------------------------- */
/* Search                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Unified search. The reference app dropped `person` results entirely on the
 * floor; here they become the entry point for the filmography view.
 */
export async function searchCinema(
  query: string,
  page = 1,
): Promise<CinemaResult<CinemaSearchResults>> {
  const trimmed = query.trim().slice(0, CINEMA_MAX_SEARCH_LENGTH);
  if (!trimmed) {
    return cinemaOk({
      titles: [],
      people: [],
      page: 1,
      totalPages: 1,
      totalResults: 0,
    });
  }

  const response = await tmdbRequest(
    "/search/multi",
    TmdbPageSchema,
    "TMDB search",
    { query: trimmed, page, include_adult: false },
    { revalidate: CINEMA_REVALIDATE.search },
  );
  if (!response.ok) return response;

  const titles: CinemaTitle[] = [];
  const people: CinemaPersonSummary[] = [];
  const seenTitles = new Set<string>();

  for (const item of response.data.results ?? []) {
    if (item.media_type === "person") {
      if (!item.name) continue;
      people.push({
        tmdbId: item.id,
        name: item.name,
        profilePath: item.profile_path ?? item.poster_path ?? null,
        knownForDepartment: null,
        popularity: item.popularity ?? 0,
      });
      continue;
    }
    const title = toCinemaTitle(item);
    if (!title || seenTitles.has(title.key)) continue;
    seenTitles.add(title.key);
    titles.push(title);
  }

  return cinemaOk({
    titles,
    people,
    page: response.data.page ?? page,
    totalPages: Math.min(response.data.total_pages ?? 1, 500),
    totalResults: response.data.total_results ?? 0,
  });
}

/* -------------------------------------------------------------------------- */
/* Detail                                                                     */
/* -------------------------------------------------------------------------- */

export async function fetchCinemaTitle(
  mediaType: CinemaMediaType,
  tmdbId: number,
  options: TmdbRequestOptions = {},
): Promise<CinemaResult<CinemaTitleDetail>> {
  if (!Number.isFinite(tmdbId) || tmdbId <= 0) {
    return cinemaFail("not_found", "Unknown title.");
  }
  const path = mediaType === "movie" ? `/movie/${tmdbId}` : `/tv/${tmdbId}`;

  const response = await tmdbRequest(
    path,
    TmdbTitleDetailSchema,
    `TMDB ${mediaType} ${tmdbId}`,
    { append_to_response: "credits,videos,recommendations,similar" },
    {
      revalidate: options.revalidate ?? CINEMA_REVALIDATE.title,
      tags: options.tags,
    },
  );
  if (!response.ok) return response;

  return cinemaOk(toCinemaTitleDetail(response.data, mediaType));
}

export async function fetchCinemaSeason(
  tmdbId: number,
  seasonNumber: number,
): Promise<CinemaResult<CinemaEpisode[]>> {
  const response = await tmdbRequest(
    `/tv/${tmdbId}/season/${seasonNumber}`,
    TmdbSeasonDetailSchema,
    "TMDB season",
    {},
    { revalidate: CINEMA_REVALIDATE.title },
  );
  if (!response.ok) return response;

  return cinemaOk(
    (response.data.episodes ?? []).map((episode) => ({
      episodeNumber: episode.episode_number,
      name: episode.name?.trim() || `Episode ${episode.episode_number}`,
      overview: episode.overview?.trim() ?? "",
      airDate: episode.air_date ?? null,
      runtime: episode.runtime ?? null,
      stillPath: episode.still_path ?? null,
      rating: toRating(episode.vote_average),
    })),
  );
}

/* -------------------------------------------------------------------------- */
/* People                                                                     */
/* -------------------------------------------------------------------------- */

const SELF_CHARACTER = /^(self|himself|herself|themselves)\b/i;

/**
 * Merge `combined_credits.cast` + `.crew` into one deduped filmography.
 *
 * Dedupe key is `(mediaType, tmdbId)` — an actor who also directed the same
 * title appears once, and the acting credit wins.
 */
export function toFilmography(person: TmdbPerson): CinemaFilmography {
  const credits = new Map<string, CinemaFilmographyCredit>();

  for (const entry of person.combined_credits?.cast ?? []) {
    if (entry.media_type !== "movie" && entry.media_type !== "tv") continue;
    const character = entry.character?.trim() || null;
    if (character && SELF_CHARACTER.test(character)) continue;
    const title = toCinemaTitle(
      {
        id: entry.id,
        media_type: entry.media_type,
        title: entry.title,
        name: entry.name,
        overview: entry.overview,
        poster_path: entry.poster_path,
        backdrop_path: entry.backdrop_path,
        release_date: entry.release_date,
        first_air_date: entry.first_air_date,
        vote_average: entry.vote_average,
        vote_count: entry.vote_count,
        popularity: entry.popularity,
        original_language: entry.original_language,
      },
      entry.media_type,
    );
    if (!title) continue;
    credits.set(title.key, {
      ...title,
      character,
      job: null,
      department: "Acting",
      creditKind: "cast",
    });
  }

  for (const entry of person.combined_credits?.crew ?? []) {
    if (entry.media_type !== "movie" && entry.media_type !== "tv") continue;
    const title = toCinemaTitle(
      {
        id: entry.id,
        media_type: entry.media_type,
        title: entry.title,
        name: entry.name,
        overview: entry.overview,
        poster_path: entry.poster_path,
        backdrop_path: entry.backdrop_path,
        release_date: entry.release_date,
        first_air_date: entry.first_air_date,
        vote_average: entry.vote_average,
        vote_count: entry.vote_count,
        popularity: entry.popularity,
        original_language: entry.original_language,
      },
      entry.media_type,
    );
    if (!title) continue;
    // An existing acting credit always wins over the crew duplicate.
    if (credits.has(title.key)) continue;
    credits.set(title.key, {
      ...title,
      character: null,
      job: entry.job?.trim() || null,
      department: entry.department?.trim() || null,
      creditKind: "crew",
    });
  }

  const all = Array.from(credits.values()).sort((a, b) => {
    const yearA = a.year ?? 0;
    const yearB = b.year ?? 0;
    if (yearA !== yearB) return yearB - yearA;
    return b.rating - a.rating;
  });

  return {
    person: toCinemaPerson(person),
    credits: all,
    counts: {
      movie: all.filter((credit) => credit.mediaType === "movie").length,
      tv: all.filter((credit) => credit.mediaType === "tv").length,
      acting: all.filter((credit) => credit.creditKind === "cast").length,
      crew: all.filter((credit) => credit.creditKind === "crew").length,
    },
  };
}

export async function fetchCinemaPerson(
  personId: number,
): Promise<CinemaResult<CinemaFilmography>> {
  if (!Number.isFinite(personId) || personId <= 0) {
    return cinemaFail("not_found", "Unknown person.");
  }

  const response = await tmdbRequest(
    `/person/${personId}`,
    TmdbPersonSchema,
    "TMDB person",
    { append_to_response: "combined_credits" },
    { revalidate: CINEMA_REVALIDATE.person },
  );
  if (!response.ok) return response;

  return cinemaOk(toFilmography(response.data));
}

/**
 * Movies-only, server-paged filmography.
 *
 * `discover/tv` has **no** `with_cast`/`with_people` support, so TV paging is
 * done over the cached `combined_credits` payload instead (see the person
 * route). This is the one place the reference app and the TMDB docs disagreed.
 */
export async function discoverMoviesByCast(
  personId: number,
  page = 1,
  sortBy:
    | "popularity.desc"
    | "vote_average.desc"
    | "primary_release_date.desc" = "popularity.desc",
): Promise<CinemaResult<CinemaListPage>> {
  const response = await tmdbRequest(
    "/discover/movie",
    TmdbPageSchema,
    "TMDB discover",
    {
      with_cast: personId,
      sort_by: sortBy,
      page,
      "vote_count.gte": sortBy === "vote_average.desc" ? 50 : undefined,
    },
    { revalidate: CINEMA_REVALIDATE.person },
  );
  if (!response.ok) return response;

  return cinemaOk({
    items: toTitles(response.data.results, "movie"),
    page: response.data.page ?? page,
    totalPages: Math.min(response.data.total_pages ?? 1, 500),
    totalResults: response.data.total_results ?? 0,
  });
}

/* -------------------------------------------------------------------------- */
/* Genres                                                                     */
/* -------------------------------------------------------------------------- */

export async function fetchCinemaGenreMap(
  mediaType: CinemaMediaType,
): Promise<CinemaResult<Record<number, string>>> {
  const response = await tmdbRequest<{
    genres?: { id: number; name?: string | null }[];
  }>(
    `/genre/${mediaType}/list`,
    {
      safeParse: (input: unknown) => {
        if (typeof input !== "object" || input === null) {
          return { success: false as const };
        }
        const genres = (input as { genres?: unknown }).genres;
        if (!Array.isArray(genres)) return { success: false as const };
        return {
          success: true as const,
          data: { genres } as {
            genres: { id: number; name?: string | null }[];
          },
        };
      },
    },
    "TMDB genres",
    {},
    { revalidate: CINEMA_REVALIDATE.home },
  );
  if (!response.ok) return response;

  const map: Record<number, string> = {};
  for (const genre of response.data.genres ?? []) {
    if (typeof genre?.id === "number" && genre.name) map[genre.id] = genre.name;
  }
  return cinemaOk(map);
}
