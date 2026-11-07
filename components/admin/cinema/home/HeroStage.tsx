"use client";

import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  StarIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useShouldReduceMotion } from "@animate-ui/react/utils/motion";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { TMDB_IMAGE_SIZES_ATTR } from "@/lib/cinema/config";
import { tmdbBackdropUrl } from "@/lib/cinema/images";
import type { CinemaTitle } from "@/lib/cinema/types";

/** Dwell time per slide. Matches the hairline animation in `cinema.css`. */
const AUTO_ADVANCE_MS = 9000;

/**
 * Today's feature, on a timer.
 *
 * Slides cross-fade every nine seconds with a hairline showing the time left.
 * The timer stops on hover, on keyboard focus and when the window is hidden, and
 * never starts at all under `prefers-reduced-motion` — automatic movement is
 * exactly what that setting is asking to be spared.
 */
export function HeroStage({
  pool,
  initialIndex,
  onOpen,
}: {
  pool: CinemaTitle[];
  initialIndex: number;
  onOpen: (title: CinemaTitle) => void;
}) {
  const reduceMotion = useShouldReduceMotion();
  const [index, setIndex] = useState(() =>
    pool.length > 0 ? Math.min(initialIndex, pool.length - 1) : 0,
  );
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setIndex((current) =>
      pool.length > 0 ? Math.min(current, pool.length - 1) : 0,
    );
  }, [pool.length]);

  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const step = useCallback(
    (delta: number) => {
      setIndex((value) => (value + delta + pool.length) % pool.length);
    },
    [pool.length],
  );

  const running = !paused && !hidden && !reduceMotion && pool.length > 1;

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => step(1), AUTO_ADVANCE_MS);
    return () => window.clearTimeout(timer);
  }, [index, running, step]);

  if (pool.length === 0) return null;

  const current = pool[index];
  const backdrop = tmdbBackdropUrl(current.backdropPath, "w1280");
  const meta = [
    current.year ? String(current.year) : null,
    current.mediaType === "tv" ? "Series" : "Film",
  ].filter(Boolean);

  return (
    <section
      className={`cinema-hero${running ? "" : " is-paused"}`}
      aria-roledescription="carousel"
      aria-label="Featured today"
      tabIndex={0}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          step(1);
        } else if (event.key === "ArrowLeft") {
          event.preventDefault();
          step(-1);
        }
      }}
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={current.key}
          className="cinema-hero-slide"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.55, ease: "easeOut" }}
        >
          <div className="cinema-hero-media" aria-hidden>
            {backdrop ? (
              <img
                src={backdrop}
                alt=""
                sizes={TMDB_IMAGE_SIZES_ATTR.hero}
                decoding="async"
                draggable={false}
              />
            ) : null}
          </div>

          <div className="cinema-hero-body">
            <p className="cinema-hero-eyebrow">Featured today</p>
            <h2 className="cinema-hero-title">{current.title}</h2>
            <div className="cinema-hero-meta">
              {meta.map((item) => (
                <span key={item}>{item}</span>
              ))}
              {current.rating > 0 ? (
                <span className="cinema-hero-score">
                  <HugeiconsIcon icon={StarIcon} strokeWidth={2} size={11} />
                  {current.rating.toFixed(1)} on TMDB
                </span>
              ) : null}
            </div>
            {current.overview ? (
              <p className="cinema-hero-overview">{current.overview}</p>
            ) : null}

            <div className="cinema-hero-actions">
              <Button size="sm" onClick={() => onOpen(current)}>
                Open title
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => step(1)}
                aria-label="Show the next featured title"
              >
                Next
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  strokeWidth={2}
                  size={13}
                />
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="cinema-hero-controls">
        <button
          type="button"
          className="cinema-icon-btn"
          onClick={() => step(-1)}
          aria-label="Previous featured title"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} size={14} />
        </button>
        <div className="cinema-hero-dots" role="tablist" aria-label="Featured">
          {pool.map((item, dotIndex) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={dotIndex === index}
              aria-label={item.title}
              className={`cinema-hero-dot${dotIndex === index ? " is-active" : ""}`}
              onClick={() => setIndex(dotIndex)}
            />
          ))}
        </div>
        <button
          type="button"
          className="cinema-icon-btn"
          onClick={() => step(1)}
          aria-label="Next featured title"
        >
          <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} size={14} />
        </button>
      </div>

      {pool.length > 1 ? (
        <div className="cinema-hero-progress" aria-hidden>
          <span
            key={`${index}-${running}`}
            className="cinema-hero-progress-bar"
          />
        </div>
      ) : null}
    </section>
  );
}
