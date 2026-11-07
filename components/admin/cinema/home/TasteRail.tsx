"use client";
import { useEffect, useState } from "react";
import { PosterRail } from "@/components/admin/cinema/home/PosterRail";
import { TastePanel } from "@/components/admin/cinema/parts/TastePanel";
import { useCinemaLibrary } from "@/components/admin/cinema/store/LibraryProvider";
import type { CinemaTastePayload, CinemaTitle } from "@/lib/cinema/types";

const ANGLES = ["rating", "popular", "recent"] as const;
export function TasteRail({
  initialTaste,
  onOpen,
}: {
  initialTaste: CinemaTastePayload | null;
  onOpen: (title: CinemaTitle) => void;
}) {
  const { entries, ready, saving } = useCinemaLibrary();
  const [angle, setAngle] = useState(0);
  const [taste, setTaste] = useState<CinemaTastePayload | null>(initialTaste);
  useEffect(() => {
    if (!ready || saving) return;
    const controller = new AbortController();
    void fetch(`/api/cinema/taste?angle=${ANGLES[angle]}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!controller.signal.aborted) setTaste(data?.profile ? data : null);
      })
      .catch(() => {
        if (!controller.signal.aborted) setTaste(null);
      });
    return () => controller.abort();
  }, [entries, ready, saving, angle]);
  const owned = new Set(entries.map((e) => e.titleKey));
  const items = taste?.items.filter((item) => !owned.has(item.key)) ?? [];
  if (
    !taste ||
    items.length < 4 ||
    entries.filter((e) => e.rating != null && e.rating > 0).length < 2
  )
    return null;
  return (
    <div className="cinema-taste-rail">
      <div className="cinema-taste-rail-meta">
        <span>
          {taste.profile.genres.map((g) => g.name).join(" · ")} ·{" "}
          {taste.profile.confidence} confidence
        </span>
        <div className="cinema-taste-actions">
          <details className="cinema-taste-details">
            <summary className="cinema-link-btn">Why?</summary>
            <div className="cinema-taste-popover">
              <TastePanel profile={taste.profile} />
            </div>
          </details>
          <button
            type="button"
            className="cinema-link-btn"
            onClick={() => setAngle((a) => (a + 1) % ANGLES.length)}
          >
            Another angle
          </button>
        </div>
      </div>
      <PosterRail label={taste.reason} items={items} onOpen={onOpen} />
    </div>
  );
}
