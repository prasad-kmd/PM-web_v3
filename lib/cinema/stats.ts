import { CINEMA_STATS_MONTHS } from "./config";
import type {
  CinemaLibraryEntry,
  CinemaStatBucket,
  CinemaStats,
} from "./types";

function buckets(pairs: [string, number][]): CinemaStatBucket[] {
  const total = pairs.reduce((sum, [, count]) => sum + count, 0);
  return pairs.map(([label, count]) => ({
    key: label,
    label,
    count,
    share: total ? count / total : 0,
  }));
}

export function computeCinemaStats(
  entries: readonly CinemaLibraryEntry[],
  now = new Date(),
): CinemaStats {
  const rated = entries.filter((e) => e.rating != null && e.rating > 0);
  const counts = new Map<string, number>();
  const decades = new Map<string, number>();
  let libraryMinutes = 0,
    watchedMinutes = 0,
    unknownRuntime = 0,
    episodesTracked = 0;
  for (const e of entries) {
    for (const g of new Set(e.genres.filter(Boolean)))
      counts.set(g, (counts.get(g) ?? 0) + 1);
    if (e.year && e.year > 0) {
      const d = `${Math.floor(e.year / 10) * 10}s`;
      decades.set(d, (decades.get(d) ?? 0) + 1);
    }
    const runtime =
      e.runtimeMinutes && e.runtimeMinutes > 0 ? e.runtimeMinutes : null;
    if (!runtime) unknownRuntime++;
    if (e.mediaType === "movie") {
      if (!runtime) continue;
      libraryMinutes += runtime;
      watchedMinutes +=
        runtime *
        (e.status === "Watched" || e.status === "Favorite"
          ? 1
          : e.status === "Watching"
            ? 0.5
            : 0);
    } else {
      const totalEpisodes = e.episodes && e.episodes > 0 ? e.episodes : null;
      if (totalEpisodes && runtime) libraryMinutes += runtime * totalEpisodes;
      else if (runtime) unknownRuntime++;
      const m = e.progress?.match(/^S(\d+)E(\d+)$/i);
      let seen: number | null = 0;
      if (m) {
        const season = Number(m[1]),
          episode = Number(m[2]);
        if (season <= 1) seen = episode;
        else if (totalEpisodes && e.seasons && e.seasons > 0)
          seen = ((season - 1) * totalEpisodes) / e.seasons + episode;
        else {
          seen = null;
          if (totalEpisodes && runtime) unknownRuntime++;
        }
      } else if (e.status === "Watched") seen = totalEpisodes;
      if (seen != null) {
        const limited = totalEpisodes ? Math.min(seen, totalEpisodes) : seen;
        episodesTracked += limited;
        if (runtime) watchedMinutes += limited * runtime;
      }
    }
  }
  const genrePairs = [...counts].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
  const topGenres = genrePairs.slice(0, 8);
  if (genrePairs.length > 8)
    topGenres.push([
      "Other",
      genrePairs.slice(8).reduce((n, [, c]) => n + c, 0),
    ]);
  const addedByMonth = Array.from({ length: CINEMA_STATS_MONTHS }, (_, i) => {
    const d = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth() - CINEMA_STATS_MONTHS + 1 + i,
        1,
      ),
    );
    const month = d.toISOString().slice(0, 7);
    return {
      month,
      label: d.toLocaleString("en", {
        month: "short",
        year: "2-digit",
        timeZone: "UTC",
      }),
      count: entries.filter((e) => e.addedAt?.slice(0, 7) === month).length,
    };
  });
  const insights: CinemaStats["insights"] = [];
  if (genrePairs[0])
    insights.push({
      label: "Favourite genre",
      value: `${genrePairs[0][0]} · ${genrePairs[0][1]} titles`,
    });
  const genreRatings = new Map<string, number[]>();
  for (const e of rated)
    for (const g of new Set(e.genres))
      genreRatings.set(g, [...(genreRatings.get(g) ?? []), e.rating!]);
  const bestGenre = [...genreRatings]
    .filter(([, v]) => v.length >= 3)
    .map(([name, v]) => ({
      name,
      average: v.reduce((a, b) => a + b, 0) / v.length,
    }))
    .sort((a, b) => b.average - a.average || a.name.localeCompare(b.name))[0];
  if (bestGenre)
    insights.push({
      label: "Highest-rated genre",
      value: `${bestGenre.name} · ${bestGenre.average.toFixed(1)}/10`,
    });
  const topDecade = [...decades].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  )[0];
  if (topDecade)
    insights.push({
      label: "Favourite decade",
      value: `${topDecade[0]} · ${topDecade[1]} titles`,
    });
  const longest = entries
    .filter(
      (e) =>
        e.mediaType === "movie" && e.runtimeMinutes && e.runtimeMinutes > 0,
    )
    .sort((a, b) => (b.runtimeMinutes ?? 0) - (a.runtimeMinutes ?? 0))[0];
  if (longest)
    insights.push({
      label: "Longest film",
      value: `${longest.title} · ${longest.runtimeMinutes} min`,
    });
  const newest = [...entries].sort((a, b) =>
    b.addedAt.localeCompare(a.addedAt),
  )[0];
  if (newest) insights.push({ label: "Newest addition", value: newest.title });
  const highest = [...rated].sort(
    (a, b) =>
      (b.rating ?? 0) - (a.rating ?? 0) ||
      b.updatedAt.localeCompare(a.updatedAt),
  )[0];
  if (highest)
    insights.push({
      label: "Highest rated title",
      value: `${highest.title} · ${highest.rating}/10`,
    });
  return {
    generatedAt: now.toISOString(),
    total: entries.length,
    films: entries.filter((e) => e.mediaType === "movie").length,
    series: entries.filter((e) => e.mediaType === "tv").length,
    rated: rated.length,
    averageRating: rated.length
      ? Math.round(
          (rated.reduce((s, e) => s + e.rating!, 0) / rated.length) * 10,
        ) / 10
      : null,
    libraryMinutes: Math.round(libraryMinutes),
    watchedMinutes: Math.round(watchedMinutes),
    unknownRuntime,
    episodesTracked: Math.round(episodesTracked),
    statuses: buckets(
      ["Watched", "Watching", "Watchlist", "Favorite", "Dropped"].map((s) => [
        s,
        entries.filter((e) => e.status === s).length,
      ]),
    ),
    genres: buckets(topGenres),
    decades: buckets([...decades].sort((a, b) => a[0].localeCompare(b[0]))),
    ratingBands: buckets([
      ["None", entries.length - rated.length],
      ["1–4", rated.filter((e) => e.rating! <= 4).length],
      ["5–6", rated.filter((e) => e.rating! > 4 && e.rating! <= 6).length],
      ["7–8", rated.filter((e) => e.rating! > 6 && e.rating! <= 8).length],
      ["9–10", rated.filter((e) => e.rating! > 8).length],
    ]),
    addedByMonth,
    insights,
  };
}
