"use client";

import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRef } from "react";

import { PosterCard } from "@/components/admin/cinema/parts/PosterCard";
import type { CinemaTitle } from "@/lib/cinema/types";

/**
 * One rail implementation for every row on the page (the reference app
 * copy-pasted the same 22-line block four times, so one bug became four).
 *
 * The track is a focusable scroller: ← / → move by one tile, Home / End jump.
 * Cards are ordinary buttons, so keyboard and touch reach everything the mouse
 * can.
 */
export function PosterRail({
  label,
  items,
  ranked = false,
  onOpen,
  onSeeAll,
}: {
  label: string;
  items: CinemaTitle[];
  ranked?: boolean;
  onOpen: (title: CinemaTitle) => void;
  onSeeAll?: () => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollByTile = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const first = track.querySelector<HTMLElement>(".cinema-card");
    const step = first ? first.offsetWidth + 10 : track.clientWidth * 0.8;
    track.scrollBy({ left: direction * step, behavior: "smooth" });
  };

  if (items.length === 0) return null;

  return (
    <section className="cinema-rail" aria-label={label}>
      <header className="cinema-rail-head">
        <h3 className="cinema-rail-title">{label}</h3>
        {onSeeAll ? (
          <button type="button" className="cinema-link-btn" onClick={onSeeAll}>
            See all
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} size={12} />
          </button>
        ) : null}
      </header>

      <div
        className="cinema-rail-track"
        ref={trackRef}
        tabIndex={0}
        role="group"
        aria-label={`${label} — use arrow keys to scroll`}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") {
            event.preventDefault();
            scrollByTile(1);
          } else if (event.key === "ArrowLeft") {
            event.preventDefault();
            scrollByTile(-1);
          } else if (event.key === "Home") {
            event.preventDefault();
            trackRef.current?.scrollTo({ left: 0, behavior: "smooth" });
          } else if (event.key === "End") {
            event.preventDefault();
            trackRef.current?.scrollTo({
              left: trackRef.current.scrollWidth,
              behavior: "smooth",
            });
          }
        }}
      >
        {items.map((title, index) => (
          <PosterCard
            key={title.key}
            title={title}
            rank={ranked && index < 10 ? index + 1 : undefined}
            onOpen={onOpen}
          />
        ))}
      </div>
    </section>
  );
}
