"use client";

import {
  Cancel01Icon,
  LinkSquare02Icon,
  Maximize01Icon,
  Minimize01Icon,
  RefreshIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { StateNotice } from "@/components/admin/cinema/parts/StateNotice";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CINEMA_PLAYER_WATCHDOG_MS,
  CINEMA_PRIMARY_PROVIDER_ID,
} from "@/lib/cinema/config";
import { saveProgress } from "@/lib/cinema/progress";
import type { CinemaMediaType, CinemaPlayerSource } from "@/lib/cinema/types";

const PROVIDER_KEY = "pm.cinema.provider.v1";

function readRememberedProvider(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(PROVIDER_KEY);
  } catch {
    return null;
  }
}

function rememberProvider(providerId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROVIDER_KEY, providerId);
  } catch {
    /* best effort */
  }
}

type PlayerPayload = {
  sources: CinemaPlayerSource[];
  mediaType: CinemaMediaType;
  tmdbId: number;
  season: number | null;
  episode: number | null;
  error?: string;
};

/**
 * The player.
 *
 * Differences that matter versus the reference implementation:
 *  - `vidsrc.to` is in the chain (it was absent there), and the order is
 *    resolved server-side from a reachability probe;
 *  - the provider strip is always visible — never `opacity-0 group-hover`, which
 *    made the only recovery path mouse-only;
 *  - a 9s watchdog turns "black rectangle forever" into a visible, one-click
 *    recovery, and auto-advances to the next provider once;
 *  - the iframe carries a title, a real allow list and a referrer policy.
 */
export function PlayerStage({
  mediaType,
  tmdbId,
  titleKey,
  heading,
  season,
  episode,
  onClose,
  onEpisodeChange,
}: {
  mediaType: CinemaMediaType;
  tmdbId: number;
  titleKey: string;
  heading: string;
  season: number | null;
  episode: number | null;
  onClose?: () => void;
  /** Lets the title view write `S02E05` into the library row. */
  onEpisodeChange?: (season: number, episode: number | null) => void;
}) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");
  const [sources, setSources] = useState<CinemaPlayerSource[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [frameState, setFrameState] = useState<"loading" | "ready" | "stalled">(
    "loading",
  );
  const [reloadKey, setReloadKey] = useState(0);
  const [theater, setTheater] = useState(false);
  const [autoNote, setAutoNote] = useState<string | null>(null);

  const watchdogRef = useRef<number | null>(null);
  const autoSwitchedRef = useRef(false);
  const onEpisodeChangeRef = useRef(onEpisodeChange);
  const lastProgressRef = useRef<string | null>(null);

  const clearWatchdog = () => {
    if (watchdogRef.current !== null) {
      window.clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  };

  /* Load the ordered chain for this title/episode. */
  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    setAutoNote(null);
    autoSwitchedRef.current = false;
    setActiveIndex(0);

    const query = new URLSearchParams({ type: mediaType, id: String(tmdbId) });
    if (season !== null) query.set("season", String(season));
    if (episode !== null) query.set("episode", String(episode));
    /* Start on the provider that worked last time; the server keeps the rest of
       the chain behind it. */
    const remembered = readRememberedProvider();
    if (remembered) query.set("provider", remembered);

    void (async () => {
      try {
        const response = await fetch(`/api/cinema/player?${query.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = (await response
          .json()
          .catch(() => null)) as PlayerPayload | null;
        if (!response.ok || !payload) {
          setStatus("error");
          setMessage(
            payload?.error ?? "Playback sources could not be resolved.",
          );
          return;
        }
        setSources(payload.sources);
        setStatus("ready");
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        setStatus("error");
        setMessage("Could not reach the studio service.");
      }
    })();

    return () => controller.abort();
  }, [episode, mediaType, season, tmdbId]);

  /* Always call the latest callback without making it a dependency — a parent
     closure in the dep array is an infinite loop (write → render → new → write). */
  useEffect(() => {
    onEpisodeChangeRef.current = onEpisodeChange;
  }, [onEpisodeChange]);

  /* Remember where we are, so "Continue" is honest next time. Guarded by the
     last value we reported, so a re-render can never write the same progress
     twice. */
  useEffect(() => {
    if (mediaType !== "tv") return;
    if (season === null) return;
    const token = `${titleKey}:${season}:${episode ?? 0}`;
    if (lastProgressRef.current === token) return;
    lastProgressRef.current = token;
    saveProgress(titleKey, season, episode);
    onEpisodeChangeRef.current?.(season, episode);
  }, [episode, mediaType, season, titleKey]);

  const active = sources[activeIndex] ?? sources[0] ?? null;

  const stepProvider = useCallback(
    (direction: 1 | -1) => {
      if (sources.length === 0) return;
      setActiveIndex(
        (index) => (index + direction + sources.length) % sources.length,
      );
      setFrameState("loading");
      setAutoNote(null);
    },
    [sources.length],
  );

  /* Watchdog: a player that never loads is a visible problem, not a void. */
  useEffect(() => {
    if (status !== "ready" || !active) return;
    clearWatchdog();
    watchdogRef.current = window.setTimeout(() => {
      setFrameState("stalled");
      if (!autoSwitchedRef.current && sources.length > 1) {
        autoSwitchedRef.current = true;
        setActiveIndex((index) => (index + 1) % sources.length);
        setAutoNote(
          `Nothing loaded after ${Math.round(CINEMA_PLAYER_WATCHDOG_MS / 1000)}s — switched to the next provider automatically.`,
        );
        setFrameState("loading");
      }
    }, CINEMA_PLAYER_WATCHDOG_MS);

    return clearWatchdog;
  }, [active, activeIndex, reloadKey, sources.length, status]);

  /* Esc leaves theater mode rather than closing the window. */
  useEffect(() => {
    if (!theater) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setTheater(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [theater]);

  if (status === "loading") {
    return (
      <div className="cinema-player">
        <Skeleton className="aspect-video w-full rounded-[10px]" />
        <Skeleton className="h-6 w-64 rounded-md" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="cinema-player">
        <StateNotice
          title="Playback is unavailable"
          body={message}
          action={
            <Button
              size="xs"
              variant="outline"
              onClick={() => setReloadKey((k) => k + 1)}
            >
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div
      className={`cinema-player${theater ? " is-theater" : ""}`}
      aria-label={`Player for ${heading}`}
    >
      <div className="cinema-player-head">
        <p className="cinema-player-title">{heading}</p>
        <div className="cinema-player-actions">
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={() => {
              setReloadKey((value) => value + 1);
              setFrameState("loading");
            }}
            aria-label="Reload player"
            title="Reload player"
          >
            <HugeiconsIcon icon={RefreshIcon} strokeWidth={2} size={13} />
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={() => setTheater((value) => !value)}
            aria-label={theater ? "Exit theater mode" : "Theater mode"}
            title={theater ? "Exit theater mode (Esc)" : "Theater mode"}
          >
            <HugeiconsIcon
              icon={theater ? Minimize01Icon : Maximize01Icon}
              strokeWidth={2}
              size={13}
            />
          </Button>
          {active ? (
            <Button
              size="icon-xs"
              variant="ghost"
              render={
                <a
                  href={active.embedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
              aria-label="Open the stream in a new tab"
              title="Open in a new tab"
            >
              <HugeiconsIcon
                icon={LinkSquare02Icon}
                strokeWidth={2}
                size={13}
              />
            </Button>
          ) : null}
          {onClose ? (
            <Button
              size="icon-xs"
              variant="ghost"
              onClick={onClose}
              aria-label="Close player"
              title="Close player"
            >
              <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} size={13} />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="cinema-player-frame">
        {active ? (
          <iframe
            key={`${active.providerId}-${reloadKey}`}
            src={active.embedUrl}
            title={`${heading} — ${active.label}`}
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            allowFullScreen
            referrerPolicy="origin"
            onLoad={() => {
              clearWatchdog();
              setFrameState("ready");
              rememberProvider(active.providerId);
            }}
          />
        ) : null}

        {frameState === "stalled" ? (
          <div className="cinema-player-stall" role="status">
            <p className="cinema-player-stall-title">
              This provider didn&apos;t load
            </p>
            <p className="cinema-player-stall-body">
              {active?.reachable === false
                ? `${active.label} did not answer a reachability check either.`
                : "Streams rotate and die without warning — try another provider."}
            </p>
            <div className="cinema-player-stall-actions">
              <Button size="xs" onClick={() => stepProvider(1)}>
                Switch provider
              </Button>
              <Button
                size="xs"
                variant="outline"
                onClick={() => {
                  setReloadKey((value) => value + 1);
                  setFrameState("loading");
                }}
              >
                Reload
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <div
        className="cinema-player-strip"
        role="group"
        aria-label="Playback provider"
      >
        {sources.map((source, index) => (
          <button
            key={source.providerId}
            type="button"
            onClick={() => {
              setActiveIndex(index);
              setFrameState("loading");
              setAutoNote(null);
            }}
            className={`cinema-provider${index === activeIndex ? " is-active" : ""}`}
            aria-pressed={index === activeIndex}
            title={
              source.reachable === false
                ? `${source.label} — did not answer the reachability check`
                : source.reachable === true
                  ? `${source.label} — reachable`
                  : `${source.label} — not probed`
            }
          >
            <span
              className={`cinema-provider-dot is-${
                source.reachable === true
                  ? "up"
                  : source.reachable === false
                    ? "down"
                    : "unknown"
              }`}
              aria-hidden
            />
            {source.label}
            {source.providerId === CINEMA_PRIMARY_PROVIDER_ID ? (
              <span className="cinema-provider-tag">primary</span>
            ) : null}
          </button>
        ))}
      </div>

      {autoNote ? (
        <p className="cinema-player-note" role="status" aria-live="polite">
          {autoNote}
        </p>
      ) : null}
    </div>
  );
}
