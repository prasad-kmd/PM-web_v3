"use client";

import { useEffect, useState } from "react";
import { ViewIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ContentType } from "@/lib/content-types";
import type { ReadCountResponse, PulseResponse } from "@/lib/engagement/types";

const numberFormatter = new Intl.NumberFormat("en-US");
const ACTIVE_READ_DELAY_MS = 1500;
const MEMORY_CACHE_TTL_MS = 60 * 1000;
const UNCONFIGURED_CACHE_TTL_MS = 60 * 1000;
const MAX_MEMORY_CACHE_ENTRIES = 100;

type CachedReadCount = { count: number | null; expiresAt: number };

const readCountMemoryCache = new Map<string, CachedReadCount>();
const readCountInflight = new Map<string, Promise<number | null>>();

function entryCacheKey(type: ContentType, slug: string): string {
  return `${type}:${slug.toLowerCase()}`;
}

function seenStorageKey(type: ContentType, slug: string): string {
  return `pm_rdr_seen:${type}:${slug.toLowerCase()}`;
}

function getMemoryCount(key: string): { hit: boolean; count: number | null } {
  const entry = readCountMemoryCache.get(key);
  if (!entry) return { hit: false, count: null };
  if (entry.expiresAt <= Date.now()) {
    readCountMemoryCache.delete(key);
    return { hit: false, count: null };
  }
  return { hit: true, count: entry.count };
}

function rememberCount(key: string, count: number | null) {
  const now = Date.now();
  for (const [cachedKey, entry] of readCountMemoryCache) {
    if (entry.expiresAt <= now) readCountMemoryCache.delete(cachedKey);
  }
  while (readCountMemoryCache.size >= MAX_MEMORY_CACHE_ENTRIES) {
    const oldestKey = readCountMemoryCache.keys().next().value;
    if (oldestKey === undefined) break;
    readCountMemoryCache.delete(oldestKey);
  }
  readCountMemoryCache.set(key, {
    count,
    expiresAt:
      now + (count === null ? UNCONFIGURED_CACHE_TTL_MS : MEMORY_CACHE_TTL_MS),
  });
}

function fetchCachedReadCount(
  type: ContentType,
  slug: string,
): Promise<number | null> {
  const key = entryCacheKey(type, slug);
  const cached = getMemoryCount(key);
  if (cached.hit) return Promise.resolve(cached.count);

  const existing = readCountInflight.get(key);
  if (existing) return existing;

  const url = `/api/reader/pulse?type=${encodeURIComponent(type)}&slug=${encodeURIComponent(slug)}`;
  const request = fetch(url)
    .then(async (response): Promise<number | null> => {
      if (!response.ok) return null;
      const data = (await response.json()) as ReadCountResponse;
      if (
        !data.configured ||
        typeof data.count !== "number" ||
        !Number.isFinite(data.count)
      ) {
        rememberCount(key, null);
        return null;
      }
      const count = Math.max(0, Math.floor(data.count));
      rememberCount(key, count);
      return count;
    })
    .catch(() => null)
    .finally(() => {
      readCountInflight.delete(key);
    });

  readCountInflight.set(key, request);
  return request;
}

/**
 * Displays the public count from a separately cached endpoint and records one
 * active read per browser session. The content page itself does not wait for
 * this changing value, so its HTML can use the full ISR interval.
 */
export function ReaderReadCount({
  type,
  slug,
}: {
  type: ContentType;
  slug: string;
}) {
  const key = entryCacheKey(type, slug);
  const [loadedCount, setLoadedCount] = useState<{
    key: string;
    count: number | null;
  } | null>(null);
  const count = loadedCount?.key === key ? loadedCount.count : null;

  useEffect(() => {
    let cancelled = false;
    const cached = getMemoryCount(key);
    if (cached.hit) {
      setLoadedCount({ key, count: cached.count });
    } else {
      void fetchCachedReadCount(type, slug).then((resolved) => {
        if (!cancelled) setLoadedCount({ key, count: resolved });
      });
    }
    return () => {
      cancelled = true;
    };
  }, [key, slug, type]);

  useEffect(() => {
    if (count === null) return;

    const storageKey = seenStorageKey(type, slug);
    try {
      if (window.sessionStorage.getItem(storageKey) !== null) return;
    } catch {
      // Server-side HMAC deduplication still applies when storage is unavailable.
    }

    let cancelled = false;
    let timerId: number | null = null;

    const sendPulse = async () => {
      if (cancelled) return;
      try {
        window.sessionStorage.setItem(storageKey, "1");
      } catch {
        // Session storage is optional.
      }

      try {
        const response = await fetch("/api/reader/pulse", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            type,
            slug,
            ...(document.referrer ? { ref: document.referrer } : {}),
          }),
          keepalive: true,
        });
        if (!response.ok || cancelled) return;
        const result = (await response.json()) as PulseResponse;
        if (!cancelled && !result.configured) {
          setLoadedCount({ key, count: null });
        }
      } catch {
        // Fail silently; the cached public count remains visible.
      }
    };

    const scheduleIfVisible = () => {
      if (document.visibilityState !== "visible" || timerId !== null) return;
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
  }, [count, key, slug, type]);

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
