"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CinemaFetchState<T> =
  | { kind: "loading" }
  | { kind: "ready"; data: T }
  | { kind: "error"; message: string };

/**
 * Module-level response cache.
 *
 * Opening a title, going Back and opening it again used to refetch (and flash a
 * skeleton every time). Responses now survive the component, so returning to a
 * page paints instantly from memory while the studio stays snappy on the
 * provider endpoints, which are the only slow ones.
 */
const CACHE_TTL_MS = 5 * 60_000;

type CacheEntry = { data: unknown; at: number };
const responseCache = new Map<string, CacheEntry>();

export function readCinemaCache<T>(url: string): T | null {
  const hit = responseCache.get(url);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    responseCache.delete(url);
    return null;
  }
  return hit.data as T;
}

export function writeCinemaCache(url: string, data: unknown): void {
  responseCache.set(url, { data, at: Date.now() });
}

/** Drop everything (or one prefix) — used after a library write. */
export function invalidateCinemaCache(prefix?: string): void {
  if (!prefix) {
    responseCache.clear();
    return;
  }
  for (const key of [...responseCache.keys()]) {
    if (key.startsWith(prefix)) responseCache.delete(key);
  }
}

/**
 * One fetch lifecycle for every view: cache-first, abort on unmount, typed
 * ready/error, explicit reload. Upstream messages (rate limited, timed out, not
 * configured) are preserved instead of collapsing into a blank screen.
 */
export function useCinemaFetch<T>(
  url: string | null,
  options: { skipCache?: boolean } = {},
) {
  const cached = url && !options.skipCache ? readCinemaCache<T>(url) : null;

  const [state, setState] = useState<CinemaFetchState<T>>(() =>
    cached !== null ? { kind: "ready", data: cached } : { kind: "loading" },
  );
  const [nonce, setNonce] = useState(0);
  const lastUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!url) return;

    // A different URL with a warm cache paints immediately, no skeleton.
    if (lastUrlRef.current !== url) {
      lastUrlRef.current = url;
      if (!options.skipCache) {
        const hit = readCinemaCache<T>(url);
        if (hit !== null) {
          setState({ kind: "ready", data: hit });
          return;
        }
      }
    }

    const controller = new AbortController();
    setState({ kind: "loading" });

    void (async () => {
      try {
        const response = await fetch(url, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;

        if (!response.ok) {
          setState({
            kind: "error",
            message:
              payload?.error ??
              `The studio request failed (${response.status}).`,
          });
          return;
        }
        writeCinemaCache(url, payload);
        setState({ kind: "ready", data: payload as T });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        setState({
          kind: "error",
          message: "Could not reach the studio service. Check the connection.",
        });
      }
    })();

    return () => controller.abort();
  }, [nonce, options.skipCache, url]);

  const reload = useCallback(() => {
    if (url) responseCache.delete(url);
    setNonce((value) => value + 1);
  }, [url]);

  return { state, reload };
}
