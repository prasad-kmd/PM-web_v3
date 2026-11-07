"use client";

import {
  ArrowLeft01Icon,
  PlayCircleIcon,
  StarIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useState } from "react";

import { PosterRail } from "@/components/admin/cinema/home/PosterRail";
import { CastRail } from "@/components/admin/cinema/parts/CastRail";
import { DownloadPanel } from "@/components/admin/cinema/parts/DownloadPanel";
import {
  EpisodeBar,
  type EpisodeSelection,
} from "@/components/admin/cinema/parts/EpisodeBar";
import { LibraryPanel } from "@/components/admin/cinema/parts/LibraryPanel";
import { PlayerStage } from "@/components/admin/cinema/parts/PlayerStage";
import { StateNotice } from "@/components/admin/cinema/parts/StateNotice";
import { useCinemaLibrary } from "@/components/admin/cinema/store/LibraryProvider";
import { useCinemaFetch } from "@/components/admin/cinema/store/use-cinema-fetch";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TMDB_IMAGE_SIZES_ATTR, TMDB_POSTER_SIZE } from "@/lib/cinema/config";
import { tmdbBackdropUrl, tmdbPosterUrl } from "@/lib/cinema/images";
import { progressLabel, readProgress } from "@/lib/cinema/progress";
import {
  totalRuntimeLabel,
  type CinemaMediaType,
  type CinemaTitle,
  type CinemaTitlePayload,
} from "@/lib/cinema/types";

/**
 * Title page.
 *
 * Banner across the top, then the player — mounted immediately, not hidden
 * behind a Play button, the way the reference behaved. A series opens on the
 * episode you last watched (or S01E01) with the season/episode selects right
 * above the frame.
 */
export function TitleView({
  mediaType,
  tmdbId,
  onBack,
  onOpenTitle,
  onOpenPerson,
}: {
  mediaType: CinemaMediaType;
  tmdbId: number;
  onBack: () => void;
  onOpenTitle: (title: CinemaTitle) => void;
  onOpenPerson: (personId: number) => void;
}) {
  const { state, reload } = useCinemaFetch<CinemaTitlePayload>(
    `/api/cinema/title/${mediaType}/${tmdbId}`,
  );
  const { byTitleKey, patch } = useCinemaLibrary();
  const [selection, setSelection] = useState<EpisodeSelection>({
    season: 1,
    episode: 1,
  });

  const titleKey = state.kind === "ready" ? state.data.title.key : null;
  const isTv = state.kind === "ready" && state.data.title.mediaType === "tv";

  useEffect(() => {
    if (!titleKey) return;
    const saved = readProgress(titleKey);
    if (state.kind === "ready" && state.data.title.mediaType !== "tv") return;
    if (saved?.season != null) {
      setSelection({ season: saved.season, episode: saved.episode ?? 1 });
      return;
    }
    const first =
      state.kind === "ready" ? state.data.title.seasonSummaries : [];
    const firstReal =
      first.find((season) => season.seasonNumber > 0) ?? first[0];
    if (firstReal) setSelection({ season: firstReal.seasonNumber, episode: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titleKey]);

  if (state.kind === "loading") {
    return (
      <div className="cinema-scroll">
        <Skeleton className="h-[clamp(200px,34vh,320px)] w-full rounded-xl" />
        <Skeleton className="aspect-video w-full rounded-[10px]" />
        <div className="cinema-title-body">
          <Skeleton className="aspect-[2/3] w-full rounded-[10px]" />
          <div className="cinema-title-info">
            <Skeleton className="h-6 w-56 max-w-full" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-[88%]" />
          </div>
        </div>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="cinema-scroll">
        <header className="cinema-page-head">
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={onBack}
            aria-label="Back"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} size={14} />
          </Button>
          <div className="cinema-page-head-copy">
            <h2 className="cinema-page-title">Title</h2>
          </div>
        </header>
        <StateNotice
          title="This title could not be opened"
          body={state.message}
          action={
            <Button size="xs" variant="outline" onClick={reload}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  const { title, ratings } = state.data;
  const backdrop = tmdbBackdropUrl(title.backdropPath, "w1280");
  const poster = tmdbPosterUrl(title.posterPath, TMDB_POSTER_SIZE.card);
  const trailer = title.videos[0] ?? null;
  const trailerUrl = trailer
    ? `https://www.youtube.com/watch?v=${trailer.key}`
    : null;

  const meta = [
    title.year ? String(title.year) : null,
    title.mediaType === "movie"
      ? totalRuntimeLabel(title.runtimeMinutes)
      : title.seasons
        ? `${title.seasons} season${title.seasons === 1 ? "" : "s"}`
        : null,
    title.status,
  ].filter(Boolean) as string[];

  const heading = isTv
    ? `${title.title} · ${progressLabel({
        season: selection.season,
        episode: selection.episode,
        updatedAt: 0,
      })}`
    : title.title;

  return (
    <div className="cinema-scroll cinema-title-view">
      <header className="cinema-title-banner">
        {backdrop ? (
          <img
            src={backdrop}
            alt=""
            aria-hidden
            sizes={TMDB_IMAGE_SIZES_ATTR.hero}
            decoding="async"
            draggable={false}
          />
        ) : null}
        <div className="cinema-title-banner-scrim" aria-hidden />

        <div className="cinema-title-banner-top">
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={onBack}
            aria-label="Back"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} size={14} />
          </Button>
        </div>

        <div className="cinema-title-banner-copy">
          <p className="cinema-hero-eyebrow">
            {[title.mediaType === "tv" ? "Series" : "Film", ...meta].join(
              " · ",
            )}
          </p>
          <h2 className="cinema-title-banner-name">{title.title}</h2>
          {title.tagline ? (
            <p className="cinema-title-tagline">{title.tagline}</p>
          ) : null}
          <div className="cinema-score-row">
            {title.rating > 0 ? (
              <span className="cinema-score">
                <HugeiconsIcon icon={StarIcon} strokeWidth={2} size={11} />
                {title.rating.toFixed(1)}
                <em>TMDB</em>
              </span>
            ) : null}
            {ratings?.imdbRating ? (
              <span className="cinema-score">
                {ratings.imdbRating.toFixed(1)}
                <em>IMDb</em>
              </span>
            ) : null}
            {ratings?.metascore ? (
              <span className="cinema-score">
                {ratings.metascore}
                <em>Metacritic</em>
              </span>
            ) : null}
          </div>
        </div>
      </header>

      {isTv && title.seasonSummaries.length > 0 ? (
        <EpisodeBar
          tvId={title.tmdbId}
          seasons={title.seasonSummaries}
          value={selection}
          onChange={setSelection}
        />
      ) : null}

      <PlayerStage
        mediaType={title.mediaType}
        tmdbId={title.tmdbId}
        titleKey={title.key}
        heading={heading}
        season={isTv ? selection.season : null}
        episode={isTv ? selection.episode : null}
        onEpisodeChange={(seasonNumber, episodeNumber) => {
          const entry = byTitleKey.get(title.key);
          const label =
            episodeNumber === null
              ? seasonNumber === 0
                ? "Specials"
                : `S${String(seasonNumber).padStart(2, "0")}`
              : `S${String(seasonNumber).padStart(2, "0")}E${String(
                  episodeNumber,
                ).padStart(2, "0")}`;
          if (entry) void patch(entry.id, { progress: label });
        }}
      />

      <div className="cinema-title-body">
        <div className="cinema-title-poster">
          {poster ? (
            <img
              src={poster}
              alt={`Poster for ${title.title}`}
              width={342}
              height={513}
              sizes={TMDB_IMAGE_SIZES_ATTR.posterCard}
              decoding="async"
            />
          ) : (
            <div className="cinema-card-blank" aria-hidden>
              {title.title.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>

        <div className="cinema-title-info">
          <div className="cinema-title-actions">
            {trailerUrl ? (
              <Button
                size="sm"
                variant="outline"
                render={
                  <a
                    href={trailerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
                <HugeiconsIcon
                  icon={PlayCircleIcon}
                  strokeWidth={1.9}
                  size={13}
                />
                Watch {trailer?.type === "Teaser" ? "teaser" : "trailer"}
              </Button>
            ) : null}
          </div>

          {title.genres.length > 0 ? (
            <div className="cinema-chip-row">
              {title.genres.map((genre) => (
                <span key={genre} className="cinema-chip">
                  {genre}
                </span>
              ))}
            </div>
          ) : null}

          {title.overview ? (
            <p className="cinema-title-overview">{title.overview}</p>
          ) : (
            <p className="cinema-title-overview is-empty">
              No synopsis has been written for this title yet.
            </p>
          )}

          <dl className="cinema-facts">
            {title.directors.length > 0 ? (
              <div>
                <dt>Directed by</dt>
                <dd>{title.directors.join(", ")}</dd>
              </div>
            ) : null}
            {title.cast.length > 0 ? (
              <div>
                <dt>Cast</dt>
                <dd>
                  {title.cast
                    .slice(0, 6)
                    .map((member) => member.name)
                    .join(", ")}
                </dd>
              </div>
            ) : null}
            {title.languages.length > 0 ? (
              <div>
                <dt>Language</dt>
                <dd>{title.languages.join(", ")}</dd>
              </div>
            ) : null}
            {title.imdbId ? (
              <div>
                <dt>IMDb</dt>
                <dd className="cinema-mono">{title.imdbId}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>

      <LibraryPanel title={title} />

      {isTv && title.seasonSummaries.length > 0 ? (
        <section className="cinema-seasons" aria-label="Seasons">
          <h3 className="cinema-rail-title">Seasons</h3>
          <div className="cinema-chip-row">
            {title.seasonSummaries.map((season) => (
              <button
                key={season.seasonNumber}
                type="button"
                className={`cinema-mood-chip${
                  selection.season === season.seasonNumber ? " is-active" : ""
                }`}
                onClick={() =>
                  setSelection({ season: season.seasonNumber, episode: 1 })
                }
              >
                {season.seasonNumber === 0
                  ? "Specials"
                  : `S${season.seasonNumber}`}
                {season.episodeCount > 0 ? ` · ${season.episodeCount} eps` : ""}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <CastRail cast={title.cast} onOpenPerson={onOpenPerson} />

      {title.recommendations.length > 0 ? (
        <PosterRail
          label="More like this"
          items={title.recommendations}
          onOpen={onOpenTitle}
        />
      ) : null}

      <DownloadPanel imdbId={title.imdbId} title={title.title} />
    </div>
  );
}
