"use client";

import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { PosterCard } from "@/components/admin/cinema/parts/PosterCard";
import { StateNotice } from "@/components/admin/cinema/parts/StateNotice";
import type { CinemaListSource } from "@/components/admin/cinema/store/use-cinema-nav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { CinemaListPayload, CinemaTitle } from "@/lib/cinema/types";

/**
 * "See all" — the destination the reference app's four buttons never had.
 * Server-paged (20 at a time) with an explicit end state.
 */
export function SeeAllView({
  source,
  listId,
  title,
  onBack,
  onOpenTitle,
}: {
  source: CinemaListSource;
  listId: string;
  title: string;
  onBack: () => void;
  onOpenTitle: (title: CinemaTitle) => void;
}) {
  const [items, setItems] = useState<CinemaTitle[]>([]);
  const [meta, setMeta] = useState<{
    page: number;
    totalPages: number;
    total: number;
  } | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(
    async (page: number, mode: "replace" | "append") => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (mode === "replace") {
        setStatus("loading");
        setItems([]);
      } else {
        setLoadingMore(true);
      }

      try {
        const response = await fetch(
          `/api/cinema/list?source=${encodeURIComponent(source)}&id=${encodeURIComponent(listId)}&page=${page}`,
          { cache: "no-store", signal: controller.signal },
        );
        const payload = (await response.json().catch(() => null)) as
          (CinemaListPayload & { error?: string }) | null;

        if (!response.ok || !payload) {
          setStatus("error");
          setMessage(payload?.error ?? "That shelf could not be loaded.");
          return;
        }

        setItems((current) =>
          mode === "append" ? [...current, ...payload.items] : payload.items,
        );
        setMeta({
          page: payload.page,
          totalPages: payload.totalPages,
          total: payload.totalResults,
        });
        setStatus("ready");
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        setStatus("error");
        setMessage("Could not reach the studio service.");
      } finally {
        setLoadingMore(false);
      }
    },
    [listId, source],
  );

  useEffect(() => {
    void load(1, "replace");
    return () => abortRef.current?.abort();
  }, [load]);

  const canLoadMore = Boolean(meta && meta.page < meta.totalPages);

  return (
    <div className="cinema-scroll">
      <header className="cinema-page-head">
        <Button
          size="icon-xs"
          variant="ghost"
          onClick={onBack}
          aria-label="Back"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} size={14} />
        </Button>
        <div className="cinema-page-head-copy">
          <h2 className="cinema-page-title">{title}</h2>
          <p className="cinema-page-sub">
            {meta ? `${meta.total.toLocaleString()} titles` : "Loading shelf…"}
          </p>
        </div>
      </header>

      {status === "loading" ? (
        <div className="cinema-grid">
          {Array.from({ length: 12 }, (_, index) => (
            <div key={index} className="cinema-grid-cell">
              <Skeleton className="state-skel-cinema-tile" />
              <Skeleton className="h-2.5 w-[85%]" />
            </div>
          ))}
        </div>
      ) : status === "error" ? (
        <StateNotice
          title="This shelf did not load"
          body={message}
          action={
            <Button
              size="xs"
              variant="outline"
              onClick={() => void load(1, "replace")}
            >
              Retry
            </Button>
          }
        />
      ) : items.length === 0 ? (
        <StateNotice
          title="Nothing here yet"
          body="TMDB has no titles for this shelf right now."
        />
      ) : (
        <>
          <div className="cinema-grid">
            {items.map((item) => (
              <PosterCard key={item.key} title={item} onOpen={onOpenTitle} />
            ))}
          </div>

          <div className="cinema-load-more">
            {canLoadMore ? (
              <Button
                size="sm"
                variant="outline"
                loading={loadingMore}
                onClick={() => void load(meta!.page + 1, "append")}
              >
                Load more
              </Button>
            ) : (
              <p className="cinema-end-note">End of the shelf</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
