import { z } from "zod";

import type { CinemaLibraryStatus } from "./config";

/* -------------------------------------------------------------------------- */
/* Result + error contracts                                                   */
/* -------------------------------------------------------------------------- */

export type CinemaErrorCode =
  | "not_configured"
  | "not_found"
  | "rate_limited"
  | "timeout"
  | "upstream"
  | "invalid_payload"
  | "network";

export type CinemaError = {
  code: CinemaErrorCode;
  message: string;
  /** Upstream HTTP status when there was one. */
  status?: number;
};

export type CinemaResult<T> =
  { ok: true; data: T } | { ok: false; error: CinemaError };

export function cinemaOk<T>(data: T): CinemaResult<T> {
  return { ok: true, data };
}

export function cinemaFail<T = never>(
  code: CinemaErrorCode,
  message: string,
  status?: number,
): CinemaResult<T> {
  return { ok: false, error: { code, message, status } };
}

/** Which upstream integrations are usable in this deployment. */
export type CinemaCapabilities = {
  tmdb: boolean;
  omdb: boolean;
  /** True only when both a Notion token and a library data source id exist. */
  notion: boolean;
};

/* -------------------------------------------------------------------------- */
/* TMDB — raw schemas (tolerant: TMDB omits keys freely)                      */
/* -------------------------------------------------------------------------- */

export const CinemaMediaTypeSchema = z.enum(["movie", "tv"]);
export type CinemaMediaType = z.infer<typeof CinemaMediaTypeSchema>;

export const TmdbGenreSchema = z.object({
  id: z.number(),
  name: z.string().nullish(),
});
export type TmdbGenre = z.infer<typeof TmdbGenreSchema>;

export const TmdbMediaItemSchema = z.object({
  id: z.number(),
  media_type: z.enum(["movie", "tv", "person"]).nullish(),
  title: z.string().nullish(),
  name: z.string().nullish(),
  overview: z.string().nullish(),
  poster_path: z.string().nullish(),
  profile_path: z.string().nullish(),
  backdrop_path: z.string().nullish(),
  release_date: z.string().nullish(),
  first_air_date: z.string().nullish(),
  vote_average: z.number().nullish(),
  vote_count: z.number().nullish(),
  popularity: z.number().nullish(),
  original_language: z.string().nullish(),
  genre_ids: z.array(z.number()).nullish(),
  adult: z.boolean().nullish(),
  known_for_department: z.string().nullish(),
});
export type TmdbMediaItem = z.infer<typeof TmdbMediaItemSchema>;

export const TmdbPageSchema = z.object({
  page: z.number().nullish(),
  results: z.array(TmdbMediaItemSchema).nullish(),
  total_pages: z.number().nullish(),
  total_results: z.number().nullish(),
});

export const TmdbCastMemberSchema = z.object({
  id: z.number(),
  name: z.string(),
  character: z.string().nullish(),
  order: z.number().nullish(),
  profile_path: z.string().nullish(),
  known_for_department: z.string().nullish(),
  credit_id: z.string().nullish(),
});
export type TmdbCastMember = z.infer<typeof TmdbCastMemberSchema>;

export const TmdbCrewMemberSchema = z.object({
  id: z.number(),
  name: z.string(),
  job: z.string().nullish(),
  department: z.string().nullish(),
  profile_path: z.string().nullish(),
});
export type TmdbCrewMember = z.infer<typeof TmdbCrewMemberSchema>;

export const TmdbCreditsSchema = z.object({
  cast: z.array(TmdbCastMemberSchema).nullish(),
  crew: z.array(TmdbCrewMemberSchema).nullish(),
});

export const TmdbVideoSchema = z.object({
  id: z.string().nullish(),
  key: z.string().nullish(),
  site: z.string().nullish(),
  type: z.string().nullish(),
  name: z.string().nullish(),
  official: z.boolean().nullish(),
  published_at: z.string().nullish(),
});

export const TmdbProviderSchema = z.object({
  provider_id: z.number().nullish(),
  provider_name: z.string().nullish(),
  logo_path: z.string().nullish(),
  display_priority: z.number().nullish(),
});
export type TmdbProvider = z.infer<typeof TmdbProviderSchema>;

export const TmdbTitleDetailSchema = z.object({
  id: z.number(),
  imdb_id: z.string().nullish(),
  title: z.string().nullish(),
  name: z.string().nullish(),
  original_title: z.string().nullish(),
  original_name: z.string().nullish(),
  overview: z.string().nullish(),
  tagline: z.string().nullish(),
  status: z.string().nullish(),
  poster_path: z.string().nullish(),
  backdrop_path: z.string().nullish(),
  release_date: z.string().nullish(),
  first_air_date: z.string().nullish(),
  last_air_date: z.string().nullish(),
  runtime: z.number().nullish(),
  episode_run_time: z.array(z.number()).nullish(),
  number_of_seasons: z.number().nullish(),
  number_of_episodes: z.number().nullish(),
  vote_average: z.number().nullish(),
  vote_count: z.number().nullish(),
  popularity: z.number().nullish(),
  original_language: z.string().nullish(),
  adult: z.boolean().nullish(),
  genres: z.array(TmdbGenreSchema).nullish(),
  spoken_languages: z
    .array(
      z.object({
        english_name: z.string().nullish(),
        name: z.string().nullish(),
        iso_639_1: z.string().nullish(),
      }),
    )
    .nullish(),
  production_countries: z
    .array(
      z.object({
        iso_3166_1: z.string().nullish(),
        name: z.string().nullish(),
      }),
    )
    .nullish(),
  belongs_to_collection: z
    .object({ id: z.number(), name: z.string().nullish() })
    .nullish(),
  credits: TmdbCreditsSchema.nullish(),
  videos: z.object({ results: z.array(TmdbVideoSchema).nullish() }).nullish(),
  recommendations: z
    .object({ results: z.array(TmdbMediaItemSchema).nullish() })
    .nullish(),
  similar: z
    .object({ results: z.array(TmdbMediaItemSchema).nullish() })
    .nullish(),
  seasons: z
    .array(
      z.object({
        season_number: z.number().nullish(),
        name: z.string().nullish(),
        episode_count: z.number().nullish(),
        air_date: z.string().nullish(),
        poster_path: z.string().nullish(),
        overview: z.string().nullish(),
      }),
    )
    .nullish(),
  /* Everything below arrives through `append_to_response` and is optional. */
  budget: z.number().nullish(),
  revenue: z.number().nullish(),
  homepage: z.string().nullish(),
  type: z.string().nullish(),
  in_production: z.boolean().nullish(),
  production_companies: z
    .array(
      z.object({
        id: z.number(),
        name: z.string().nullish(),
        logo_path: z.string().nullish(),
        origin_country: z.string().nullish(),
      }),
    )
    .nullish(),
  networks: z
    .array(
      z.object({
        id: z.number(),
        name: z.string().nullish(),
        logo_path: z.string().nullish(),
        origin_country: z.string().nullish(),
      }),
    )
    .nullish(),
  created_by: z
    .array(
      z.object({
        id: z.number(),
        name: z.string().nullish(),
        profile_path: z.string().nullish(),
      }),
    )
    .nullish(),
  keywords: z
    .object({
      keywords: z
        .array(z.object({ id: z.number(), name: z.string().nullish() }))
        .nullish(),
      results: z
        .array(z.object({ id: z.number(), name: z.string().nullish() }))
        .nullish(),
    })
    .nullish(),
  external_ids: z
    .object({
      imdb_id: z.string().nullish(),
      wikidata_id: z.string().nullish(),
      facebook_id: z.string().nullish(),
      instagram_id: z.string().nullish(),
      twitter_id: z.string().nullish(),
    })
    .nullish(),
  alternative_titles: z
    .object({
      titles: z
        .array(
          z.object({
            iso_3166_1: z.string().nullish(),
            title: z.string().nullish(),
            type: z.string().nullish(),
          }),
        )
        .nullish(),
    })
    .nullish(),
  release_dates: z
    .object({
      results: z
        .array(
          z.object({
            iso_3166_1: z.string().nullish(),
            release_dates: z
              .array(
                z.object({
                  certification: z.string().nullish(),
                  release_date: z.string().nullish(),
                  type: z.number().nullish(),
                }),
              )
              .nullish(),
          }),
        )
        .nullish(),
    })
    .nullish(),
  content_ratings: z
    .object({
      results: z
        .array(
          z.object({
            iso_3166_1: z.string().nullish(),
            rating: z.string().nullish(),
          }),
        )
        .nullish(),
    })
    .nullish(),
  reviews: z
    .object({
      results: z
        .array(
          z.object({
            id: z.string(),
            author: z.string().nullish(),
            content: z.string().nullish(),
            created_at: z.string().nullish(),
            author_details: z
              .object({ rating: z.number().nullish() })
              .nullish(),
          }),
        )
        .nullish(),
    })
    .nullish(),
  "watch/providers": z
    .object({
      results: z
        .record(
          z.string(),
          z.object({
            link: z.string().nullish(),
            flatrate: z.array(TmdbProviderSchema).nullish(),
            rent: z.array(TmdbProviderSchema).nullish(),
            buy: z.array(TmdbProviderSchema).nullish(),
            free: z.array(TmdbProviderSchema).nullish(),
            ads: z.array(TmdbProviderSchema).nullish(),
          }),
        )
        .nullish(),
    })
    .nullish(),
  last_episode_to_air: z
    .object({
      season_number: z.number().nullish(),
      episode_number: z.number().nullish(),
      name: z.string().nullish(),
      air_date: z.string().nullish(),
    })
    .nullish(),
  next_episode_to_air: z
    .object({
      season_number: z.number().nullish(),
      episode_number: z.number().nullish(),
      name: z.string().nullish(),
      air_date: z.string().nullish(),
    })
    .nullish(),
});
export type TmdbTitleDetail = z.infer<typeof TmdbTitleDetailSchema>;

export const TmdbSeasonDetailSchema = z.object({
  id: z.number().nullish(),
  season_number: z.number(),
  name: z.string().nullish(),
  overview: z.string().nullish(),
  episodes: z
    .array(
      z.object({
        id: z.number().nullish(),
        episode_number: z.number(),
        name: z.string().nullish(),
        overview: z.string().nullish(),
        air_date: z.string().nullish(),
        runtime: z.number().nullish(),
        still_path: z.string().nullish(),
        vote_average: z.number().nullish(),
      }),
    )
    .nullish(),
});
export type TmdbSeasonDetail = z.infer<typeof TmdbSeasonDetailSchema>;

export const TmdbPersonSchema = z.object({
  id: z.number(),
  name: z.string(),
  biography: z.string().nullish(),
  birthday: z.string().nullish(),
  deathday: z.string().nullish(),
  place_of_birth: z.string().nullish(),
  profile_path: z.string().nullish(),
  known_for_department: z.string().nullish(),
  popularity: z.number().nullish(),
  also_known_as: z.array(z.string()).nullish(),
  combined_credits: z
    .object({
      cast: z
        .array(
          z.object({
            id: z.number(),
            media_type: z.enum(["movie", "tv"]).nullish(),
            title: z.string().nullish(),
            name: z.string().nullish(),
            character: z.string().nullish(),
            overview: z.string().nullish(),
            poster_path: z.string().nullish(),
            backdrop_path: z.string().nullish(),
            release_date: z.string().nullish(),
            first_air_date: z.string().nullish(),
            vote_average: z.number().nullish(),
            vote_count: z.number().nullish(),
            popularity: z.number().nullish(),
            original_language: z.string().nullish(),
            order: z.number().nullish(),
            episode_count: z.number().nullish(),
          }),
        )
        .nullish(),
      crew: z
        .array(
          z.object({
            id: z.number(),
            media_type: z.enum(["movie", "tv"]).nullish(),
            title: z.string().nullish(),
            name: z.string().nullish(),
            job: z.string().nullish(),
            department: z.string().nullish(),
            overview: z.string().nullish(),
            poster_path: z.string().nullish(),
            backdrop_path: z.string().nullish(),
            release_date: z.string().nullish(),
            first_air_date: z.string().nullish(),
            vote_average: z.number().nullish(),
            vote_count: z.number().nullish(),
            popularity: z.number().nullish(),
            original_language: z.string().nullish(),
          }),
        )
        .nullish(),
    })
    .nullish(),
});
export type TmdbPerson = z.infer<typeof TmdbPersonSchema>;

/* -------------------------------------------------------------------------- */
/* Normalised domain model                                                    */
/* -------------------------------------------------------------------------- */

export type CinemaTitleRef = {
  mediaType: CinemaMediaType;
  tmdbId: number;
};

export type CinemaTitle = {
  /** Stable identity: `movie:438631`. */
  key: string;
  tmdbId: number;
  mediaType: CinemaMediaType;
  title: string;
  year: number | null;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  /** 0–10, one decimal. */
  rating: number;
  voteCount: number;
  popularity: number;
  originalLanguage: string | null;
};

export type CinemaCastCredit = {
  tmdbId: number;
  name: string;
  character: string | null;
  profilePath: string | null;
  order: number;
};

export type CinemaCrewCredit = {
  tmdbId: number;
  name: string;
  job: string | null;
  department: string | null;
  profilePath: string | null;
};

export type CinemaVideo = {
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
};

export type CinemaSeasonSummary = {
  seasonNumber: number;
  name: string;
  episodeCount: number;
  airDate: string | null;
  posterPath: string | null;
  overview: string;
};

export type CinemaCompany = {
  id: number;
  name: string;
  logoPath: string | null;
  logoText: string | null;
  country: string | null;
};

export type CinemaCreatorCredit = {
  tmdbId: number;
  name: string;
  profilePath: string | null;
};

/** A named group of crew names — "Music by", "Cinematography", … */
export type CinemaCrewGroup = {
  label: string;
  names: string[];
};

export type CinemaReview = {
  id: string;
  author: string;
  excerpt: string;
  createdAt: string | null;
  rating: number | null;
};

export type CinemaProvider = {
  name: string;
  logoPath: string | null;
  kind: "stream" | "rent" | "buy" | "free" | "ads";
};

export type CinemaEpisodeRef = {
  season: number;
  episode: number;
  name: string;
  airDate: string | null;
};

export type CinemaExternalLinks = {
  imdbId: string | null;
  homepage: string | null;
  wikidata: string | null;
  facebook: string | null;
  instagram: string | null;
  twitter: string | null;
};

export type CinemaTitleDetail = CinemaTitle & {
  tagline: string;
  status: string | null;
  /** Full ISO date of release / first air date. */
  releaseDate: string | null;
  lastAirDate: string | null;
  runtimeMinutes: number | null;
  seasons: number | null;
  episodes: number | null;
  genres: string[];
  imdbId: string | null;
  originalTitle: string;
  originalLanguage: string | null;
  /** BBFC / MPAA / TV-MA style certificate, best guess by region priority. */
  certification: string | null;
  /** "Scripted", "Miniseries", … TV only. */
  showType: string | null;
  inProduction: boolean | null;
  budget: number | null;
  revenue: number | null;
  countries: string[];
  countryCodes: string[];
  languages: string[];
  companies: CinemaCompany[];
  networks: CinemaCompany[];
  createdBy: CinemaCreatorCredit[];
  directors: string[];
  writers: string[];
  crewGroups: CinemaCrewGroup[];
  keywords: string[];
  alternativeTitles: string[];
  external: CinemaExternalLinks;
  providers: CinemaProvider[];
  providerLink: string | null;
  reviews: CinemaReview[];
  nextEpisode: CinemaEpisodeRef | null;
  lastEpisode: CinemaEpisodeRef | null;
  cast: CinemaCastCredit[];
  crew: CinemaCrewCredit[];
  videos: CinemaVideo[];
  recommendations: CinemaTitle[];
  collection: { id: number; name: string } | null;
  seasonSummaries: CinemaSeasonSummary[];
};

export type CinemaEpisode = {
  episodeNumber: number;
  name: string;
  overview: string;
  airDate: string | null;
  runtime: number | null;
  stillPath: string | null;
  rating: number;
};

export type CinemaPerson = {
  tmdbId: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  placeOfBirth: string | null;
  profilePath: string | null;
  knownForDepartment: string | null;
  popularity: number;
};

export type CinemaPersonSummary = {
  tmdbId: number;
  name: string;
  profilePath: string | null;
  knownForDepartment: string | null;
  popularity: number;
};

export type CinemaSearchResults = {
  titles: CinemaTitle[];
  people: CinemaPersonSummary[];
  page: number;
  totalPages: number;
  totalResults: number;
};

export type CinemaFilmographyCredit = CinemaTitle & {
  character: string | null;
  job: string | null;
  department: string | null;
  creditKind: "cast" | "crew";
};

export type CinemaFilmography = {
  person: CinemaPerson;
  credits: CinemaFilmographyCredit[];
  counts: { movie: number; tv: number; acting: number; crew: number };
};

/* -------------------------------------------------------------------------- */
/* OMDb                                                                       */
/* -------------------------------------------------------------------------- */

export type CinemaOmdbScore = {
  source: string;
  value: string;
};

export type CinemaOmdbInfo = {
  imdbId: string | null;
  imdbRating: number | null;
  imdbVotes: number | null;
  metascore: number | null;
  scores: CinemaOmdbScore[];
  rated: string | null;
  released: string | null;
  runtimeMinutes: number | null;
  awards: string | null;
  boxOffice: string | null;
  plot: string | null;
};

/* -------------------------------------------------------------------------- */
/* YTS                                                                        */
/* -------------------------------------------------------------------------- */

export type CinemaDownload = {
  quality: string;
  type: string;
  size: string;
  sizeBytes: number;
  seeds: number;
  peers: number;
  magnet: string;
  torrentUrl: string | null;
  hash: string;
  dateUploaded: string | null;
};

export type CinemaDownloadListing = {
  imdbId: string;
  title: string;
  year: number | null;
  /** `unavailable` means YTS answered but has no release; `error` means it failed. */
  state: "ready" | "unavailable" | "error";
  downloads: CinemaDownload[];
  message?: string;
};

/* -------------------------------------------------------------------------- */
/* API payloads                                                               */
/* -------------------------------------------------------------------------- */

export type CinemaHomeRowPayload = {
  id: string;
  label: string;
  ranked: boolean;
  kind: string;
  items: CinemaTitle[];
  totalPages: number;
};

export type CinemaCollectionPayload = {
  id: string;
  label: string;
  blurb: string;
  /** Two backdrops for the collage; empty when discover failed. */
  backdrops: string[];
};

export type CinemaHomePayload = {
  hero: CinemaTitle[];
  /** Index of today's featured title inside `hero`. */
  heroIndex: number;
  rows: CinemaHomeRowPayload[];
  collections: CinemaCollectionPayload[];
  moods: { id: string; label: string }[];
  /** Row labels that failed, so the UI can say so instead of hiding them. */
  degraded: string[];
};

export type CinemaListPayload = {
  title: string;
  items: CinemaTitle[];
  page: number;
  totalPages: number;
  totalResults: number;
};

export type CinemaTitlePayload = {
  title: CinemaTitleDetail;
  ratings: CinemaOmdbInfo | null;
};

/* -------------------------------------------------------------------------- */
/* Playback                                                                   */
/* -------------------------------------------------------------------------- */

export type CinemaPlaybackRequest = {
  mediaType: CinemaMediaType;
  tmdbId: number;
  season?: number | null;
  episode?: number | null;
};

export type CinemaPlayerSource = {
  providerId: string;
  label: string;
  embedUrl: string;
  /** `null` until probed. */
  reachable: boolean | null;
};

/* -------------------------------------------------------------------------- */
/* Library (Notion)                                                           */
/* -------------------------------------------------------------------------- */

export type CinemaLibraryEntry = {
  /** Notion page id in cloud mode, local id in session mode. */
  id: string;
  titleKey: string;
  tmdbId: number;
  mediaType: CinemaMediaType;
  title: string;
  year: number | null;
  status: CinemaLibraryStatus;
  rating: number | null;
  genres: string[];
  posterPath: string | null;
  runtimeMinutes: number | null;
  seasons: number | null;
  /** `S02E05` — drives "continue watching". */
  progress: string | null;
  notes: string;
  addedAt: string;
  updatedAt: string;
  source: "notion" | "session";
};

export type CinemaLibraryDraft = {
  titleKey: string;
  tmdbId: number;
  mediaType: CinemaMediaType;
  title: string;
  year: number | null;
  status: CinemaLibraryStatus;
  rating?: number | null;
  genres?: string[];
  posterPath?: string | null;
  runtimeMinutes?: number | null;
  seasons?: number | null;
  progress?: string | null;
  notes?: string;
};

export type CinemaPrefs = {
  defaultProviderId: string;
  posterDensity: "comfortable" | "compact";
};

/** Used until the owner saves preferences (and when Notion is unavailable). */
export const DEFAULT_CINEMA_PREFS: CinemaPrefs = {
  defaultProviderId: "vidsrc-to",
  posterDensity: "comfortable",
};

/* -------------------------------------------------------------------------- */
/* Shared helpers                                                             */
/* -------------------------------------------------------------------------- */

export function titleKey(mediaType: CinemaMediaType, tmdbId: number): string {
  return `${mediaType}:${tmdbId}`;
}

export function parseTitleKey(
  key: string | null | undefined,
): CinemaTitleRef | null {
  if (!key) return null;
  const [mediaType, rawId] = key.split(":");
  if (mediaType !== "movie" && mediaType !== "tv") return null;
  const tmdbId = Number.parseInt(rawId ?? "", 10);
  if (!Number.isFinite(tmdbId) || tmdbId <= 0) return null;
  return { mediaType, tmdbId };
}

export function totalRuntimeLabel(
  runtimeMinutes: number | null | undefined,
): string | null {
  if (!runtimeMinutes || runtimeMinutes <= 0) return null;
  const hours = Math.floor(runtimeMinutes / 60);
  const minutes = runtimeMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function seasonEpisodeLabel(
  season: number | null | undefined,
  episode: number | null | undefined,
): string | null {
  if (season === null || season === undefined) return null;
  if (episode === null || episode === undefined) {
    return season === 0 ? "Specials" : `Season ${season}`;
  }
  return `S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`;
}
