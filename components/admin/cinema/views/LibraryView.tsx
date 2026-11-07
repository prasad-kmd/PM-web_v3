"use client";

import { Bookmark01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMemo, useState } from "react";

import { PosterRail } from "@/components/admin/cinema/home/PosterRail";
import { PosterCard } from "@/components/admin/cinema/parts/PosterCard";
import { StateNotice } from "@/components/admin/cinema/parts/StateNotice";
import { useCinemaLibrary } from "@/components/admin/cinema/store/LibraryProvider";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CINEMA_LIBRARY_STATUSES,
  type CinemaLibraryStatus,
} from "@/lib/cinema/config";
import type { CinemaLibraryEntry, CinemaTitle } from "@/lib/cinema/types";

type TypeFilter = "all" | "movie" | "tv";
type Sort = "recent" | "title" | "year" | "rating";

const SORT_ITEMS = [
  { value: "recent", label: "Recently updated" },
  { value: "title", label: "Title A–Z" },
  { value: "year", label: "Newest release" },
  { value: "rating", label: "Highest rated" },
];

function toTitle(entry: CinemaLibraryEntry): CinemaTitle {
  return {
    key: entry.titleKey,
    tmdbId: entry.tmdbId,
    mediaType: entry.mediaType,
    title: entry.title,
    year: entry.year,
    overview: "",
    posterPath: entry.posterPath,
    backdropPath: null,
    rating: entry.rating ?? 0,
    voteCount: 0,
    popularity: 0,
    originalLanguage: null,
  };
}

function sortEntries(entries: CinemaLibraryEntry[], sort: Sort) {
  const next = [...entries];
  next.sort((a, b) => {
    if (sort === "title") return a.title.localeCompare(b.title);
    if (sort === "year") return (b.year ?? 0) - (a.year ?? 0);
    if (sort === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
    return b.updatedAt.localeCompare(a.updatedAt);
  });
  return next;
}

/**
 * The library: what has been saved, what is in progress, and what the owner
 * thought of it. Reads from the shared provider, so a status change made on a
 * title page is already reflected here without a reload.
 */
export function LibraryView({
  onOpenTitle,
  onBrowse,
}: {
  onOpenTitle: (title: CinemaTitle) => void;
  onBrowse: () => void;
}) {
  const { ready, entries, byTitleKey } = useCinemaLibrary();
  const [status, setStatus] = useState<CinemaLibraryStatus | "all">("all");
  const [type, setType] = useState<TypeFilter>("all");
  const [sort, setSort] = useState<Sort>("recent");

  const counts = useMemo(() => {
    const map = new Map<CinemaLibraryStatus, number>();
    for (const status of CINEMA_LIBRARY_STATUSES) map.set(status, 0);
    for (const entry of entries) {
      map.set(entry.status, (map.get(entry.status) ?? 0) + 1);
    }
    return map;
  }, [entries]);

  const watching = useMemo(
    () =>
      entries.filter(
        (entry) =>
          entry.mediaType === "tv" &&
          (entry.status === "Watching" || Boolean(entry.progress)),
      ),
    [entries],
  );

  const visible = useMemo(() => {
    const filtered = entries.filter((entry) => {
      if (status !== "all" && entry.status !== status) return false;
      if (type !== "all" && entry.mediaType !== type) return false;
      return true;
    });
    return sortEntries(filtered, sort);
  }, [entries, sort, status, type]);

  if (!ready) {
    return (
      <div className="cinema-scroll">
        <div className="cinema-grid">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="cinema-grid-cell">
              <Skeleton className="state-skel-cinema-tile" />
              <Skeleton className="h-2.5 w-[85%]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="cinema-scroll">
        <div className="cinema-empty">
          <span className="cinema-empty-glyph" aria-hidden>
            <HugeiconsIcon icon={Bookmark01Icon} strokeWidth={1.6} size={22} />
          </span>
          <h2 className="cinema-stage-title">Your library is empty</h2>
          <p className="cinema-stage-body">
            Open any title and pick a status — Favourite, Watchlist, Watching,
            Watched or Dropped. Rows are stored in Notion, so they survive a
            different device.
          </p>
          <button type="button" className="cinema-mood-chip" onClick={onBrowse}>
            Browse the catalogue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cinema-scroll">
      <header className="cinema-library-head">
        <div>
          <h2 className="cinema-page-title">Library</h2>
          <p className="cinema-page-sub">
            {entries.length} saved · {counts.get("Watching") ?? 0} in progress ·{" "}
            {counts.get("Watched") ?? 0} finished
          </p>
        </div>
        <Select
          items={SORT_ITEMS}
          value={sort}
          onValueChange={(value) => {
            if (typeof value === "string") setSort(value as Sort);
          }}
        >
          <SelectTrigger className="min-w-40">
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
      </header>

      {watching.length > 0 && status === "all" && type === "all" ? (
        <PosterRail
          label="Continue watching"
          items={watching.map(toTitle)}
          onOpen={onOpenTitle}
        />
      ) : null}

      <div className="cinema-filter-row">
        <div
          className="cinema-filter-chips"
          role="group"
          aria-label="Filter by status"
        >
          <button
            type="button"
            onClick={() => setStatus("all")}
            className={`cinema-filter-chip${status === "all" ? " is-active" : ""}`}
            aria-pressed={status === "all"}
          >
            All ({entries.length})
          </button>
          {CINEMA_LIBRARY_STATUSES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setStatus(item)}
              className={`cinema-filter-chip${status === item ? " is-active" : ""}`}
              aria-pressed={status === item}
            >
              {item} ({counts.get(item) ?? 0})
            </button>
          ))}
        </div>

        <div
          className="cinema-filter-chips"
          role="group"
          aria-label="Filter by type"
        >
          {(
            [
              { id: "all", label: "All" },
              { id: "movie", label: "Films" },
              { id: "tv", label: "Series" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setType(item.id)}
              className={`cinema-filter-chip${type === item.id ? " is-active" : ""}`}
              aria-pressed={type === item.id}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <StateNotice
          title="Nothing in this filter"
          body="No saved titles match that status and type yet."
        />
      ) : (
        <div className="cinema-grid">
          {visible.map((entry) => (
            <PosterCard
              key={entry.id}
              title={toTitle(entry)}
              subtitle={[
                entry.status,
                entry.progress,
                entry.notes ? "· note" : null,
              ]
                .filter(Boolean)
                .join(" · ")
                .replace(" · · ", " · ")}
              onOpen={onOpenTitle}
            />
          ))}
        </div>
      )}

      <p className="cinema-panel-hint">
        {byTitleKey.size} rows reconciled with the library store.
      </p>
    </div>
  );
}
