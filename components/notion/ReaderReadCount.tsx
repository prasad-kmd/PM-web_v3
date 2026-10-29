"use client";

import { useEffect, useState } from "react";
import { ViewIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ContentType } from "@/lib/content-types";
import type { PulseResponse } from "@/lib/engagement/types";

const numberFormatter = new Intl.NumberFormat("en-US");
const ACTIVE_READ_DELAY_MS = 1500;

function seenStorageKey(type: ContentType, slug: string): string {
  return `pm_rdr_seen:${type}:${slug.toLowerCase()}`;
}

/**
 * Displays the tabular read count strictly inside `.rdr-meta` on content
 * reader pages and registers a single active read per browser session.
 *
 * Uses `sessionStorage` so DesktopOS window focus switches (`FrozenRouteSurface`
 * ↔ `LiveRouteSurface`) never double-fire the pulse request.
 */
export function ReaderReadCount({
  type,
  slug,
  initialCount,
}: {
  type: ContentType;
  slug: string;
  initialCount: number | null;
}) {
  const [count, setCount] = useState<number | null>(initialCount);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount, slug, type]);

  useEffect(() => {
    if (initialCount === null) return;

    const storageKey = seenStorageKey(type, slug);
    try {
      const cached = window.sessionStorage.getItem(storageKey);
      if (cached !== null) {
        const parsed = Number.parseInt(cached, 10);
        if (Number.isFinite(parsed)) {
          setCount((prev) => (prev === null ? parsed : Math.max(prev, parsed)));
        }
        return;
      }
    } catch {
      // sessionStorage may be blocked in strict privacy modes; server-side
      // HMAC deduplication still prevents repeat increments.
    }

    let cancelled = false;
    let timerId: number | null = null;

    const sendPulse = async () => {
      if (cancelled) return;
      try {
        window.sessionStorage.setItem(storageKey, String(initialCount ?? 0));
      } catch {
        // Ignore storage write errors.
      }

      try {
        const res = await fetch("/api/reader/pulse", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            type,
            slug,
            ...(document.referrer ? { ref: document.referrer } : {}),
          }),
          keepalive: true,
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as PulseResponse;
        if (cancelled) return;
        if (!data.configured) {
          setCount(null);
          return;
        }
        if (typeof data.count === "number" && Number.isFinite(data.count)) {
          const next = Math.max(initialCount ?? 0, data.count);
          setCount(next);
          try {
            window.sessionStorage.setItem(storageKey, String(next));
          } catch {
            // Ignore storage write errors.
          }
        }
      } catch {
        // Fail silently; initial server count remains visible.
      }
    };

    const scheduleIfVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (timerId !== null) return;
      timerId = window.setTimeout(() => {
        void sendPulse();
      }, ACTIVE_READ_DELAY_MS);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        scheduleIfVisible();
      } else if (timerId !== null) {
        window.clearTimeout(timerId);
        timerId = null;
      }
    };

    scheduleIfVisible();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      cancelled = true;
      if (timerId !== null) window.clearTimeout(timerId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [initialCount, slug, type]);

  if (count === null) return null;

  return (
    <span className="rdr-reads">
      <HugeiconsIcon icon={ViewIcon} size={14} aria-hidden />
      <span>
        {numberFormatter.format(count)} {count === 1 ? "read" : "reads"}
      </span>
    </span>
  );
}
