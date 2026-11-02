"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TOOL_STATE_STORAGE_KEY } from "@/lib/tools/storage";

const MAX_RECENTS = 8;
const MAX_FAVOURITES = 40;
const EMPTY: ToolState = { recents: [], favourites: [] };

type ToolState = {
  recents: string[];
  favourites: string[];
};

function sanitise(value: unknown, knownIds: readonly string[]): ToolState {
  if (!value || typeof value !== "object") return EMPTY;
  const candidate = value as Partial<ToolState>;
  const known = new Set(knownIds);
  const clean = (list: unknown, limit: number): string[] => {
    if (!Array.isArray(list)) return [];
    const seen = new Set<string>();
    const output: string[] = [];
    for (const entry of list) {
      if (typeof entry !== "string" || !known.has(entry) || seen.has(entry)) {
        continue;
      }
      seen.add(entry);
      output.push(entry);
      if (output.length >= limit) break;
    }
    return output;
  };
  return {
    recents: clean(candidate.recents, MAX_RECENTS),
    favourites: clean(candidate.favourites, MAX_FAVOURITES),
  };
}

function read(knownIds: readonly string[]): ToolState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(TOOL_STATE_STORAGE_KEY);
    return raw ? sanitise(JSON.parse(raw), knownIds) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function write(next: ToolState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TOOL_STATE_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private browsing / quota: keep the in-memory state for this session.
  }
}

/**
 * Local, visitor-only recents and favourites for the Tool Bench.
 * `hydrated` lets the UI avoid flashing "no favourites" before the first read.
 */
export function useToolState(knownIds: readonly string[]) {
  const [state, setState] = useState<ToolState>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const stateRef = useRef<ToolState>(EMPTY);

  useEffect(() => {
    const next = read(knownIds);
    stateRef.current = next;
    setState(next);
    setHydrated(true);
  }, [knownIds]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== TOOL_STATE_STORAGE_KEY) return;
      const next = read(knownIds);
      stateRef.current = next;
      setState(next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [knownIds]);

  const update = useCallback((updater: (current: ToolState) => ToolState) => {
    const next = updater(stateRef.current);
    stateRef.current = next;
    setState(next);
    write(next);
  }, []);

  const recordOpen = useCallback(
    (id: string) => {
      if (!knownIds.includes(id)) return;
      update((current) => ({
        ...current,
        recents: [id, ...current.recents.filter((entry) => entry !== id)].slice(
          0,
          MAX_RECENTS,
        ),
      }));
    },
    [knownIds, update],
  );

  const toggleFavourite = useCallback(
    (id: string) => {
      if (!knownIds.includes(id)) return;
      update((current) => ({
        ...current,
        favourites: current.favourites.includes(id)
          ? current.favourites.filter((entry) => entry !== id)
          : [id, ...current.favourites].slice(0, MAX_FAVOURITES),
      }));
    },
    [knownIds, update],
  );

  const clearRecents = useCallback(() => {
    update((current) => ({ ...current, recents: [] }));
  }, [update]);

  return {
    recents: state.recents,
    favourites: state.favourites,
    hydrated,
    recordOpen,
    toggleFavourite,
    clearRecents,
  };
}
