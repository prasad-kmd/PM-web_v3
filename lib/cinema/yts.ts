import "server-only";

import {
  CINEMA_REVALIDATE,
  CINEMA_YTS_TIMEOUT_MS,
  YTS_API_BASE,
} from "./config";
import { fetchJson } from "./http";
import {
  cinemaFail,
  cinemaOk,
  type CinemaDownload,
  type CinemaDownloadListing,
  type CinemaResult,
} from "./types";

/**
 * YTS — keyless, so it needs no environment variable.
 *
 * The reference app did `data.data.movies.find(...)` whenever `movie_count`
 * was truthy and returned `null` on any failure, so a YTS outage and "this film
 * has no release" looked identical. Here every outcome is explicit:
 *   ready · unavailable (answered, nothing there) · error (upstream failed).
 */

const TRACKERS = [
  "udp://open.demonii.com:1337/announce",
  "udp://tracker.openbittorrent.com:80",
  "udp://tracker.opentrackr.org:1337/announce",
  "udp://exodus.desync.com:6969/announce",
];

const QUALITY_RANK: Record<string, number> = {
  "2160p": 5,
  "1440p": 4,
  "1080p": 3,
  "720p": 2,
  "480p": 1,
  "3D": 0,
};

function buildMagnet(hash: string, title: string): string {
  const params = new URLSearchParams();
  params.set("xt", `urn:btih:${hash}`);
  params.set("dn", title);
  for (const tracker of TRACKERS) params.append("tr", tracker);
  return `magnet:?${params.toString()}`;
}

function readString(
  record: Record<string, unknown>,
  key: string,
): string | null {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value.replace(/[,\s]/g, ""), 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function sortDownloads(downloads: CinemaDownload[]): CinemaDownload[] {
  return [...downloads].sort((a, b) => {
    const qualityDelta =
      (QUALITY_RANK[b.quality] ?? 0) - (QUALITY_RANK[a.quality] ?? 0);
    if (qualityDelta !== 0) return qualityDelta;
    if (b.seeds !== a.seeds) return b.seeds - a.seeds;
    return a.sizeBytes - b.sizeBytes;
  });
}

export async function fetchCinemaDownloads(
  imdbId: string | null | undefined,
  fallbackTitle: string,
): Promise<CinemaResult<CinemaDownloadListing>> {
  const trimmed = imdbId?.trim();
  if (!trimmed) {
    return cinemaOk({
      imdbId: "",
      title: fallbackTitle,
      year: null,
      state: "unavailable",
      downloads: [],
      message: "This title has no IMDb id, so YTS cannot be queried.",
    });
  }

  const url = `${YTS_API_BASE}/list_movies.json?query_term=${encodeURIComponent(trimmed)}&limit=1`;
  const response = await fetchJson<unknown>({
    url,
    label: "YTS",
    timeoutMs: CINEMA_YTS_TIMEOUT_MS,
    revalidate: CINEMA_REVALIDATE.yts,
  });
  if (!response.ok) {
    return cinemaOk({
      imdbId: trimmed,
      title: fallbackTitle,
      year: null,
      state: "error",
      downloads: [],
      message: response.error.message,
    });
  }

  const payload = response.data;
  if (typeof payload !== "object" || payload === null) {
    return cinemaFail(
      "invalid_payload",
      "YTS returned an unreadable response.",
    );
  }

  const data = (payload as { data?: unknown }).data;
  if (typeof data !== "object" || data === null) {
    return cinemaOk({
      imdbId: trimmed,
      title: fallbackTitle,
      year: null,
      state: "unavailable",
      downloads: [],
      message: "YTS returned no catalogue data.",
    });
  }

  // `movies` is omitted entirely when `movie_count` is 0.
  const movies = (data as { movies?: unknown }).movies;
  const movie = Array.isArray(movies) && movies.length > 0 ? movies[0] : null;
  if (typeof movie !== "object" || movie === null) {
    return cinemaOk({
      imdbId: trimmed,
      title: fallbackTitle,
      year: null,
      state: "unavailable",
      downloads: [],
      message: "No release for this title on YTS.",
    });
  }

  const record = movie as Record<string, unknown>;
  const title = readString(record, "title") ?? fallbackTitle;
  const year = readNumber(record, "year") || null;
  const torrents = Array.isArray(record.torrents) ? record.torrents : [];

  const downloads: CinemaDownload[] = [];
  for (const torrent of torrents) {
    if (typeof torrent !== "object" || torrent === null) continue;
    const entry = torrent as Record<string, unknown>;
    const hash = readString(entry, "hash");
    if (!hash) continue;
    downloads.push({
      quality: readString(entry, "quality") ?? "unknown",
      type: readString(entry, "type") ?? "web",
      size: readString(entry, "size") ?? "—",
      sizeBytes: readNumber(entry, "size_bytes"),
      seeds: readNumber(entry, "seeds"),
      peers: readNumber(entry, "peers"),
      magnet: buildMagnet(hash, `${title} ${year ?? ""}`.trim()),
      torrentUrl: readString(entry, "url"),
      hash,
      dateUploaded: readString(entry, "date_uploaded"),
    });
  }

  if (downloads.length === 0) {
    return cinemaOk({
      imdbId: trimmed,
      title,
      year,
      state: "unavailable",
      downloads: [],
      message: "YTS lists this title but has no torrent files.",
    });
  }

  return cinemaOk({
    imdbId: trimmed,
    title,
    year,
    state: "ready",
    downloads: sortDownloads(downloads),
  });
}
