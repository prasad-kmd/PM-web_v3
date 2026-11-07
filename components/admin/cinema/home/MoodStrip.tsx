"use client";

import { SparklesIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

/**
 * A row of one-tap filters. Cheap to render, and it gives the page a signature
 * the reference never had — a way in that isn't "scroll further".
 */
export function MoodStrip({
  moods,
  onOpen,
}: {
  moods: { id: string; label: string }[];
  onOpen: (mood: { id: string; label: string }) => void;
}) {
  if (moods.length === 0) return null;

  return (
    <section className="cinema-moods" aria-label="Pick a mood">
      <span className="cinema-moods-label">
        <HugeiconsIcon icon={SparklesIcon} strokeWidth={1.8} size={12} />
        Pick a mood
      </span>
      <div className="cinema-mood-chips">
        {moods.map((mood) => (
          <button
            key={mood.id}
            type="button"
            className="cinema-mood-chip"
            onClick={() => onOpen(mood)}
          >
            {mood.label}
          </button>
        ))}
      </div>
    </section>
  );
}
