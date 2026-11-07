import "server-only";

import {
  CINEMA_MAX_SEARCH_LENGTH,
  CINEMA_REVALIDATE,
  CINEMA_UPSTREAM_TIMEOUT_MS,
  TMDB_API_BASE,
} from "./config";
import { REGION_TOKEN, type CinemaDiscoverSpec } from "./catalog";
import { getTmdbAuth } from "./env";
import { fetchJson, parsePayload } from "./http";
import { currentCinemaLocale, ensureCinemaLocale } from "./settings";
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
  type CinemaCompany,
  type CinemaCreatorCredit,
  type CinemaCrewGroup,
  type CinemaEpisodeRef,
  type CinemaProvider,
  type CinemaReview,
  type CinemaTitle,
  type CinemaTitleDetail,
  type TmdbMediaItem,
  type TmdbPerson,
  type TmdbProvider,
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

  const { language, region } = currentCinemaLocale();
  const search = new URLSearchParams({ language, region });
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

  /* Region + language come from the settings page; make sure the cache is warm
     before the URL is built. Cached for a minute, so this is usually free. */
  await ensureCinemaLocale();

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

const CREW_JOB_GROUPS: { label: string; jobs: readonly string[] }[] = [
  {
    label: "Written by",
    jobs: ["Screenplay", "Writer", "Story", "Teleplay", "Characters"],
  },
  { label: "Produced by", jobs: ["Producer"] },
  { label: "Executive producers", jobs: ["Executive Producer"] },
  { label: "Music by", jobs: ["Original Music Composer", "Music"] },
  { label: "Cinematography", jobs: ["Director of Photography"] },
  { label: "Editing", jobs: ["Editor", "Additional Editor"] },
  { label: "Production design", jobs: ["Production Design", "Art Direction"] },
  { label: "Costume design", jobs: ["Costume Design"] },
  { label: "Casting", jobs: ["Casting", "Casting Director"] },
  {
    label: "Visual effects",
    jobs: ["Visual Effects Supervisor", "VFX Supervisor", "Visual Effects"],
  },
  {
    label: "Sound",
    jobs: [
      "Sound Designer",
      "Supervising Sound Editor",
      "Sound Re-Recording Mixer",
    ],
  },
];

/** Regions tried in order when picking a certificate. */
const CERT_FALLBACKS = ["GB", "CA", "AU", "NZ", "DE", "FR", "IN"];

function certRegions(): string[] {
  const primary = currentCinemaLocale().region;
  return [primary, ...CERT_FALLBACKS.filter((code) => code !== primary)];
}

function bestCertification(detail: TmdbTitleDetail): string | null {
  const ratings = detail.content_ratings?.results ?? [];
  for (const region of certRegions()) {
    const hit = ratings.find(
      (entry) => entry.iso_3166_1 === region && entry.rating?.trim(),
    );
    if (hit?.rating) return hit.rating.trim();
  }
  const anyRating = ratings.find((entry) => entry.rating?.trim());
  if (anyRating?.rating) return anyRating.rating.trim();

  const releases = detail.release_dates?.results ?? [];
  for (const region of certRegions()) {
    const hit = releases.find((entry) => entry.iso_3166_1 === region);
    if (!hit) continue;
    const dates = hit.release_dates ?? [];
    const certified =
      dates.find((date) => date.certification?.trim() && date.type === 3) ??
      dates.find((date) => date.certification?.trim());
    if (certified?.certification) return certified.certification.trim();
  }
  for (const region of releases) {
    const certified = (region.release_dates ?? []).find((date) =>
      date.certification?.trim(),
    );
    if (certified?.certification) return certified.certification.trim();
  }
  return null;
}

function trimTo(value: string, limit: number): string {
  const text = value.trim();
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  const space = cut.lastIndexOf(" ");
  return `${(space > limit * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

function uniqueNames(values: (string | null | undefined)[], max = 6): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const value of values) {
    const name = value?.trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    names.push(name);
    if (names.length >= max) break;
  }
  return names;
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

  const originalTitle = (
    mediaType === "movie" ? detail.original_title : detail.original_name
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
    .slice(0, 30)
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

  /* Crew, grouped by role, then de-duplicated so a composer credited under both
     "Music by" and "Sound" only appears once. */
  const claimed = new Set<string>();
  const crewGroups: CinemaCrewGroup[] = [];
  for (const group of CREW_JOB_GROUPS) {
    const names: string[] = [];
    for (const member of crew) {
      if (!member.job || !group.jobs.includes(member.job)) continue;
      if (claimed.has(member.name)) continue;
      claimed.add(member.name);
      names.push(member.name);
      if (names.length >= 4) break;
    }
    if (names.length > 0) crewGroups.push({ label: group.label, names });
  }

  const directors = uniqueNames(
    crew.filter((member) => member.job === "Director").map((m) => m.name),
    4,
  );

  const writers = uniqueNames(
    crew
      .filter((member) =>
        ["Screenplay", "Writer", "Story", "Teleplay"].includes(
          member.job ?? "",
        ),
      )
      .map((m) => m.name),
    6,
  );

  const createdBy: CinemaCreatorCredit[] = (detail.created_by ?? [])
    .filter((person) => Boolean(person.name))
    .slice(0, 6)
    .map((person) => ({
      tmdbId: person.id,
      name: (person.name as string).trim(),
      profilePath: person.profile_path ?? null,
    }));

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

  const companies: CinemaCompany[] = (detail.production_companies ?? [])
    .filter((company) => Boolean(company.name))
    .slice(0, 10)
    .map((company) => {
      const companyName = (company.name as string).trim();
      return {
        id: company.id,
        name: companyName,
        logoPath: company.logo_path ?? null,
        logoText: companyName.slice(0, 2).toUpperCase(),
        country: company.origin_country?.trim() || null,
      };
    });

  const networks: CinemaCompany[] = (detail.networks ?? [])
    .filter((network) => Boolean(network.name))
    .slice(0, 8)
    .map((network) => {
      const networkName = (network.name as string).trim();
      return {
        id: network.id,
        name: networkName,
        logoPath: network.logo_path ?? null,
        logoText: networkName.slice(0, 2).toUpperCase(),
        country: network.origin_country?.trim() || null,
      };
    });

  const keywords = uniqueNames(
    (detail.keywords?.keywords ?? detail.keywords?.results ?? []).map(
      (keyword) => keyword.name,
    ),
    14,
  );

  const alternativeTitles = uniqueNames(
    (detail.alternative_titles?.titles ?? [])
      .filter((entry) => entry.type === "" || entry.type === undefined)
      .map((entry) => entry.title),
    8,
  ).filter((entry) => entry !== base.title && entry !== originalTitle);

  /* Where to watch: the region's row from TMDB's provider feed. */
  const regionCode = currentCinemaLocale().region;
  const region = detail["watch/providers"]?.results?.[regionCode];
  const providerBuckets: [CinemaProvider["kind"], TmdbProvider[]][] = [];
  if (region) {
    providerBuckets.push(
      ["stream", region.flatrate ?? []],
      ["free", region.free ?? []],
      ["ads", region.ads ?? []],
      ["rent", region.rent ?? []],
      ["buy", region.buy ?? []],
    );
  }
  const providerSeen = new Set<string>();
  const providers: CinemaProvider[] = [];
  for (const [kind, list] of providerBuckets) {
    for (const provider of list) {
      const providerName = provider.provider_name?.trim();
      if (!providerName || providerSeen.has(providerName)) continue;
      providerSeen.add(providerName);
      providers.push({
        name: providerName,
        logoPath: provider.logo_path ?? null,
        kind,
      });
      if (providers.length >= 12) break;
    }
  }

  const reviews: CinemaReview[] = (detail.reviews?.results ?? [])
    .filter((review) => Boolean(review.content?.trim()))
    .slice(0, 4)
    .map((review) => ({
      id: review.id,
      author: review.author?.trim() || "TMDB member",
      excerpt: trimTo(review.content ?? "", 460),
      createdAt: review.created_at ?? null,
      rating: review.author_details?.rating ?? null,
    }));

  const countryNames = (detail.production_countries ?? [])
    .map((country) => country.name?.trim() || country.iso_3166_1?.trim() || "")
    .filter(Boolean);

  const countryCodes = (detail.production_countries ?? [])
    .map((country) => country.iso_3166_1?.trim() ?? "")
    .filter(Boolean);

  const languages = uniqueNames(
    (detail.spoken_languages ?? []).map(
      (language) => language.english_name ?? language.name,
    ),
    8,
  );

  const imdbId = detail.imdb_id?.trim() || detail.external_ids?.imdb_id?.trim();

  return {
    ...base,
    tagline: detail.tagline?.trim() ?? "",
    status: detail.status ?? null,
    releaseDate:
      (mediaType === "movie" ? detail.release_date : detail.first_air_date) ??
      null,
    lastAirDate: detail.last_air_date ?? null,
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
    imdbId: imdbId || null,
    originalTitle: originalTitle || base.title,
    originalLanguage: base.originalLanguage,
    certification: bestCertification(detail),
    showType: mediaType === "tv" ? detail.type?.trim() || null : null,
    inProduction: mediaType === "tv" ? (detail.in_production ?? null) : null,
    budget: detail.budget && detail.budget > 0 ? detail.budget : null,
    revenue: detail.revenue && detail.revenue > 0 ? detail.revenue : null,
    countries: countryNames,
    countryCodes,
    languages,
    companies,
    networks,
    createdBy,
    directors,
    writers,
    crewGroups,
    keywords,
    alternativeTitles,
    external: {
      imdbId: imdbId || null,
      homepage: detail.homepage?.trim() || null,
      wikidata: detail.external_ids?.wikidata_id?.trim() || null,
      facebook: detail.external_ids?.facebook_id?.trim() || null,
      instagram: detail.external_ids?.instagram_id?.trim() || null,
      twitter: detail.external_ids?.twitter_id?.trim() || null,
    },
    providers,
    providerLink: region?.link?.trim() || null,
    reviews,
    nextEpisode: detail.next_episode_to_air?.season_number
      ? {
          season: detail.next_episode_to_air.season_number,
          episode: detail.next_episode_to_air.episode_number ?? 0,
          name: detail.next_episode_to_air.name?.trim() || "Next episode",
          airDate: detail.next_episode_to_air.air_date ?? null,
        }
      : null,
    lastEpisode: detail.last_episode_to_air?.season_number
      ? {
          season: detail.last_episode_to_air.season_number,
          episode: detail.last_episode_to_air.episode_number ?? 0,
          name: detail.last_episode_to_air.name?.trim() || "Episode",
          airDate: detail.last_episode_to_air.air_date ?? null,
        }
      : null,
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
/** Params may contain the token `@region`, filled from the saved settings. */
function resolveSpecParams(
  params: CinemaDiscoverSpec["params"],
): CinemaDiscoverSpec["params"] {
  const { region } = currentCinemaLocale();
  const resolved: CinemaDiscoverSpec["params"] = {};
  for (const [key, value] of Object.entries(params)) {
    resolved[key] = value === REGION_TOKEN ? region : value;
  }
  return resolved;
}

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
    {
      ...resolveSpecParams(spec.params),
      sort_by: spec.sortBy,
      page,
      include_adult: false,
    },
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

/** `release_dates` only exists for films, `content_ratings` only for series. */
const TITLE_APPEND: Record<CinemaMediaType, string> = {
  movie:
    "credits,videos,recommendations,similar,keywords,external_ids,alternative_titles,release_dates,watch/providers",
  tv: "credits,videos,recommendations,similar,keywords,external_ids,alternative_titles,content_ratings,watch/providers,aggregate_credits",
};

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
    { append_to_response: TITLE_APPEND[mediaType] },
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

/**
 * Collections ship a primary spec plus fallbacks. Franchise ids occasionally get
 * merged on TMDB, and an empty shelf is worse than a broader one — so page one
 * walks the fallbacks while deeper pages stay on the primary spec.
 */
export async function discoverCinemaWithFallbacks(
  specs: readonly CinemaDiscoverSpec[],
  page = 1,
): Promise<CinemaResult<CinemaListPage>> {
  const chain = page > 1 ? specs.slice(0, 1) : specs;
  let last: CinemaResult<CinemaListPage> | null = null;

  for (const spec of chain) {
    const result = await discoverCinema(spec, page);
    last = result;
    if (result.ok && result.data.items.length > 0) return result;
  }

  return (
    last ?? cinemaFail<CinemaListPage>("not_found", "This collection is empty.")
  );
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
