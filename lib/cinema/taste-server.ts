import "server-only";
import { CINEMA_TASTE_MAX_PAGES, CINEMA_TASTE_ROW_LIMIT } from "./config";
import { listCinemaLibrary } from "./library";
import { buildTasteProfile, tasteReason, tasteSpecs } from "./taste";
import { discoverCinema, fetchCinemaGenreMap } from "./tmdb";
import type { CinemaTastePayload, CinemaTitle } from "./types";

export type TasteAngle = "rating" | "popular" | "recent";
const aliases: Record<string, string[]> = {
  action: ["action & adventure"],
  adventure: ["action & adventure"],
  "science fiction": ["sci-fi & fantasy"],
  fantasy: ["sci-fi & fantasy"],
  "action & adventure": ["action", "adventure"],
  "sci-fi & fantasy": ["science fiction", "fantasy"],
};
export async function loadCinemaTaste(
  angle: TasteAngle = "rating",
): Promise<CinemaTastePayload | null> {
  const { entries } = await listCinemaLibrary();
  const profile = buildTasteProfile(entries);
  if (!profile || !profile.genres.length) return null;
  const map = await fetchCinemaGenreMap(profile.mediaType);
  if (!map.ok) return null;
  const names = Object.entries(map.data).map(([id, name]) => ({
    id: Number(id),
    name: name.toLocaleLowerCase(),
  }));
  for (const genre of profile.genres) {
    const name = genre.name.toLocaleLowerCase();
    const found =
      names.find((g) => g.name === name) ??
      names.find((g) => (aliases[name] ?? []).includes(g.name));
    genre.tmdbId = found?.id ?? null;
  }
  const ids = [
    ...new Set(
      profile.genres
        .map((g) => g.tmdbId)
        .filter((id): id is number => id != null),
    ),
  ];
  const specs = tasteSpecs(profile, ids);
  const owned = new Set(entries.map((e) => e.titleKey));
  let best: CinemaTitle[] = [];
  for (const base of specs) {
    const spec = {
      ...base,
      sortBy:
        angle === "popular"
          ? ("popularity.desc" as const)
          : angle === "recent"
            ? profile.mediaType === "movie"
              ? ("primary_release_date.desc" as const)
              : ("first_air_date.desc" as const)
            : ("vote_average.desc" as const),
      params: {
        ...base.params,
        ...(angle === "recent"
          ? {
              [profile.mediaType === "movie"
                ? "primary_release_date.lte"
                : "first_air_date.lte"]: new Date().toISOString().slice(0, 10),
            }
          : {}),
      },
    };
    const items: CinemaTitle[] = [];
    const seen = new Set<string>();
    for (let page = 1; page <= CINEMA_TASTE_MAX_PAGES; page++) {
      const response = await discoverCinema(spec, page);
      if (!response.ok) break;
      for (const item of response.data.items)
        if (!owned.has(item.key) && !seen.has(item.key)) {
          seen.add(item.key);
          items.push(item);
        }
      if (
        items.length >= CINEMA_TASTE_ROW_LIMIT ||
        page >= response.data.totalPages
      )
        break;
    }
    if (items.length > best.length) best = items;
    if (items.length >= 4) {
      best = items;
      break;
    }
  }
  return best.length
    ? {
        profile,
        reason: tasteReason(profile),
        items: best.slice(0, CINEMA_TASTE_ROW_LIMIT),
      }
    : null;
}
