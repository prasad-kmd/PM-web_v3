import "server-only";

import {
  CINEMA_OMDB_TIMEOUT_MS,
  CINEMA_REVALIDATE,
  OMDB_API_BASE,
} from "./config";
import { getOmdbKey } from "./env";
import { fetchJson } from "./http";
import {
  cinemaFail,
  cinemaOk,
  type CinemaOmdbInfo,
  type CinemaOmdbScore,
  type CinemaResult,
} from "./types";

/**
 * OMDb — optional enrichment (IMDb + Metacritic scores).
 *
 * Deliberate differences from the reference implementation:
 *  - HTTPS base (the reference shipped `http://`, which browsers block on an
 *    HTTPS page → every rating silently disappeared in production).
 *  - `Response: "False"` is modelled as *no record*, not as an error, so the
 *    UI can hide the score row instead of showing a failure.
 *  - Numeric fields are parsed defensively (`"8.5"`, `"2,345,678"`).
 */

type RawOmdb = Record<string, unknown>;

function readText(record: RawOmdb, key: string): string | null {
  const value = record[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "N/A") return null;
  return trimmed;
}

function readNumber(record: RawOmdb, key: string): number | null {
  const text = readText(record, key);
  if (!text) return null;
  const numeric = Number.parseFloat(text.replace(/[,\s]/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
}

function readMinutes(record: RawOmdb, key: string): number | null {
  const text = readText(record, key);
  if (!text) return null;
  const match = /(\d+)/.exec(text);
  if (!match) return null;
  const minutes = Number.parseInt(match[1], 10);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : null;
}

function readScores(record: RawOmdb): CinemaOmdbScore[] {
  const ratings = record.Ratings;
  if (!Array.isArray(ratings)) return [];
  const scores: CinemaOmdbScore[] = [];
  for (const entry of ratings) {
    if (typeof entry !== "object" || entry === null) continue;
    const source = (entry as { Source?: unknown }).Source;
    const value = (entry as { Value?: unknown }).Value;
    if (typeof source !== "string" || typeof value !== "string") continue;
    scores.push({ source: source.replace(/\s*\/\s*/g, "/").trim(), value });
  }
  return scores;
}

export async function fetchOmdbInfo(
  imdbId: string | null | undefined,
): Promise<CinemaResult<CinemaOmdbInfo | null>> {
  const key = getOmdbKey();
  if (!key) {
    return cinemaFail("not_configured", "OMDB_API_KEY is not configured.");
  }
  const trimmed = imdbId?.trim();
  if (!trimmed) return cinemaOk(null);

  const url = `${OMDB_API_BASE}?apikey=${encodeURIComponent(key)}&i=${encodeURIComponent(trimmed)}&plot=short`;
  const response = await fetchJson<RawOmdb>({
    url,
    label: "OMDb",
    timeoutMs: CINEMA_OMDB_TIMEOUT_MS,
    revalidate: CINEMA_REVALIDATE.omdb,
  });
  if (!response.ok) return response;

  const payload = response.data;
  if (!payload || typeof payload !== "object") {
    return cinemaFail(
      "invalid_payload",
      "OMDb returned an unreadable response.",
    );
  }
  if (readText(payload, "Response") === "False") return cinemaOk(null);

  return cinemaOk({
    imdbId: readText(payload, "imdbID"),
    imdbRating: readNumber(payload, "imdbRating"),
    imdbVotes: readNumber(payload, "imdbVotes"),
    metascore: readNumber(payload, "Metascore"),
    scores: readScores(payload),
    rated: readText(payload, "Rated"),
    released: readText(payload, "Released"),
    runtimeMinutes: readMinutes(payload, "Runtime"),
    awards: readText(payload, "Awards"),
    boxOffice: readText(payload, "BoxOffice"),
    plot: readText(payload, "Plot"),
  });
}
