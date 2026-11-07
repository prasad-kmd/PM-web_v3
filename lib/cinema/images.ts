import { TMDB_IMAGE_BASE } from "./config";

/**
 * TMDB image URLs. Kept free of `server-only` so client components can build
 * poster and backdrop URLs — the API key never appears here, only the CDN path.
 */

export function tmdbPosterUrl(
  path: string | null | undefined,
  size: "w92" | "w154" | "w185" | "w342" | "w500" | "original" = "w342",
): string | null {
  return path ? `${TMDB_IMAGE_BASE}/${size}${path}` : null;
}

export function tmdbBackdropUrl(
  path: string | null | undefined,
  size: "w300" | "w780" | "w1280" | "original" = "w1280",
): string | null {
  return path ? `${TMDB_IMAGE_BASE}/${size}${path}` : null;
}

export function tmdbProfileUrl(
  path: string | null | undefined,
  size: "w45" | "w185" | "h632" | "original" = "w185",
): string | null {
  return path ? `${TMDB_IMAGE_BASE}/${size}${path}` : null;
}
