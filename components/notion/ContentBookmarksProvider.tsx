"use client";

// Adapted from PM-Web_V2 (AGPL-3.0); see THIRD_PARTY_NOTICES.md.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { CONTENT_TYPES } from "@/lib/content-types";
import type { ContentType } from "@/lib/notion-cms";

export type SavedContent = {
  type: ContentType;
  slug: string;
  title: string;
  date: string | null;
  description: string;
  image: string | null;
};

type Snapshot = { bookmarks: SavedContent[]; ready: boolean };
type BookmarksContextValue = {
  bookmarks: SavedContent[];
  ready: boolean;
  isBookmarked: (type: ContentType, slug: string) => boolean;
  toggleBookmark: (item: SavedContent) => void;
  removeBookmark: (type: ContentType, slug: string) => void;
};

const STORAGE_KEY = "pm-content-bookmarks-v1";
const EMPTY_SNAPSHOT: Snapshot = { bookmarks: [], ready: false };
let clientSnapshot = EMPTY_SNAPSHOT;
let hydrated = false;
let storageListenerAttached = false;
const listeners = new Set<() => void>();
const BookmarksContext = createContext<BookmarksContextValue | null>(null);

function readBookmarks(): SavedContent[] {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "[]",
    );
    if (!Array.isArray(value)) return [];
    return value.slice(0, 1000).flatMap((entry): SavedContent[] => {
      if (
        !entry ||
        typeof entry !== "object" ||
        !(CONTENT_TYPES as readonly string[]).includes(entry.type) ||
        typeof entry.slug !== "string" ||
        typeof entry.title !== "string"
      )
        return [];
      return [
        {
          type: entry.type,
          slug: entry.slug.slice(0, 300),
          title: entry.title.slice(0, 300),
          date: typeof entry.date === "string" ? entry.date : null,
          description:
            typeof entry.description === "string"
              ? entry.description.slice(0, 1000)
              : "",
          image: typeof entry.image === "string" ? entry.image : null,
        },
      ];
    });
  } catch {
    return [];
  }
}

function getClientSnapshot(): Snapshot {
  if (!hydrated) {
    hydrated = true;
    clientSnapshot = { bookmarks: readBookmarks(), ready: true };
  }
  return clientSnapshot;
}

function getServerSnapshot(): Snapshot {
  return EMPTY_SNAPSHOT;
}

function publishSnapshot(snapshot: Snapshot) {
  clientSnapshot = snapshot;
  hydrated = true;
  listeners.forEach((listener) => listener());
}

function handleStorage(event: StorageEvent) {
  if (event.key === STORAGE_KEY || event.key === null) {
    publishSnapshot({ bookmarks: readBookmarks(), ready: true });
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (typeof window !== "undefined" && !storageListenerAttached) {
    window.addEventListener("storage", handleStorage);
    storageListenerAttached = true;
  }
  return () => {
    listeners.delete(listener);
    if (
      listeners.size === 0 &&
      typeof window !== "undefined" &&
      storageListenerAttached
    ) {
      window.removeEventListener("storage", handleStorage);
      storageListenerAttached = false;
    }
  };
}

function saveSnapshot(bookmarks: SavedContent[]) {
  const next = { bookmarks, ready: true };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
    publishSnapshot(next);
    return true;
  } catch {
    toast.error("Could not save this item in browser storage.");
    return false;
  }
}

export function ContentBookmarksProvider({
  children,
}: {
  children: ReactNode;
}) {
  const snapshot = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  const isBookmarked = useCallback(
    (type: ContentType, slug: string) =>
      snapshot.bookmarks.some(
        (item) => item.type === type && item.slug === slug,
      ),
    [snapshot.bookmarks],
  );

  const toggleBookmark = useCallback((item: SavedContent) => {
    const current = getClientSnapshot().bookmarks;
    const exists = current.some(
      (saved) => saved.type === item.type && saved.slug === item.slug,
    );
    const next = exists
      ? current.filter(
          (saved) => !(saved.type === item.type && saved.slug === item.slug),
        )
      : [item, ...current];
    if (saveSnapshot(next))
      toast.success(exists ? "Removed from Bookmarks" : "Added to Bookmarks");
  }, []);

  const removeBookmark = useCallback((type: ContentType, slug: string) => {
    const current = getClientSnapshot().bookmarks;
    if (
      saveSnapshot(
        current.filter(
          (saved) => !(saved.type === type && saved.slug === slug),
        ),
      )
    )
      toast.success("Removed from saved items");
  }, []);

  const value = useMemo(
    () => ({
      bookmarks: snapshot.bookmarks,
      ready: snapshot.ready,
      isBookmarked,
      toggleBookmark,
      removeBookmark,
    }),
    [snapshot, isBookmarked, toggleBookmark, removeBookmark],
  );

  return (
    <BookmarksContext.Provider value={value}>
      {children}
    </BookmarksContext.Provider>
  );
}

export function useContentBookmarks() {
  const context = useContext(BookmarksContext);
  if (!context)
    throw new Error(
      "useContentBookmarks must be used within ContentBookmarksProvider",
    );
  return context;
}
