"use client";

import {
  Cancel01Icon,
  Search01Icon,
  Time04Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { PosterCard } from "@/components/admin/cinema/parts/PosterCard";
import { StateNotice } from "@/components/admin/cinema/parts/StateNotice";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { tmdbProfileUrl } from "@/lib/cinema/images";
import type {
  CinemaPersonSummary,
  CinemaSearchResults,
  CinemaTitle,
} from "@/lib/cinema/types";

const RECENT_KEY = "pm.cinema.search.recent.v1";
const DEBOUNCE_MS = 280;

type Filter = "all" | "movie" | "tv" | "person";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "movie", label: "Films" },
  { id: "tv", label: "Series" },
  { id: "person", label: "People" },
];

/** The term lives in `?q=` so Back restores the list; read it on mount. */
function readUrlQuery(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("q") ?? "";
}

function readRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed
          .filter((item): item is string => typeof item === "string")
          .slice(0, 6)
      : [];
  } catch {
    return [];
  }
}

function pushRecent(term: string): string[] {
  const next = [term, ...readRecent().filter((item) => item !== term)].slice(
    0,
    6,
  );
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* storage may be unavailable — recents are a convenience, not state */
  }
  return next;
}

/**
 * Search across films, series and people.
 *
 * Debounced and paged, with the people track kept visible — the reference app
 * pushed a full page navigation on every submit and discarded person results
 * entirely.
 */
export function SearchView({
  initialQuery,
  onOpenTitle,
  onOpenPerson,
  onQueryChange,
}: {
  initialQuery: string;
  onOpenTitle: (title: CinemaTitle) => void;
  onOpenPerson: (person: CinemaPersonSummary) => void;
  /** Lets the shell remember the query when the owner opens a result. */
  onQueryChange?: (query: string) => void;
}) {
  const [openingQuery] = useState(() => initialQuery || readUrlQuery());
  const [input, setInput] = useState(openingQuery);
  const [term, setTerm] = useState(openingQuery.trim());
  const [filter, setFilter] = useState<Filter>("all");
  const [recent, setRecent] = useState<string[]>([]);

  const [titles, setTitles] = useState<CinemaTitle[]>([]);
  const [people, setPeople] = useState<CinemaPersonSummary[]>([]);
  const [meta, setMeta] = useState<{ page: number; totalPages: number } | null>(
    null,
  );
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRecent(readRecent());
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setTerm(input.trim()), DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [input]);

  const load = useCallback(
    async (query: string, page: number, mode: "replace" | "append") => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (mode === "replace") {
        setStatus("loading");
        setTitles([]);
        setPeople([]);
        setMeta(null);
      } else {
        setLoadingMore(true);
      }

      try {
        const response = await fetch(
          `/api/cinema/search?q=${encodeURIComponent(query)}&page=${page}`,
          { cache: "no-store", signal: controller.signal },
        );
        const payload = (await response.json().catch(() => null)) as
          (CinemaSearchResults & { error?: string }) | null;

        if (!response.ok || !payload) {
          setStatus("error");
          setMessage(payload?.error ?? "Search is unavailable right now.");
          return;
        }

        setTitles((current) =>
          mode === "append" ? [...current, ...payload.titles] : payload.titles,
        );
        setPeople((current) =>
          mode === "append" ? [...current, ...payload.people] : payload.people,
        );
        setMeta({ page: payload.page, totalPages: payload.totalPages });
        setStatus("ready");
        if (payload.titles.length > 0 || payload.people.length > 0) {
          setRecent(pushRecent(query));
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        setStatus("error");
        setMessage("Could not reach the studio service.");
      } finally {
        setLoadingMore(false);
      }
    },
    [],
  );

  useEffect(() => {
    onQueryChange?.(term);
  }, [onQueryChange, term]);

  useEffect(() => {
    if (term.length < 2) {
      abortRef.current?.abort();
      setStatus("idle");
      setTitles([]);
      setPeople([]);
      setMeta(null);
      return;
    }
    void load(term, 1, "replace");
    return () => abortRef.current?.abort();
  }, [load, term]);

  const showPeople =
    (filter === "all" || filter === "person") && people.length > 0;
  const visibleTitles = titles.filter((title) =>
    filter === "all" || filter === "person" ? true : title.mediaType === filter,
  );
  const showTitles = filter !== "person";
  const canLoadMore = Boolean(meta && meta.page < meta.totalPages);
  const hasResults = titles.length > 0 || people.length > 0;

  return (
    <div className="cinema-scroll">
      <div className="cinema-search-head">
        <div className="cinema-search-field">
          <HugeiconsIcon icon={Search01Icon} strokeWidth={2} size={14} />
          <input
            ref={inputRef}
            type="search"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Search films, series and people"
            aria-label="Search films, series and people"
            spellCheck={false}
            autoComplete="off"
          />
          {input ? (
            <button
              type="button"
              className="cinema-search-clear"
              onClick={() => {
                setInput("");
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
            >
              <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} size={13} />
            </button>
          ) : null}
        </div>

        <div
          className="cinema-filter-chips"
          role="group"
          aria-label="Filter results"
        >
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`cinema-filter-chip${filter === item.id ? " is-active" : ""}`}
              aria-pressed={filter === item.id}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {status === "idle" ? (
        <div className="cinema-search-idle">
          {recent.length > 0 ? (
            <>
              <p className="cinema-search-hint">Recent</p>
              <div className="cinema-chip-row">
                {recent.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="cinema-mood-chip"
                    onClick={() => {
                      setInput(item);
                      setTerm(item);
                    }}
                  >
                    <HugeiconsIcon
                      icon={Time04Icon}
                      strokeWidth={2}
                      size={11}
                    />
                    {item}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="cinema-search-hint">
              Two characters is enough to start. People are searchable too —
              open anyone to see their full filmography.
            </p>
          )}
        </div>
      ) : status === "loading" ? (
        <div className="cinema-grid">
          {Array.from({ length: 10 }, (_, index) => (
            <div key={index} className="cinema-grid-cell">
              <Skeleton className="state-skel-cinema-tile" />
              <Skeleton className="h-2.5 w-[85%]" />
            </div>
          ))}
        </div>
      ) : status === "error" ? (
        <StateNotice
          title="Search failed"
          body={message}
          action={
            <Button
              size="xs"
              variant="outline"
              onClick={() => void load(term, 1, "replace")}
            >
              Retry
            </Button>
          }
        />
      ) : !hasResults ? (
        <StateNotice
          title={`No matches for “${term}”`}
          body="Try a shorter query, the original title, or a person's name."
        />
      ) : (
        <>
          {showPeople ? (
            <section className="cinema-people" aria-label="People">
              <h3 className="cinema-rail-title">People</h3>
              <div className="cinema-people-track">
                {people.map((person) => {
                  const portrait = tmdbProfileUrl(person.profilePath, "w185");
                  return (
                    <button
                      key={person.tmdbId}
                      type="button"
                      className="cinema-person-card"
                      onClick={() => onOpenPerson(person)}
                    >
                      <span className="cinema-person-avatar">
                        {portrait ? (
                          <img
                            src={portrait}
                            alt=""
                            width={185}
                            height={185}
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <span aria-hidden>
                            {person.name.slice(0, 1).toUpperCase()}
                          </span>
                        )}
                      </span>
                      <span className="cinema-person-name">{person.name}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {filter === "person" && people.length === 0 ? (
            <StateNotice
              title="No people matched"
              body="Switch back to All to see the film and series results."
            />
          ) : null}

          {showTitles && visibleTitles.length > 0 ? (
            <section aria-label="Titles">
              <h3 className="cinema-rail-title cinema-section-title">Titles</h3>
              <div className="cinema-grid">
                {visibleTitles.map((item) => (
                  <PosterCard
                    key={item.key}
                    title={item}
                    onOpen={onOpenTitle}
                  />
                ))}
              </div>
              <div className="cinema-load-more">
                {canLoadMore ? (
                  <Button
                    size="sm"
                    variant="outline"
                    loading={loadingMore}
                    onClick={() =>
                      void load(term, (meta?.page ?? 1) + 1, "append")
                    }
                  >
                    Load more
                  </Button>
                ) : (
                  <p className="cinema-end-note">End of results</p>
                )}
              </div>
            </section>
          ) : showTitles ? (
            <StateNotice
              title="No titles for this filter"
              body="People matched, but nothing in films or series did. Switch to All to see them."
            />
          ) : null}
        </>
      )}
    </div>
  );
}
