import {
  CINEMA_PLAYBACK_PROVIDERS,
  CINEMA_PRIMARY_PROVIDER_ID,
  type CinemaPlaybackProvider,
} from "./config";
import type { CinemaPlaybackRequest, CinemaPlayerSource } from "./types";

/**
 * Embed URL grammar shared by every provider in the chain:
 *
 *   /embed/movie/{tmdbId}
 *   /embed/tv/{tmdbId}                 (series landing)
 *   /embed/tv/{tmdbId}/{season}/{ep}
 *
 * `vidsrc.to` is first because it is the requested primary; the mirrors exist
 * because these aggregator domains disappear without notice.
 */

export function getPlaybackProvider(
  providerId: string,
): CinemaPlaybackProvider | null {
  return (
    CINEMA_PLAYBACK_PROVIDERS.find((provider) => provider.id === providerId) ??
    null
  );
}

export function getPlaybackProviders(): readonly CinemaPlaybackProvider[] {
  return CINEMA_PLAYBACK_PROVIDERS;
}

function isValidEpisodeNumber(value: number | null | undefined): boolean {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

export function buildEmbedPath(request: CinemaPlaybackRequest): string {
  const { mediaType, tmdbId, season, episode } = request;
  if (mediaType === "movie") return `/embed/movie/${tmdbId}`;

  const seasonValid = isValidEpisodeNumber(season);
  const episodeValid = isValidEpisodeNumber(episode);
  if (!seasonValid) return `/embed/tv/${tmdbId}`;
  if (!episodeValid) return `/embed/tv/${tmdbId}/${season}`;
  return `/embed/tv/${tmdbId}/${season}/${episode}`;
}

/**
 * Bare embed URL — no query parameters at all.
 *
 * `?autoplay=1` was dropped deliberately: several of these hosts treat any
 * unexpected query once as an invalid request and answer "unavailable", so the
 * clean path is the only shape that reliably plays.
 */
export function buildEmbedUrl(
  provider: CinemaPlaybackProvider,
  request: CinemaPlaybackRequest,
): string {
  return `${provider.baseUrl}${buildEmbedPath(request)}`;
}

/** Every provider in chain order — the player renders them left to right. */
export function buildPlayerSources(
  request: CinemaPlaybackRequest,
): CinemaPlayerSource[] {
  return CINEMA_PLAYBACK_PROVIDERS.map((provider) => ({
    providerId: provider.id,
    label: provider.label,
    embedUrl: buildEmbedUrl(provider, request),
    reachable: null,
  }));
}

/**
 * Re-order so a remembered/failed provider is tried first, keeping the rest of
 * the chain intact behind it.
 */
export function prioritiseProvider(
  sources: CinemaPlayerSource[],
  providerId: string | null | undefined,
): CinemaPlayerSource[] {
  if (!providerId) return sources;
  const index = sources.findIndex((source) => source.providerId === providerId);
  if (index <= 0) return sources;
  const next = [...sources];
  const [chosen] = next.splice(index, 1);
  next.unshift(chosen);
  return next;
}

export function primaryProviderId(): string {
  return CINEMA_PRIMARY_PROVIDER_ID;
}
