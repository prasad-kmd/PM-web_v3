"use client";

import { useEffect, useState } from "react";
import { ViewIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ContentType } from "@/lib/content-types";
import type { ReadCountResponse } from "@/lib/engagement/types";

const numberFormatter = new Intl.NumberFormat("en-US");
const ACTIVE_READ_DELAY_MS = 1500;

const readCountMemoryCache = new Map<string, number | null>();
const readCountInflight = new Map<string, Promise<number | null>>();

function entryCacheKey(type: ContentType, slug: string): string {
  return `${type}:${slug.toLowerCase()}`;
}

function seenStorageKey(type: ContentType, slug: string): string {
  return `pm_rdr_seen:${type}:${slug.toLowerCase()}`;
}

function fetchCachedReadCount(
  type: ContentType,
  slug: string,
): Promise<number | null> {
  const key = entryCacheKey(type, slug);
  if (readCountMemoryCache.has(key)) {
    return Promise.resolve(readCountMemoryCache.get(key) ?? null);
  }
  const existing = readCountInflight.get(key);
  if (existing) return existing;

  const url = `/api/reader/pulse?type=${encodeURIComponent(type)}&slug=${encodeURIComponent(slug)}`;
  const req = fetch(url)
    .then(async (res): Promise<number | null> => {
      if (!res.ok) return null;
      const data = (await res.json()) as ReadCountResponse;
      if (
        !data.configured ||
        typeof data.count !== "number" ||
        !Number.isFinite(data.count)
      ) {
        readCountMemoryCache.set(key, null);
        return null;
      }
      const normalized = Math.max(0, Math.floor(data.count));
      readCountMemoryCache.set(key, normalized);
      return normalized;
    })
    .catch(() => null)
    .finally(() => {
      readCountInflight.delete(key);
    });

  readCountInflight.set(key, req);
  return req;
}

/**
 * Displays the tabular read count strictly inside `.rdr-meta` on content
 * reader pages via a 1h CDN-cached `GET /api/reader/pulse` request and
 * registers a single write-only active read per browser session (`POST`).
 *
 * Uses `sessionStorage` (`pm_rdr_seen:<type>:<slug>`) so DesktopOS window
 * focus switches (`FrozenRouteSurface` ↔ `LiveRouteSurface`) never double-fire
 * the pulse request, and keeps `ContentDetailPage` 100% 1h ISR (`●`).
 */
export function ReaderReadCount({
  type,
  slug,
}: {
  type: ContentType;
  slug: string;
}) {
  const key = entryCacheKey(type, slug);
  const [count, setCount] = useState<number | null>(() =>
    readCountMemoryCache.has(key)
      ? (readCountMemoryCache.get(key) ?? null)
      : null,
  );

  useEffect(() => {
    let cancelled = false;
    const cached = readCountMemoryCache.has(key)
      ? (readCountMemoryCache.get(key) ?? null)
      : undefined;

    if (cached !== undefined) {
      setCount(cached);
    } else {
      setCount(null);
      void fetchCachedReadCount(type, slug).then((resolved) => {
        if (!cancelled) {
          setCount(resolved);
        }
      });
    }

    return () => {
      cancelled = true;
    };
  }, [key, slug, type]);

  useEffect(() => {
    const storageKey = seenStorageKey(type, slug);
    try {
      if (window.sessionStorage.getItem(storageKey) !== null) {
        return;
      }
    } catch {
      // sessionStorage may be blocked in strict privacy modes; server-side
      // HMAC deduplication still prevents repeat increments.
    }

    let cancelled = false;
    let timerId: number | null = null;

    const sendPulse = async () => {
      const resolvedCount = await fetchCachedReadCount(type, slug);
      if (cancelled || resolvedCount === null) return;

      try {
        window.sessionStorage.setItem(storageKey, "1");
      } catch {
        // Ignore storage write errors.
      }

      try {
        await fetch("/api/reader/pulse", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            type,
            slug,
            ...(document.referrer ? { ref: document.referrer } : {}),
          }),
          keepalive: true,
        });
      } catch {
        // Fail silently; cached read count remains visible.
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
  }, [slug, type]);

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
