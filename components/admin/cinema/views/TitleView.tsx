"use client";

import {
  Calendar03Icon,
  Clock01Icon,
  LinkSquare02Icon,
  PlayCircleIcon,
  StarIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useState } from "react";

import { PosterRail } from "@/components/admin/cinema/home/PosterRail";
import { CastRail } from "@/components/admin/cinema/parts/CastRail";
import { CrewRail } from "@/components/admin/cinema/parts/CrewRail";
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
  type CinemaTitleDetail,
  type CinemaTitlePayload,
} from "@/lib/cinema/types";

/* -------------------------------------------------------------------------- */
/* Small formatters — every value here comes from TMDB or OMDb as a raw shape. */
/* -------------------------------------------------------------------------- */

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatMoney(value: number | null): string | null {
  if (!value || value <= 0) return null;
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2).replace(/\.00$/, "")}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  return `$${value.toLocaleString("en-US")}`;
}

function formatCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `${Math.round(value / 1000)}k`;
  return value.toLocaleString("en-GB");
}

function languageName(code: string | null): string | null {
  if (!code) return null;
  try {
    const name = new Intl.DisplayNames(["en"], { type: "language" }).of(code);
    return name ? name.charAt(0).toUpperCase() + name.slice(1) : code;
  } catch {
    return code.toUpperCase();
  }
}

const PROVIDER_LABELS: Record<string, string> = {
  stream: "Included",
  free: "Free",
  ads: "With ads",
  rent: "Rent",
  buy: "Buy",
};

type DetailRow = { label: string; value: string; mono?: boolean };

const REVIEW_DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/**
 * Title page.
 *
 * Banner across the top — no back button of its own, the studio toolbar owns
 * that — then a two-column body: the player (and its episode picker) on the
 * left so theater mode has something to widen, and everything documentary on
 * the right, library panel first. Anything that arrives without a value is
 * simply not rendered, so a sparse title still reads as a finished page.
 */
export function TitleView({
  mediaType,
  tmdbId,
  onOpenTitle,
  onOpenPerson,
}: {
  mediaType: CinemaMediaType;
  tmdbId: number;
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
        <div className="cinema-title-grid">
          <div className="cinema-title-main">
            <Skeleton className="aspect-video w-full rounded-[10px]" />
          </div>
          <div className="cinema-title-side">
            <Skeleton className="h-40 w-full rounded-[10px]" />
            <Skeleton className="h-56 w-full rounded-[10px]" />
          </div>
        </div>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="cinema-scroll">
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
  return (
    <TitleBody
      title={title}
      ratings={ratings}
      selection={selection}
      onSelect={setSelection}
      onOpenTitle={onOpenTitle}
      onOpenPerson={onOpenPerson}
      onEpisodeChange={(seasonNumber, episodeNumber) => {
        const entry = byTitleKey.get(title.key);
        if (!entry) return;
        const label =
          episodeNumber === null
            ? seasonNumber === 0
              ? "Specials"
              : `S${String(seasonNumber).padStart(2, "0")}`
            : `S${String(seasonNumber).padStart(2, "0")}E${String(
                episodeNumber,
              ).padStart(2, "0")}`;
        void patch(entry.id, { progress: label });
      }}
    />
  );
}

function TitleBody({
  title,
  ratings,
  selection,
  onSelect,
  onOpenTitle,
  onOpenPerson,
  onEpisodeChange,
}: {
  title: CinemaTitleDetail;
  ratings: CinemaTitlePayload["ratings"];
  selection: EpisodeSelection;
  onSelect: (next: EpisodeSelection) => void;
  onOpenTitle: (title: CinemaTitle) => void;
  onOpenPerson: (personId: number) => void;
  onEpisodeChange: (season: number, episode: number | null) => void;
}) {
  const isTv = title.mediaType === "tv";
  const backdrop = tmdbBackdropUrl(title.backdropPath, "w1280");
  const poster = tmdbPosterUrl(title.posterPath, TMDB_POSTER_SIZE.card);
  const trailer = title.videos[0] ?? null;
  const trailerUrl = trailer
    ? `https://www.youtube.com/watch?v=${trailer.key}`
    : null;

  const heading = isTv
    ? `${title.title} · ${progressLabel({
        season: selection.season,
        episode: selection.episode,
        updatedAt: 0,
      })}`
    : title.title;

  const eyebrow = [
    isTv ? "Series" : "Film",
    title.year ? String(title.year) : null,
    title.certification,
    isTv
      ? title.seasons
        ? `${title.seasons} season${title.seasons === 1 ? "" : "s"}`
        : null
      : totalRuntimeLabel(title.runtimeMinutes),
  ]
    .filter(Boolean)
    .join(" · ");

  const released = formatDate(title.releaseDate);
  const lastAir = formatDate(title.lastAirDate);
  const nextEpisode = title.nextEpisode;
  const lastEpisode = title.lastEpisode;

  const rows: DetailRow[] = [
    title.originalTitle !== title.title
      ? { label: "Original title", value: title.originalTitle }
      : null,
    title.status ? { label: "Status", value: title.status } : null,
    released
      ? { label: isTv ? "First aired" : "Released", value: released }
      : null,
    isTv && lastAir ? { label: "Last aired", value: lastAir } : null,
    isTv && title.showType ? { label: "Type", value: title.showType } : null,
    isTv && title.inProduction !== null
      ? { label: "In production", value: title.inProduction ? "Yes" : "No" }
      : null,
    isTv && title.seasons
      ? {
          label: "Seasons",
          value: `${title.seasons}${
            title.episodes ? ` · ${title.episodes} episodes` : ""
          }`,
        }
      : null,
    !isTv && title.runtimeMinutes
      ? { label: "Runtime", value: totalRuntimeLabel(title.runtimeMinutes) }
      : null,
    isTv && title.runtimeMinutes
      ? {
          label: "Episode length",
          value: totalRuntimeLabel(title.runtimeMinutes),
        }
      : null,
    nextEpisode
      ? {
          label: "Next episode",
          value: `S${String(nextEpisode.season).padStart(2, "0")}E${String(
            nextEpisode.episode,
          ).padStart(2, "0")} · ${nextEpisode.name}${
            formatDate(nextEpisode.airDate)
              ? ` (${formatDate(nextEpisode.airDate)})`
              : ""
          }`,
        }
      : null,
    lastEpisode && isTv
      ? {
          label: "Last episode",
          value: `S${String(lastEpisode.season).padStart(2, "0")}E${String(
            lastEpisode.episode,
          ).padStart(2, "0")} · ${lastEpisode.name}`,
        }
      : null,
    title.certification
      ? { label: "Certificate", value: title.certification }
      : null,
    formatMoney(title.budget)
      ? { label: "Budget", value: formatMoney(title.budget) as string }
      : null,
    formatMoney(title.revenue)
      ? { label: "Box office", value: formatMoney(title.revenue) as string }
      : null,
    title.countries.length > 0
      ? { label: "Countries", value: title.countries.join(", ") }
      : null,
    title.languages.length > 0
      ? { label: "Languages", value: title.languages.join(", ") }
      : null,
    languageName(title.originalLanguage)
      ? {
          label: "Original language",
          value: languageName(title.originalLanguage) as string,
        }
      : null,
    title.networks.length > 0
      ? {
          label: "Networks",
          value: title.networks.map((n) => n.name).join(", "),
        }
      : null,
    title.companies.length > 0
      ? {
          label: isTv ? "Production" : "Studios",
          value: title.companies.map((company) => company.name).join(", "),
        }
      : null,
    title.collection
      ? { label: "Collection", value: title.collection.name }
      : null,
    title.createdBy.length > 0
      ? {
          label: "Created by",
          value: title.createdBy.map((person) => person.name).join(", "),
        }
      : null,
    title.directors.length > 0
      ? { label: "Directed by", value: title.directors.join(", ") }
      : null,
    title.writers.length > 0 && title.crewGroups.length === 0
      ? { label: "Written by", value: title.writers.join(", ") }
      : null,
    title.voteCount > 0
      ? { label: "TMDB votes", value: formatCount(title.voteCount) }
      : null,
    title.popularity > 0
      ? { label: "TMDB popularity", value: title.popularity.toFixed(1) }
      : null,
    title.imdbId ? { label: "IMDb id", value: title.imdbId, mono: true } : null,
    title.tmdbId
      ? { label: "TMDB id", value: String(title.tmdbId), mono: true }
      : null,
  ].filter((row): row is DetailRow => row !== null);

  const omdbRows: DetailRow[] = [
    ratings?.rated ? { label: "Rated", value: ratings.rated } : null,
    ratings?.released ? { label: "Released", value: ratings.released } : null,
    ratings?.runtimeMinutes
      ? { label: "Runtime", value: totalRuntimeLabel(ratings.runtimeMinutes) }
      : null,
    ratings?.awards ? { label: "Awards", value: ratings.awards } : null,
    ratings?.boxOffice
      ? { label: "Box office", value: ratings.boxOffice }
      : null,
  ].filter((row): row is DetailRow => row !== null);

  const scoreChips: { label: string; value: string }[] = [
    title.rating > 0 ? { label: "TMDB", value: title.rating.toFixed(1) } : null,
    ratings?.imdbRating
      ? { label: "IMDb", value: ratings.imdbRating.toFixed(1) }
      : null,
    ratings?.metascore
      ? { label: "Metacritic", value: String(ratings.metascore) }
      : null,
    /* OMDb repeats IMDb and Metacritic, which the chips above already show. */
    ...(ratings?.scores ?? [])
      .filter(
        (score) =>
          !["Internet Movie Database", "Metacritic"].includes(score.source),
      )
      .map((score) => ({
        label: score.source.replace("Rotten Tomatoes", "RT"),
        value: score.value,
      })),
  ].filter((chip): chip is { label: string; value: string } => chip !== null);

  const links: { label: string; href: string }[] = [
    title.external.homepage
      ? { label: "Official site", href: title.external.homepage }
      : null,
    title.external.imdbId
      ? {
          label: "IMDb",
          href: `https://www.imdb.com/title/${title.external.imdbId}/`,
        }
      : null,
    title.external.wikidata
      ? {
          label: "Wikidata",
          href: `https://www.wikidata.org/wiki/${title.external.wikidata}`,
        }
      : null,
    title.external.facebook
      ? {
          label: "Facebook",
          href: `https://www.facebook.com/${title.external.facebook}`,
        }
      : null,
    title.external.instagram
      ? {
          label: "Instagram",
          href: `https://www.instagram.com/${title.external.instagram}`,
        }
      : null,
    title.external.twitter
      ? {
          label: "X",
          href: `https://x.com/${title.external.twitter}`,
        }
      : null,
    {
      label: "TMDB",
      href: `https://www.themoviedb.org/${title.mediaType}/${title.tmdbId}`,
    },
  ].filter((link): link is { label: string; href: string } => link !== null);

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

        <div className="cinema-title-banner-copy">
          <p className="cinema-hero-eyebrow">{eyebrow}</p>
          <h2 className="cinema-title-banner-name">{title.title}</h2>
          {title.tagline ? (
            <p className="cinema-title-tagline">{title.tagline}</p>
          ) : null}

          {scoreChips.length > 0 ? (
            <div className="cinema-score-row">
              {scoreChips.map((chip, chipIndex) => (
                <span
                  key={`${chip.label}-${chipIndex}`}
                  className="cinema-score"
                >
                  {chip.label === "TMDB" ? (
                    <HugeiconsIcon icon={StarIcon} strokeWidth={2} size={11} />
                  ) : null}
                  {chip.value}
                  <em>{chip.label}</em>
                </span>
              ))}
            </div>
          ) : null}

          {title.genres.length > 0 ? (
            <div className="cinema-chip-row">
              {title.genres.map((genre) => (
                <span key={genre} className="cinema-chip is-onart">
                  {genre}
                </span>
              ))}
            </div>
          ) : null}

          <div className="cinema-hero-actions">
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
            {title.external.imdbId ? (
              <Button
                size="sm"
                variant="ghost"
                render={
                  <a
                    href={`https://www.imdb.com/title/${title.external.imdbId}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
                <HugeiconsIcon
                  icon={LinkSquare02Icon}
                  strokeWidth={2}
                  size={13}
                />
                IMDb
              </Button>
            ) : null}
            {title.providerLink ? (
              <Button
                size="sm"
                variant="ghost"
                render={
                  <a
                    href={title.providerLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
                Where to watch
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <div className="cinema-title-grid">
        <div className="cinema-title-main">
          {isTv && title.seasonSummaries.length > 0 ? (
            <EpisodeBar
              tvId={title.tmdbId}
              seasons={title.seasonSummaries}
              value={selection}
              onChange={onSelect}
            />
          ) : null}

          <PlayerStage
            mediaType={title.mediaType}
            tmdbId={title.tmdbId}
            titleKey={title.key}
            heading={heading}
            season={isTv ? selection.season : null}
            episode={isTv ? selection.episode : null}
            onEpisodeChange={onEpisodeChange}
          />

          {isTv && title.seasonSummaries.length > 1 ? (
            <div className="cinema-season-strip">
              {title.seasonSummaries.map((season) => (
                <button
                  key={season.seasonNumber}
                  type="button"
                  className={`cinema-mood-chip${
                    selection.season === season.seasonNumber ? " is-active" : ""
                  }`}
                  onClick={() =>
                    onSelect({ season: season.seasonNumber, episode: 1 })
                  }
                  title={`${season.name} · ${season.episodeCount} episodes`}
                >
                  {season.seasonNumber === 0
                    ? "Specials"
                    : `S${season.seasonNumber}`}
                </button>
              ))}
            </div>
          ) : null}

          {/* Faces sit under the player: they fill the column's spare height and
              keep "who made this" one glance from the film you are watching. */}
          <CastRail cast={title.cast} onOpenPerson={onOpenPerson} />
          <CrewRail crew={title.crew} onOpenPerson={onOpenPerson} />

          {title.videos.length > 1 ? (
            <section className="cinema-side-card" aria-label="Videos">
              <h3 className="cinema-side-title">Videos</h3>
              <ul className="cinema-video-list">
                {title.videos.map((video) => (
                  <li key={video.key}>
                    <a
                      href={`https://www.youtube.com/watch?v=${video.key}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="cinema-video-type">{video.type}</span>
                      <span className="cinema-video-name">{video.name}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className="cinema-title-side">
          <div className="cinema-title-poster-card">
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
            <div className="cinema-title-poster-meta">
              <h3 className="cinema-side-title">Airing</h3>
              <p className="cinema-side-body">
                <HugeiconsIcon
                  icon={Calendar03Icon}
                  strokeWidth={2}
                  size={12}
                />{" "}
                {released ?? "—"}
                {isTv && lastAir ? ` → ${lastAir}` : ""}
              </p>
              {title.runtimeMinutes ? (
                <p className="cinema-side-body">
                  <HugeiconsIcon icon={Clock01Icon} strokeWidth={2} size={12} />{" "}
                  {isTv ? "per episode" : "runtime"}:{" "}
                  {totalRuntimeLabel(title.runtimeMinutes)}
                </p>
              ) : null}
              {title.rating > 0 ? (
                <p className="cinema-side-body">
                  TMDB {title.rating.toFixed(1)} from{" "}
                  {formatCount(title.voteCount)} votes
                </p>
              ) : null}
            </div>
          </div>

          <LibraryPanel title={title} />

          <section className="cinema-side-card" aria-label="Synopsis">
            <h3 className="cinema-side-title">Synopsis</h3>
            {title.overview ? (
              <p className="cinema-side-body">{title.overview}</p>
            ) : (
              <p className="cinema-side-body is-empty">
                No synopsis has been written for this title yet.
              </p>
            )}
          </section>

          {rows.length > 0 ? (
            <section className="cinema-side-card" aria-label="Details">
              <h3 className="cinema-side-title">Details</h3>
              <dl className="cinema-facts">
                {rows.map((row) => (
                  <div key={row.label}>
                    <dt>{row.label}</dt>
                    <dd className={row.mono ? "cinema-mono" : undefined}>
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {title.crewGroups.length > 0 ? (
            <section className="cinema-side-card" aria-label="Crew">
              <h3 className="cinema-side-title">Crew</h3>
              <dl className="cinema-facts">
                {title.crewGroups.map((group) => (
                  <div key={group.label}>
                    <dt>{group.label}</dt>
                    <dd>{group.names.join(", ")}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {omdbRows.length > 0 || ratings?.plot ? (
            <section className="cinema-side-card" aria-label="OMDb">
              <h3 className="cinema-side-title">From OMDb</h3>
              <dl className="cinema-facts">
                {omdbRows.map((row) => (
                  <div key={row.label}>
                    <dt>{row.label}</dt>
                    <dd className={row.mono ? "cinema-mono" : undefined}>
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {title.providers.length > 0 ? (
            <section className="cinema-side-card" aria-label="Availability">
              <h3 className="cinema-side-title">Where to watch</h3>
              <div className="cinema-chip-row">
                {title.providers.map((provider) => (
                  <span
                    key={`${provider.kind}-${provider.name}`}
                    className="cinema-chip cinema-provider-chip"
                    title={PROVIDER_LABELS[provider.kind] ?? provider.kind}
                  >
                    {provider.name}
                    <em>{PROVIDER_LABELS[provider.kind] ?? provider.kind}</em>
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {title.keywords.length > 0 ? (
            <section className="cinema-side-card" aria-label="Keywords">
              <h3 className="cinema-side-title">Keywords</h3>
              <div className="cinema-chip-row">
                {title.keywords.map((keyword) => (
                  <span key={keyword} className="cinema-chip">
                    {keyword}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {title.alternativeTitles.length > 0 ? (
            <section className="cinema-side-card" aria-label="Also known as">
              <h3 className="cinema-side-title">Also known as</h3>
              <p className="cinema-side-body">
                {title.alternativeTitles.join(" · ")}
              </p>
            </section>
          ) : null}

          {links.length > 0 ? (
            <section className="cinema-side-card" aria-label="Links">
              <h3 className="cinema-side-title">Links</h3>
              <div className="cinema-link-row">
                {links.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cinema-link-btn"
                  >
                    {link.label}
                    <HugeiconsIcon
                      icon={LinkSquare02Icon}
                      strokeWidth={2}
                      size={11}
                    />
                  </a>
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </div>

      {title.reviews.length > 0 ? (
        <section aria-label="Reviews">
          <h3 className="cinema-rail-title">Reviews</h3>
          <div className="cinema-review-list">
            {title.reviews.map((review) => (
              <article key={review.id} className="cinema-review">
                <header>
                  <span className="cinema-review-author">{review.author}</span>
                  {review.rating ? (
                    <span className="cinema-review-score">
                      {review.rating.toFixed(1)}/10
                    </span>
                  ) : null}
                  <span className="cinema-review-date">
                    {review.createdAt
                      ? REVIEW_DATE.format(new Date(review.createdAt))
                      : ""}
                  </span>
                </header>
                <p>{review.excerpt}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

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
