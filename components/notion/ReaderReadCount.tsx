"use client";

import { useEffect, useState } from "react";
import { ViewIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ContentType } from "@/lib/content-types";
import type { ReadCountResponse } from "@/lib/engagement/types";

const numberFormatter = new Intl.NumberFormat("en-US");
const ACTIVE_READ_DELAY_MS = 1500;
const CLIENT_CACHE_TTL_MS = 5 * 60 * 1000;
const CLIENT_CACHE_MAX_ENTRIES = 100;

type CachedReadCount = {
  response: ReadCountResponse;
  expiresAt: number;
};

const readCountMemoryCache = new Map<string, CachedReadCount>();
const readCountInflight = new Map<string, Promise<ReadCountResponse | null>>();

function entryCacheKey(type: ContentType, slug: string): string {
  return `${type}:${slug.toLowerCase()}`;
}

function seenStorageKey(type: ContentType, slug: string): string {
  return `pm_rdr_seen:${type}:${slug.toLowerCase()}`;
}

function getMemoryCachedCount(key: string): ReadCountResponse | null {
  const cached = readCountMemoryCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    readCountMemoryCache.delete(key);
    return null;
  }
  return cached.response;
}

function rememberReadCount(key: string, response: ReadCountResponse): void {
  if (
    readCountMemoryCache.size >= CLIENT_CACHE_MAX_ENTRIES &&
    !readCountMemoryCache.has(key)
  ) {
    const oldestKey = readCountMemoryCache.keys().next().value;
    if (oldestKey !== undefined) readCountMemoryCache.delete(oldestKey);
  }
  readCountMemoryCache.set(key, {
    response,
    expiresAt: Date.now() + CLIENT_CACHE_TTL_MS,
  });
}

function fetchCachedReadCount(
  type: ContentType,
  slug: string,
): Promise<ReadCountResponse | null> {
  const key = entryCacheKey(type, slug);
  const cached = getMemoryCachedCount(key);
  if (cached) return Promise.resolve(cached);

  const existing = readCountInflight.get(key);
  if (existing) return existing;

  const url = `/api/reader/pulse?type=${encodeURIComponent(type)}&slug=${encodeURIComponent(slug)}`;
  const req = fetch(url)
    .then(async (res): Promise<ReadCountResponse | null> => {
      if (!res.ok) return null;
      const data = (await res.json()) as ReadCountResponse;
      if (data.configured === false) {
        const response = { configured: false, count: null };
        rememberReadCount(key, response);
        return response;
      }
      if (
        data.configured !== true ||
        typeof data.count !== "number" ||
        !Number.isFinite(data.count)
      ) {
        return null;
      }
      const response = {
        configured: true,
        count: Math.max(0, Math.floor(data.count)),
      };
      rememberReadCount(key, response);
      return response;
    })
    .catch(() => null)
    .finally(() => {
      readCountInflight.delete(key);
    });

  readCountInflight.set(key, req);
  return req;
}

/**
 * Displays the public read count from a cached GET endpoint, keeping the
 * content page itself independent of live readership data. Active reads are
 * recorded separately through a write-only POST endpoint.
 */
export function ReaderReadCount({
  type,
  slug,
}: {
  type: ContentType;
  slug: string;
}) {
  const key = entryCacheKey(type, slug);
  const [count, setCount] = useState<number | null>(() => {
    const cached = getMemoryCachedCount(key);
    return cached?.configured ? cached.count : null;
  });

  useEffect(() => {
    let cancelled = false;
    const cached = getMemoryCachedCount(key);

    if (cached) {
      setCount(cached.configured ? cached.count : null);
    } else {
      setCount(null);
      void fetchCachedReadCount(type, slug).then((result) => {
        if (!cancelled) {
          setCount(result?.configured ? result.count : null);
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
      if (window.sessionStorage.getItem(storageKey) !== null) return;
    } catch {
      // sessionStorage may be blocked; server-side HMAC deduplication remains.
    }

    let cancelled = false;
    let timerId: number | null = null;

    const sendPulse = async () => {
      if (cancelled) return;

      // If a successful count lookup has already established that readership
      // storage is not configured, there is no reason to send a write request.
      // A failed/slow GET does not block the pulse: the POST verifies setup
      // independently, so transient count-read errors do not lose active reads.
      if (getMemoryCachedCount(key)?.configured === false) return;

      try {
        window.sessionStorage.setItem(storageKey, "1");
      } catch {
        // Ignore storage write errors; server-side deduplication is still used.
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
        // Fail silently; count display is independent from read recording.
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
  }, [key, slug, type]);

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
