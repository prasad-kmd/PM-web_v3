"use client";

import { useRef } from "react";

import { TMDB_PROFILE_SIZE } from "@/lib/cinema/config";
import { tmdbProfileUrl } from "@/lib/cinema/images";

export type FaceCard = {
  id: number;
  name: string;
  /** Character name, or the crew job. */
  sub: string | null;
  profilePath: string | null;
};

/**
 * Horizontal rail of faces — the shape shared by Cast and Crew.
 *
 * Arrow keys scroll it, every card is a real button that opens that person's
 * filmography, and missing portraits fall back to an initial rather than a
 * broken image.
 */
export function FaceRail({
  label,
  people,
  onOpenPerson,
  ariaLabel,
}: {
  label: string;
  people: FaceCard[];
  onOpenPerson: (personId: number) => void;
  ariaLabel?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollByCard = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>(".cinema-cast-card");
    const step = card ? card.offsetWidth + 8 : track.clientWidth * 0.8;
    track.scrollBy({ left: direction * step, behavior: "smooth" });
  };

  if (people.length === 0) return null;

  return (
    <section className="cinema-cast" aria-label={ariaLabel ?? label}>
      <h3 className="cinema-rail-title">{label}</h3>
      <div
        className="cinema-cast-track"
        ref={trackRef}
        tabIndex={0}
        role="group"
        aria-label={`${label} — use arrow keys to scroll`}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") {
            event.preventDefault();
            scrollByCard(1);
          } else if (event.key === "ArrowLeft") {
            event.preventDefault();
            scrollByCard(-1);
          }
        }}
      >
        {people.map((person, index) => {
          const portrait = tmdbProfileUrl(
            person.profilePath,
            TMDB_PROFILE_SIZE.rail,
          );
          return (
            <button
              key={`${person.id}-${index}`}
              type="button"
              className="cinema-cast-card"
              onClick={() => onOpenPerson(person.id)}
              aria-label={`Open filmography for ${person.name}`}
            >
              <span className="cinema-cast-avatar">
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
              <span className="cinema-cast-name">{person.name}</span>
              {person.sub ? (
                <span className="cinema-cast-role" title={person.sub}>
                  {person.sub}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
