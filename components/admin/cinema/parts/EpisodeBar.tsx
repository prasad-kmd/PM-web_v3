"use client";

import { useMemo } from "react";

import { useCinemaFetch } from "@/components/admin/cinema/store/use-cinema-fetch";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CinemaEpisode, CinemaSeasonSummary } from "@/lib/cinema/types";

export type EpisodeSelection = { season: number; episode: number };

/**
 * Season + episode selects sitting above the player, the way the reference did
 * it — except season 0 is labelled *Specials* rather than being coerced to
 * season 1, and nothing is written to the URL until you actually pick.
 */
export function EpisodeBar({
  tvId,
  seasons,
  value,
  onChange,
}: {
  tvId: number;
  seasons: CinemaSeasonSummary[];
  value: EpisodeSelection;
  onChange: (next: EpisodeSelection) => void;
}) {
  const { state } = useCinemaFetch<{ episodes: CinemaEpisode[] }>(
    `/api/cinema/season?tv=${tvId}&season=${value.season}`,
  );

  /* `items` must be referentially stable: Base UI re-registers the list in an
     effect, and a fresh array on every render is a render loop. */
  const seasonItems = useMemo(
    () =>
      seasons.map((season) => ({
        value: String(season.seasonNumber),
        label:
          season.seasonNumber === 0
            ? "Specials"
            : `${season.name}${season.episodeCount > 0 ? ` · ${season.episodeCount} eps` : ""}`,
      })),
    [seasons],
  );

  const episodeItems = useMemo(() => {
    if (state.kind !== "ready") return [];
    return state.data.episodes.map((episode) => ({
      value: String(episode.episodeNumber),
      label: `${String(episode.episodeNumber).padStart(2, "0")} · ${episode.name}`,
    }));
  }, [state]);

  return (
    <div className="cinema-episode-bar">
      <span className="cinema-panel-label">Episode</span>

      <Select
        items={seasonItems}
        value={String(value.season)}
        onValueChange={(next) => {
          if (typeof next !== "string") return;
          const parsed = Number.parseInt(next, 10);
          if (Number.isFinite(parsed)) onChange({ season: parsed, episode: 1 });
        }}
      >
        <SelectTrigger className="min-w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectPopup>
          {seasonItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>

      <Select
        items={episodeItems}
        value={String(value.episode)}
        onValueChange={(next) => {
          if (typeof next !== "string") return;
          const parsed = Number.parseInt(next, 10);
          if (Number.isFinite(parsed)) {
            onChange({ season: value.season, episode: parsed });
          }
        }}
      >
        <SelectTrigger className="min-w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectPopup>
          {episodeItems.length === 0 ? (
            <SelectItem value="__none" disabled>
              {state.kind === "error" ? "Episodes unavailable" : "Loading…"}
            </SelectItem>
          ) : (
            episodeItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))
          )}
        </SelectPopup>
      </Select>

      {state.kind === "error" ? (
        <span className="cinema-panel-hint">{state.message}</span>
      ) : null}
    </div>
  );
}
