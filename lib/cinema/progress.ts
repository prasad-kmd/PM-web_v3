/**
 * Watch position, per title.
 *
 * Phase 3 keeps this in `localStorage` so playback is useful immediately; the
 * library phase reads it as a seed and then owns the authoritative copy in
 * Notion. Nothing here throws — a missing/full storage just means no resume.
 */

const STORAGE_KEY = "pm.cinema.progress.v1";

export type CinemaProgress = {
  season: number | null;
  episode: number | null;
  updatedAt: number;
};

type ProgressMap = Record<string, CinemaProgress>;

function readAll(): ProgressMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as ProgressMap;
  } catch {
    return {};
  }
}

export function readProgress(titleKey: string): CinemaProgress | null {
  const entry = readAll()[titleKey];
  if (!entry || typeof entry.updatedAt !== "number") return null;
  return entry;
}

export function saveProgress(
  titleKey: string,
  season: number | null,
  episode: number | null,
): void {
  if (typeof window === "undefined") return;
  try {
    const all = readAll();
    all[titleKey] = { season, episode, updatedAt: Date.now() };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* storage is best-effort */
  }
}

export function progressLabel(progress: CinemaProgress | null): string | null {
  if (!progress) return null;
  if (progress.season === null && progress.episode === null) return null;
  if (progress.season === null) return null;
  if (progress.episode === null) {
    return progress.season === 0 ? "Specials" : `Season ${progress.season}`;
  }
  return `S${String(progress.season).padStart(2, "0")}E${String(
    progress.episode,
  ).padStart(2, "0")}`;
}
