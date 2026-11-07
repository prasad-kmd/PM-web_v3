"use client";

import { Delete02Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useState } from "react";

import { useCinemaLibrary } from "@/components/admin/cinema/store/LibraryProvider";
import { Button } from "@/components/ui/button";
import { CINEMA_LIBRARY_STATUSES } from "@/lib/cinema/config";
import type { CinemaLibraryStatus } from "@/lib/cinema/config";
import type { CinemaTitleDetail } from "@/lib/cinema/types";

const RATINGS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/**
 * Library controls for one title.
 *
 * Status chips double as the add/remove control: pressing the active status
 * clears the row, so there is one obvious way to do both.
 */
export function LibraryPanel({ title }: { title: CinemaTitleDetail }) {
  const { byTitleKey, save, patch, remove, saving } = useCinemaLibrary();
  const entry = byTitleKey.get(title.key) ?? null;

  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setNotes(entry?.notes ?? "");
    setDirty(false);
  }, [entry?.id, entry?.notes]);

  async function setStatus(status: CinemaLibraryStatus) {
    if (entry && entry.status === status) {
      await remove(entry.id);
      return;
    }
    if (entry) {
      await patch(entry.id, { status });
      return;
    }
    await save({
      titleKey: title.key,
      tmdbId: title.tmdbId,
      mediaType: title.mediaType,
      title: title.title,
      year: title.year,
      status,
      genres: title.genres.slice(0, 8),
      posterPath: title.posterPath,
      runtimeMinutes: title.runtimeMinutes,
      seasons: title.seasons,
    });
  }

  async function setRating(value: number) {
    if (!entry) return;
    await patch(entry.id, { rating: entry.rating === value ? null : value });
  }

  async function commitNotes() {
    if (!entry || !dirty) return;
    await patch(entry.id, { notes });
    setDirty(false);
  }

  const progress = entry?.progress ?? null;

  return (
    <section className="cinema-library-panel" aria-label="Library">
      <div className="cinema-library-row">
        <span className="cinema-panel-label">Library</span>
        <div
          className="cinema-filter-chips"
          role="group"
          aria-label="Library status"
        >
          {CINEMA_LIBRARY_STATUSES.map((status) => {
            const active = entry?.status === status;
            return (
              <button
                key={status}
                type="button"
                className={`cinema-filter-chip${active ? " is-active" : ""}`}
                onClick={() => void setStatus(status)}
                aria-pressed={active}
                disabled={saving}
              >
                {active ? (
                  <HugeiconsIcon
                    icon={Tick02Icon}
                    strokeWidth={2.4}
                    size={10}
                  />
                ) : null}
                {status}
              </button>
            );
          })}
        </div>

        {entry ? (
          <Button
            size="xs"
            variant="ghost"
            onClick={() => void remove(entry.id)}
            disabled={saving}
            aria-label="Remove from library"
          >
            <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} size={12} />
            Remove
          </Button>
        ) : null}
      </div>

      {entry ? (
        <div className="cinema-library-grid">
          <div className="cinema-library-field">
            <span className="cinema-panel-label">My rating</span>
            <div
              className="cinema-rating-row"
              role="group"
              aria-label="My rating"
            >
              {RATINGS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`cinema-rating-dot${
                    entry.rating === value ? " is-active" : ""
                  }`}
                  onClick={() => void setRating(value)}
                  aria-pressed={entry.rating === value}
                  aria-label={`Rate ${value} out of 10`}
                >
                  {value}
                </button>
              ))}
            </div>
            {progress ? (
              <span className="cinema-panel-hint">Watching · {progress}</span>
            ) : null}
          </div>

          <div className="cinema-library-field">
            <label className="cinema-panel-label" htmlFor="cinema-notes">
              Notes
            </label>
            <textarea
              id="cinema-notes"
              className="cinema-notes"
              value={notes}
              rows={3}
              maxLength={2000}
              placeholder="Why it's here, where you stopped, who to watch it with…"
              onChange={(event) => {
                setNotes(event.target.value);
                setDirty(true);
              }}
              onBlur={() => void commitNotes()}
            />
            {dirty ? (
              <Button
                size="xs"
                variant="outline"
                onClick={() => void commitNotes()}
              >
                Save note
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="cinema-panel-hint">
          Pick a status to save this title — it lands in your Notion library.
        </p>
      )}
    </section>
  );
}
