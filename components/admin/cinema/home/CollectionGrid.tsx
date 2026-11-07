"use client";

import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { tmdbBackdropUrl } from "@/lib/cinema/images";
import type { CinemaCollectionPayload } from "@/lib/cinema/types";

/**
 * Six curated shelves. Each tile is a two-up backdrop collage with the label in
 * the corner — colour comes from the artwork, never from a brand accent.
 */
export function CollectionGrid({
  collections,
  onOpen,
}: {
  collections: CinemaCollectionPayload[];
  onOpen: (collection: CinemaCollectionPayload) => void;
}) {
  if (collections.length === 0) return null;

  return (
    <section className="cinema-collections" aria-label="Collections">
      <header className="cinema-rail-head">
        <h3 className="cinema-rail-title">Collections</h3>
      </header>
      <div className="cinema-collection-grid">
        {collections.map((collection) => (
          <button
            key={collection.id}
            type="button"
            className="cinema-collection"
            onClick={() => onOpen(collection)}
          >
            <span className="cinema-collection-art" aria-hidden>
              {collection.backdrops.length > 0 ? (
                collection.backdrops.map((path) => {
                  const url = tmdbBackdropUrl(path, "w780");
                  return url ? (
                    <img
                      key={path}
                      src={url}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                    />
                  ) : null;
                })
              ) : (
                <span className="cinema-collection-fallback" />
              )}
            </span>
            <span className="cinema-collection-scrim" aria-hidden />
            <span className="cinema-collection-copy">
              <span className="cinema-collection-label">
                {collection.label}
              </span>
              <span className="cinema-collection-blurb">
                {collection.blurb}
              </span>
            </span>
            <span className="cinema-collection-arrow" aria-hidden>
              <HugeiconsIcon
                icon={ArrowUpRight01Icon}
                strokeWidth={2}
                size={13}
              />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
