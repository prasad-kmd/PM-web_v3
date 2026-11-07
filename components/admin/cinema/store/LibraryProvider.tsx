"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import {
  DEFAULT_CINEMA_PREFS,
  type CinemaLibraryDraft,
  type CinemaLibraryEntry,
  type CinemaPrefs,
} from "@/lib/cinema/types";

export type CinemaStorageMode = "cloud" | "session";

type LibraryState = {
  entries: CinemaLibraryEntry[];
  prefs: CinemaPrefs;
  storageMode: CinemaStorageMode;
  notice?: string;
};

type LibraryContextValue = {
  ready: boolean;
  saving: boolean;
  storageMode: CinemaStorageMode;
  notice?: string;
  entries: CinemaLibraryEntry[];
  prefs: CinemaPrefs;
  byTitleKey: Map<string, CinemaLibraryEntry>;
  save: (draft: CinemaLibraryDraft) => Promise<boolean>;
  patch: (
    id: string,
    patch: Partial<
      Pick<CinemaLibraryEntry, "status" | "rating" | "notes" | "progress">
    >,
  ) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
  setPrefs: (prefs: CinemaPrefs) => Promise<boolean>;
  reload: () => void;
};

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function useCinemaLibrary(): LibraryContextValue {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error(
      "useCinemaLibrary must be used inside CinemaLibraryProvider",
    );
  }
  return context;
}

function sortEntries(entries: CinemaLibraryEntry[]): CinemaLibraryEntry[] {
  return [...entries].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function mergeEntry(
  entries: CinemaLibraryEntry[],
  entry: CinemaLibraryEntry,
): CinemaLibraryEntry[] {
  return sortEntries([
    ...entries.filter((item) => item.titleKey !== entry.titleKey),
    entry,
  ]);
}

function optimisticEntry(draft: CinemaLibraryDraft): CinemaLibraryEntry {
  const now = new Date().toISOString();
  return {
    id: `local:${draft.titleKey}`,
    titleKey: draft.titleKey,
    tmdbId: draft.tmdbId,
    mediaType: draft.mediaType,
    title: draft.title,
    year: draft.year ?? null,
    status: draft.status,
    rating: draft.rating ?? null,
    genres: draft.genres ?? [],
    posterPath: draft.posterPath ?? null,
    runtimeMinutes: draft.runtimeMinutes ?? null,
    seasons: draft.seasons ?? null,
    progress: draft.progress ?? null,
    notes: draft.notes ?? "",
    addedAt: now,
    updatedAt: now,
    source: "session",
  };
}

/**
 * One optimistic store for the whole app window.
 *
 * The reference kept favourites in three independent `localStorage` readers with
 * no shared state and no `storage` event, so toggling a bookmark on a card left
 * the "My List" row stale until reload. Here a single provider owns the truth:
 * writes are applied locally first, then reconciled with Notion, and a failure
 * reloads instead of silently drifting.
 */
export function CinemaLibraryProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LibraryState>({
    entries: [],
    prefs: DEFAULT_CINEMA_PREFS,
    storageMode: "session",
  });
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch("/api/cinema/library", {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = (await response.json().catch(() => null)) as
          (LibraryState & { error?: string }) | null;
        if (!response.ok || !payload) {
          setReady(true);
          return;
        }
        setState({
          entries: payload.entries ?? [],
          prefs: payload.prefs ?? DEFAULT_CINEMA_PREFS,
          storageMode: payload.storageMode ?? "session",
          notice: payload.notice,
        });
      } catch {
        /* the store stays empty; the UI still works read-only */
      } finally {
        setReady(true);
      }
    })();
    return () => controller.abort();
  }, [nonce]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  const save = useCallback(
    async (draft: CinemaLibraryDraft) => {
      const previous = state;
      setSaving(true);
      setState((current) => ({
        ...current,
        entries: mergeEntry(current.entries, optimisticEntry(draft)),
      }));

      try {
        const response = await fetch("/api/cinema/library", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        });
        const payload = (await response.json().catch(() => null)) as {
          entry?: CinemaLibraryEntry;
          storageMode?: CinemaStorageMode;
          error?: string;
        } | null;
        if (!response.ok || !payload?.entry) {
          throw new Error(payload?.error ?? "Could not save to the library.");
        }
        setState((current) => ({
          ...current,
          entries: mergeEntry(
            current.entries,
            payload.entry as CinemaLibraryEntry,
          ),
          storageMode: payload.storageMode ?? current.storageMode,
        }));
        return true;
      } catch (error) {
        setState(previous);
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not save to the library.",
        );
        return false;
      } finally {
        setSaving(false);
      }
    },
    [state],
  );

  const patch = useCallback(
    async (
      id: string,
      next: Partial<
        Pick<CinemaLibraryEntry, "status" | "rating" | "notes" | "progress">
      >,
    ) => {
      const previous = state;
      setSaving(true);
      setState((current) => ({
        ...current,
        entries: current.entries.map((entry) =>
          entry.id === id
            ? { ...entry, ...next, updatedAt: new Date().toISOString() }
            : entry,
        ),
      }));

      try {
        const response = await fetch(
          `/api/cinema/library/${encodeURIComponent(id)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(next),
          },
        );
        const payload = (await response.json().catch(() => null)) as {
          entry?: CinemaLibraryEntry;
          error?: string;
        } | null;
        if (!response.ok || !payload?.entry) {
          throw new Error(payload?.error ?? "Could not update that row.");
        }
        setState((current) => ({
          ...current,
          entries: mergeEntry(
            current.entries,
            payload.entry as CinemaLibraryEntry,
          ),
        }));
        return true;
      } catch (error) {
        setState(previous);
        toast.error(
          error instanceof Error ? error.message : "Could not update that row.",
        );
        return false;
      } finally {
        setSaving(false);
      }
    },
    [state],
  );

  const remove = useCallback(
    async (id: string) => {
      const previous = state;
      setSaving(true);
      setState((current) => ({
        ...current,
        entries: current.entries.filter((entry) => entry.id !== id),
      }));

      try {
        const response = await fetch(
          `/api/cinema/library/${encodeURIComponent(id)}`,
          {
            method: "DELETE",
          },
        );
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(payload?.error ?? "Could not remove that row.");
        }
        return true;
      } catch (error) {
        setState(previous);
        toast.error(
          error instanceof Error ? error.message : "Could not remove that row.",
        );
        return false;
      } finally {
        setSaving(false);
      }
    },
    [state],
  );

  const setPrefs = useCallback(
    async (prefs: CinemaPrefs) => {
      const previous = state;
      setState((current) => ({ ...current, prefs }));
      try {
        const response = await fetch("/api/cinema/prefs", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(prefs),
        });
        const payload = (await response.json().catch(() => null)) as {
          prefs?: CinemaPrefs;
          storageMode?: CinemaStorageMode;
          error?: string;
        } | null;
        if (!response.ok) {
          throw new Error(payload?.error ?? "Could not save preferences.");
        }
        setState((current) => ({
          ...current,
          prefs: payload?.prefs ?? prefs,
          storageMode: payload?.storageMode ?? current.storageMode,
        }));
        return true;
      } catch (error) {
        setState(previous);
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not save preferences.",
        );
        return false;
      }
    },
    [state],
  );

  const byTitleKey = useMemo(() => {
    const map = new Map<string, CinemaLibraryEntry>();
    for (const entry of state.entries) map.set(entry.titleKey, entry);
    return map;
  }, [state.entries]);

  const value = useMemo<LibraryContextValue>(
    () => ({
      ready,
      saving,
      storageMode: state.storageMode,
      notice: state.notice,
      entries: state.entries,
      prefs: state.prefs,
      byTitleKey,
      save,
      patch,
      remove,
      setPrefs,
      reload,
    }),
    [byTitleKey, patch, ready, reload, remove, save, saving, setPrefs, state],
  );

  return (
    <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
  );
}
