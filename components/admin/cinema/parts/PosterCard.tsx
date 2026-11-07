"use client";

import { StarIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { TMDB_IMAGE_SIZES_ATTR, TMDB_POSTER_SIZE } from "@/lib/cinema/config";
import { tmdbPosterUrl } from "@/lib/cinema/images";
import type { CinemaTitle } from "@/lib/cinema/types";

/**
 * The one tile used by rails, grids and search results.
 *
 * A plain `<img>` against TMDB's CDN is intentional: the path segment (`w342`)
 * already selects a right-sized WebP, so routing several thousand posters
 * through the Next optimiser would add latency and a bill without improving
 * the bytes. Width/height are declared so nothing shifts while loading.
 */
export function PosterCard({
  title,
  rank,
  subtitle,
  onOpen,
  priority = false,
}: {
  title: CinemaTitle;
  rank?: number;
  /** Character name or crew job — shown instead of the year when present. */
  subtitle?: string | null;
  onOpen: (title: CinemaTitle) => void;
  priority?: boolean;
}) {
  const poster = tmdbPosterUrl(title.posterPath, TMDB_POSTER_SIZE.card);
  /* TMDB's CDN is path-sized, so a hand-written srcSet gives the browser three
     real choices instead of forcing the widest tile on every window. */
  const srcSet = title.posterPath
    ? [
        `${tmdbPosterUrl(title.posterPath, "w185")} 185w`,
        `${tmdbPosterUrl(title.posterPath, "w342")} 342w`,
        `${tmdbPosterUrl(title.posterPath, "w500")} 500w`,
      ].join(", ")
    : undefined;
  const meta = [title.year ?? null, title.mediaType === "tv" ? "Series" : null]
    .filter(Boolean)
    .join(" · ");
  const caption = subtitle?.trim() ? subtitle.trim() : meta;

  return (
    <figure className={`cinema-card${rank ? " is-ranked" : ""}`}>
      {rank ? (
        <span className="cinema-card-rank" aria-hidden>
          {rank}
        </span>
      ) : null}
      <button
        type="button"
        className="cinema-card-hit"
        onClick={() => onOpen(title)}
        aria-label={`Open ${title.title}${title.year ? ` (${title.year})` : ""}`}
      >
        <span className="cinema-card-art">
          {poster ? (
            <img
              src={poster}
              srcSet={srcSet}
              alt=""
              width={342}
              height={513}
              sizes={TMDB_IMAGE_SIZES_ATTR.posterCard}
              loading={priority ? "eager" : "lazy"}
              decoding="async"
              draggable={false}
            />
          ) : (
            <span className="cinema-card-blank" aria-hidden>
              {title.title.slice(0, 1).toUpperCase()}
            </span>
          )}
          {title.rating > 0 ? (
            <span className="cinema-card-score">
              <HugeiconsIcon icon={StarIcon} strokeWidth={2} size={10} />
              {title.rating.toFixed(1)}
            </span>
          ) : null}
        </span>
        <span className="cinema-card-title">{title.title}</span>
        {caption ? (
          <span className="cinema-card-meta" title={caption}>
            {caption}
          </span>
        ) : null}
      </button>
    </figure>
  );
}
