"use client";

import { Button } from "@/components/ui/button";
import { CollectionGrid } from "@/components/admin/cinema/home/CollectionGrid";
import { HeroStage } from "@/components/admin/cinema/home/HeroStage";
import { HomeSkeleton } from "@/components/admin/cinema/home/HomeSkeleton";
import { TasteRail } from "@/components/admin/cinema/home/TasteRail";
import { MoodStrip } from "@/components/admin/cinema/home/MoodStrip";
import { PosterRail } from "@/components/admin/cinema/home/PosterRail";
import { StateNotice } from "@/components/admin/cinema/parts/StateNotice";
import type { CinemaListSource } from "@/components/admin/cinema/store/use-cinema-nav";
import { useCinemaFetch } from "@/components/admin/cinema/store/use-cinema-fetch";
import type {
  CinemaCollectionPayload,
  CinemaHomePayload,
  CinemaTitle,
} from "@/lib/cinema/types";

/**
 * Home. Editorial rather than algorithmic: one feature, ranked trending, four
 * curated rails, six collections, one mood strip — and every control on it
 * leads somewhere real.
 */
export function BrowseView({
  onOpenTitle,
  onOpenList,
}: {
  onOpenTitle: (title: CinemaTitle) => void;
  onOpenList: (source: CinemaListSource, id: string, title: string) => void;
}) {
  const { state, reload } =
    useCinemaFetch<CinemaHomePayload>("/api/cinema/home");

  if (state.kind === "loading") return <HomeSkeleton />;

  if (state.kind === "error") {
    return (
      <div className="cinema-scroll">
        <StateNotice
          title="The home shelf could not load"
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

  const { hero, heroIndex, rows, collections, moods, degraded } = state.data;

  if (hero.length === 0 && rows.length === 0) {
    return (
      <div className="cinema-scroll">
        <StateNotice
          title="Nothing to show yet"
          body="TMDB answered, but the catalogue came back empty. That usually means a key without access to this region, or an upstream outage."
          action={
            <Button size="xs" variant="outline" onClick={reload}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="cinema-scroll">
      <HeroStage pool={hero} initialIndex={heroIndex} onOpen={onOpenTitle} />

      <TasteRail initialTaste={state.data.taste ?? null} onOpen={onOpenTitle} />

      <MoodStrip
        moods={moods}
        onOpen={(mood) => onOpenList("mood", mood.id, mood.label)}
      />

      {rows.map((row) => (
        <PosterRail
          key={row.id}
          label={row.label}
          items={row.items}
          ranked={row.ranked}
          onOpen={onOpenTitle}
          onSeeAll={() => onOpenList("row", row.id, row.label)}
        />
      ))}

      <CollectionGrid
        collections={collections}
        onOpen={(collection: CinemaCollectionPayload) =>
          onOpenList("collection", collection.id, collection.label)
        }
      />

      {degraded.length > 0 ? (
        <StateNotice
          tone="quiet"
          title={`${degraded.length} shelf${degraded.length === 1 ? "" : "s"} unavailable`}
          body={`${degraded.join(", ")} did not answer. Everything else on this page is unaffected.`}
          action={
            <Button size="xs" variant="ghost" onClick={reload}>
              Refresh
            </Button>
          }
        />
      ) : null}
    </div>
  );
}
