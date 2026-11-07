"use client";

import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMemo, useState } from "react";

import { PosterCard } from "@/components/admin/cinema/parts/PosterCard";
import { StateNotice } from "@/components/admin/cinema/parts/StateNotice";
import { useCinemaFetch } from "@/components/admin/cinema/store/use-cinema-fetch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { tmdbProfileUrl } from "@/lib/cinema/images";
import type {
  CinemaFilmography,
  CinemaFilmographyCredit,
  CinemaTitle,
} from "@/lib/cinema/types";

type Track = "all" | "movie" | "tv" | "acting" | "crew";
type Sort = "newest" | "rating" | "popularity" | "alpha";

const TRACKS: { id: Track; label: string }[] = [
  { id: "all", label: "All" },
  { id: "movie", label: "Films" },
  { id: "tv", label: "Series" },
  { id: "acting", label: "Acting" },
  { id: "crew", label: "Crew" },
];

const SORT_ITEMS = [
  { value: "newest", label: "Newest first" },
  { value: "rating", label: "Highest rated" },
  { value: "popularity", label: "Most popular" },
  { value: "alpha", label: "A–Z" },
];

function matchesTrack(credit: CinemaFilmographyCredit, track: Track): boolean {
  switch (track) {
    case "movie":
      return credit.mediaType === "movie";
    case "tv":
      return credit.mediaType === "tv";
    case "acting":
      return credit.creditKind === "cast";
    case "crew":
      return credit.creditKind === "crew";
    default:
      return true;
  }
}

function sortCredits(
  credits: CinemaFilmographyCredit[],
  sort: Sort,
): CinemaFilmographyCredit[] {
  const next = [...credits];
  next.sort((a, b) => {
    if (sort === "rating")
      return b.rating - a.rating || b.voteCount - a.voteCount;
    if (sort === "popularity") return b.popularity - a.popularity;
    if (sort === "alpha") return a.title.localeCompare(b.title);
    return (b.year ?? 0) - (a.year ?? 0) || b.rating - a.rating;
  });
  return next;
}

/**
 * Actor / crew filmography.
 *
 * Every face in a cast list leads here: `combined_credits` merged on the server,
 * then filtered and sorted locally because TMDB cannot page TV credits by cast
 * (`discover/tv` has no `with_cast`).
 */
export function PersonView({
  personId,
  onBack,
  onOpenTitle,
}: {
  personId: number;
  onBack: () => void;
  onOpenTitle: (title: CinemaTitle) => void;
}) {
  const { state, reload } = useCinemaFetch<CinemaFilmography>(
    `/api/cinema/person/${personId}`,
  );
  const [track, setTrack] = useState<Track>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [bioOpen, setBioOpen] = useState(false);

  const credits = state.kind === "ready" ? state.data.credits : [];
  const visible = useMemo(
    () =>
      sortCredits(
        credits.filter((credit) => matchesTrack(credit, track)),
        sort,
      ),
    [credits, sort, track],
  );

  if (state.kind === "loading") {
    return (
      <div className="cinema-scroll">
        <div className="cinema-person-head">
          <Skeleton className="size-[84px] rounded-full" />
          <div className="cinema-person-head-copy">
            <Skeleton className="h-6 w-52" />
            <Skeleton className="h-3.5 w-72 max-w-full" />
          </div>
        </div>
        <div className="cinema-grid">
          {Array.from({ length: 12 }, (_, index) => (
            <div key={index} className="cinema-grid-cell">
              <Skeleton className="state-skel-cinema-tile" />
              <Skeleton className="h-2.5 w-[85%]" />
            </div>
          ))}
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
            <h2 className="cinema-page-title">Person</h2>
          </div>
        </header>
        <StateNotice
          title="This filmography could not be loaded"
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

  const { person, counts } = state.data;
  const portrait = tmdbProfileUrl(person.profilePath, "h632");
  const life = [person.birthday, person.deathday].filter(Boolean).join(" – ");

  return (
    <div className="cinema-scroll">
      <header className="cinema-person-head">
        <Button
          size="icon-xs"
          variant="ghost"
          onClick={onBack}
          aria-label="Back"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} size={14} />
        </Button>

        <span className="cinema-person-head-avatar">
          {portrait ? (
            <img
              src={portrait}
              alt=""
              width={185}
              height={185}
              decoding="async"
            />
          ) : (
            <span aria-hidden>{person.name.slice(0, 1).toUpperCase()}</span>
          )}
        </span>

        <div className="cinema-person-head-copy">
          <h2 className="cinema-page-title">{person.name}</h2>
          <p className="cinema-page-sub">
            {[person.knownForDepartment, life, person.placeOfBirth]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <p className="cinema-person-counts">
            {counts.movie} film{counts.movie === 1 ? "" : "s"} · {counts.tv}{" "}
            series · {counts.acting} acting · {counts.crew} crew
          </p>
        </div>
      </header>

      {person.biography ? (
        <div className="cinema-bio">
          <p className={bioOpen ? "" : "is-clamped"}>{person.biography}</p>
          <button
            type="button"
            className="cinema-link-btn"
            onClick={() => setBioOpen((value) => !value)}
          >
            {bioOpen ? "Show less" : "Read more"}
          </button>
        </div>
      ) : null}

      <div className="cinema-filter-row">
        <div
          className="cinema-filter-chips"
          role="group"
          aria-label="Filter credits"
        >
          {TRACKS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTrack(item.id)}
              className={`cinema-filter-chip${track === item.id ? " is-active" : ""}`}
              aria-pressed={track === item.id}
            >
              {item.label}
            </button>
          ))}
        </div>

        <Select
          items={SORT_ITEMS}
          value={sort}
          onValueChange={(value) => {
            if (typeof value === "string") setSort(value as Sort);
          }}
        >
          <SelectTrigger className="min-w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectPopup>
            {SORT_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
      </div>

      {visible.length === 0 ? (
        <StateNotice
          title="Nothing in this filter"
          body={`TMDB lists no ${track === "all" ? "" : `${track} `}credits for ${person.name}.`}
        />
      ) : (
        <div className="cinema-grid">
          {visible.map((credit) => (
            <PosterCard
              key={credit.key}
              title={credit}
              subtitle={
                credit.creditKind === "cast"
                  ? credit.character
                  : (credit.job ?? credit.department)
              }
              onOpen={onOpenTitle}
            />
          ))}
        </div>
      )}
    </div>
  );
}
