"use client";

import { useRef } from "react";

import { TMDB_PROFILE_SIZE } from "@/lib/cinema/config";
import { tmdbProfileUrl } from "@/lib/cinema/images";
import type { CinemaCastCredit } from "@/lib/cinema/types";

/**
 * Cast & crew faces.
 *
 * Every card is a button that opens that person's filmography — the reference
 * app rendered cast as inert text, which is the entire reason its "select an
 * actor" idea was unreachable.
 */
export function CastRail({
  cast,
  onOpenPerson,
}: {
  cast: CinemaCastCredit[];
  onOpenPerson: (personId: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollByCard = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>(".cinema-cast-card");
    const step = card ? card.offsetWidth + 8 : track.clientWidth * 0.8;
    track.scrollBy({ left: direction * step, behavior: "smooth" });
  };

  if (cast.length === 0) return null;

  return (
    <section className="cinema-cast" aria-label="Cast">
      <h3 className="cinema-rail-title">Cast</h3>
      <div
        className="cinema-cast-track"
        ref={trackRef}
        tabIndex={0}
        role="group"
        aria-label="Cast — use arrow keys to scroll"
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
        {cast.map((member) => {
          const portrait = tmdbProfileUrl(
            member.profilePath,
            TMDB_PROFILE_SIZE.rail,
          );
          return (
            <button
              key={`${member.tmdbId}-${member.order}`}
              type="button"
              className="cinema-cast-card"
              onClick={() => onOpenPerson(member.tmdbId)}
              aria-label={`Open filmography for ${member.name}`}
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
                    {member.name.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </span>
              <span className="cinema-cast-name">{member.name}</span>
              {member.character ? (
                <span className="cinema-cast-role" title={member.character}>
                  {member.character}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
