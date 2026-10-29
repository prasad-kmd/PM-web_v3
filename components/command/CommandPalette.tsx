"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import {
  Archive02Icon,
  Bookmark01Icon,
  BookOpen01Icon,
  Cancel01Icon,
  ChartLineData02Icon,
  Copy01Icon,
  DocumentValidationIcon,
  File02Icon,
  Folder01Icon,
  Image02Icon,
  Invoice02Icon,
  Login01Icon,
  Logout01Icon,
  Mail01Icon,
  Moon02Icon,
  NewsIcon,
  Note01Icon,
  RefreshIcon,
  Search01Icon,
  Settings02Icon,
  SparklesIcon,
  SunMediumIcon,
  UserCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { toast } from "sonner";
import { useAdminAuth } from "@/components/admin/AdminAuthProvider";
import { useContentBookmarks } from "@/components/notion/ContentBookmarksProvider";
import { useAppearance } from "@/lib/appearance";
import { CONTENT_META, type ContentType } from "@/lib/content-types";
import { APP_REGISTRY, DESKTOP_APPS, type AppId } from "@/lib/registry";
import {
  scoreSearchCandidate,
  type SearchEntry,
  type SearchIndexResponse,
} from "@/lib/search-score";

type PaletteItem = {
  id: string;
  group: string;
  icon: typeof Search01Icon;
  title: string;
  meta: string;
  shortcut?: string;
  keywords: string[];
  subtitle?: string;
  slug?: string;
  date?: string | null;
  onSelect: () => void;
};

const COLLECTION_ICON: Record<ContentType, typeof Folder01Icon> = {
  projects: Folder01Icon,
  blog: Note01Icon,
  articles: File02Icon,
  tutorials: BookOpen01Icon,
  glossary: Archive02Icon,
  news: NewsIcon,
};

const APP_ICON: Record<AppId, typeof Folder01Icon> = {
  resume: DocumentValidationIcon,
  projects: Folder01Icon,
  blog: Note01Icon,
  articles: File02Icon,
  tutorials: BookOpen01Icon,
  glossary: Archive02Icon,
  news: NewsIcon,
  bookmarks: Bookmark01Icon,
  contact: Mail01Icon,
  settings: Settings02Icon,
  "og-studio": Image02Icon,
  invoices: Invoice02Icon,
  insights: ChartLineData02Icon,
};

let cachedEntries: SearchEntry[] | null = null;
let inflightEntries: Promise<SearchEntry[]> | null = null;

async function loadSearchEntries(): Promise<SearchEntry[]> {
  if (cachedEntries) return cachedEntries;
  if (inflightEntries) return inflightEntries;

  inflightEntries = fetch("/api/search-index")
    .then(async (res) => {
      if (!res.ok) return [];
      const data = (await res.json()) as SearchIndexResponse;
      cachedEntries = Array.isArray(data.entries) ? data.entries : [];
      return cachedEntries;
    })
    .catch(() => [])
    .finally(() => {
      inflightEntries = null;
    });

  return inflightEntries;
}

export function invalidateCommandPaletteIndex(): void {
  cachedEntries = null;
}

export function CommandPalette({
  open,
  onOpenChange,
  onOpenApp,
  onCloseAll,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onOpenApp: (appId: AppId) => void;
  onCloseAll: () => void;
}) {
  const router = useRouter();
  const { theme, toggleTheme, nextWallpaper } = useAppearance();
  const { bookmarks } = useContentBookmarks();
  const { authenticated, openLockCurtain, signOut, refreshContentCache } =
    useAdminAuth();

  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<SearchEntry[]>(cachedEntries ?? []);
  const [loadingIndex, setLoadingIndex] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);

    if (cachedEntries) {
      setEntries(cachedEntries);
    } else {
      setLoadingIndex(true);
      void loadSearchEntries().then((loaded) => {
        setEntries(loaded);
        setLoadingIndex(false);
      });
    }

    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 16);
    return () => window.clearTimeout(focusTimer);
  }, [open]);

  const closeAndRun = useCallback(
    (fn: () => void) => {
      onOpenChange(false);
      fn();
    },
    [onOpenChange],
  );

  const openResumeSection = useCallback(
    (section?: string) => {
      onOpenApp("resume");
      if (!section) return;
      window.setTimeout(() => {
        document.getElementById(`resume-${section}`)?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 150);
    },
    [onOpenApp],
  );

  const allItems = useMemo<PaletteItem[]>(() => {
    const items: PaletteItem[] = [];

    // 1. Saved items (browser bookmarks)
    for (const saved of bookmarks) {
      const label = CONTENT_META[saved.type]?.label ?? saved.type;
      items.push({
        id: `saved:${saved.type}:${saved.slug}`,
        group: "Saved",
        icon: Bookmark01Icon,
        title: saved.title,
        meta: `${label} · Saved`,
        keywords: [label, saved.type, "saved", "bookmark"],
        subtitle: saved.description,
        slug: saved.slug,
        date: saved.date,
        onSelect: () =>
          closeAndRun(() =>
            router.push(`/${saved.type}/${encodeURIComponent(saved.slug)}`, {
              scroll: false,
            }),
          ),
      });
    }

    // 2. Published content entries across all 6 collections
    for (const entry of entries) {
      const colLabel = CONTENT_META[entry.type].label;
      const metaParts = [colLabel];
      if (entry.readTime && entry.readTime > 0) {
        metaParts.push(`${entry.readTime}m`);
      }
      items.push({
        id: `entry:${entry.type}:${entry.slug}`,
        group: "Content",
        icon: COLLECTION_ICON[entry.type],
        title: entry.title,
        meta: metaParts.join(" · "),
        keywords: [
          colLabel,
          CONTENT_META[entry.type].singular,
          ...entry.categories,
          ...entry.tags,
        ],
        subtitle: entry.description,
        slug: entry.slug,
        date: entry.date,
        onSelect: () =>
          closeAndRun(() =>
            router.push(`/${entry.type}/${encodeURIComponent(entry.slug)}`, {
              scroll: false,
            }),
          ),
      });
    }

    // 3. Workspace applications & Resume sections
    for (const appId of DESKTOP_APPS) {
      const app = APP_REGISTRY[appId];
      items.push({
        id: `app:${appId}`,
        group: "Workspace",
        icon: APP_ICON[appId],
        title: app.title,
        meta: app.kind,
        shortcut:
          appId === "resume" ? "⌘O" : appId === "settings" ? "⌘," : undefined,
        keywords: [app.kind, app.description, appId, "window", "open", "app"],
        subtitle: app.description,
        onSelect: () => closeAndRun(() => onOpenApp(appId)),
      });
    }

    for (const sec of [
      {
        id: "experience",
        title: "Resume · Experience",
        kw: ["work", "career", "roles"],
      },
      {
        id: "education",
        title: "Resume · Education",
        kw: ["degree", "university", "academic"],
      },
      {
        id: "interests",
        title: "Resume · Research interests",
        kw: ["robotics", "mechatronics", "focus"],
      },
      {
        id: "languages",
        title: "Resume · Languages",
        kw: ["english", "sinhala"],
      },
    ]) {
      items.push({
        id: `resume-sec:${sec.id}`,
        group: "Workspace",
        icon: UserCircleIcon,
        title: sec.title,
        meta: "Section",
        keywords: ["resume", "cv", ...sec.kw],
        onSelect: () => closeAndRun(() => openResumeSection(sec.id)),
      });
    }

    // 4. Studio windows when signed in as owner
    if (authenticated) {
      items.push(
        {
          id: "studio:insights",
          group: "Studio",
          icon: ChartLineData02Icon,
          title: "Content Insights",
          meta: "Readership",
          shortcut: "⌘⇧A",
          keywords: [
            "reads",
            "insights",
            "dashboard",
            "views",
            "trends",
            "studio",
          ],
          onSelect: () => closeAndRun(() => onOpenApp("insights")),
        },
        {
          id: "studio:og",
          group: "Studio",
          icon: Image02Icon,
          title: "OG Image Studio",
          meta: "Brand graphics",
          shortcut: "⌘⇧G",
          keywords: ["og", "social", "card", "image", "studio"],
          onSelect: () => closeAndRun(() => onOpenApp("og-studio")),
        },
        {
          id: "studio:invoices",
          group: "Studio",
          icon: Invoice02Icon,
          title: "Invoice Studio",
          meta: "Workspace ledger",
          shortcut: "⌘⇧I",
          keywords: [
            "invoice",
            "billing",
            "clients",
            "pdf",
            "ledger",
            "studio",
          ],
          onSelect: () => closeAndRun(() => onOpenApp("invoices")),
        },
      );
    }

    // 5. Workspace commands & actions
    items.push(
      {
        id: "act:theme",
        group: "Commands",
        icon: theme === "dark" ? SunMediumIcon : Moon02Icon,
        title:
          theme === "dark"
            ? "Switch to light appearance"
            : "Switch to dark appearance",
        meta: "Appearance",
        keywords: ["theme", "dark", "light", "mode", "color", "appearance"],
        onSelect: () => closeAndRun(toggleTheme),
      },
      {
        id: "act:wallpaper",
        group: "Commands",
        icon: SparklesIcon,
        title: "Cycle desktop wallpaper",
        meta: "Appearance",
        keywords: ["wallpaper", "background", "contour", "canvas"],
        onSelect: () => closeAndRun(nextWallpaper),
      },
      {
        id: "act:copy-url",
        group: "Commands",
        icon: Copy01Icon,
        title: "Copy current page link",
        meta: "Clipboard",
        keywords: ["copy", "link", "url", "share"],
        onSelect: () =>
          closeAndRun(async () => {
            try {
              await navigator.clipboard.writeText(window.location.href);
              toast.success("Link copied.");
            } catch {
              toast.error("Could not copy link.");
            }
          }),
      },
      {
        id: "act:close-all",
        group: "Commands",
        icon: Cancel01Icon,
        title: "Close all open windows",
        meta: "Workspace",
        keywords: ["close", "windows", "clear", "desktop"],
        onSelect: () => closeAndRun(onCloseAll),
      },
    );

    if (authenticated) {
      items.push(
        {
          id: "act:refresh-cache",
          group: "Commands",
          icon: RefreshIcon,
          title: "Refresh published content cache",
          meta: "Owner",
          keywords: ["refresh", "purge", "cache", "sync", "content"],
          onSelect: () =>
            closeAndRun(() => {
              invalidateCommandPaletteIndex();
              void refreshContentCache();
            }),
        },
        {
          id: "act:sign-out",
          group: "Commands",
          icon: Logout01Icon,
          title: "Sign out of owner session",
          meta: "Owner",
          keywords: ["logout", "sign out", "lock"],
          onSelect: () => closeAndRun(() => void signOut()),
        },
      );
    } else {
      items.push({
        id: "act:sign-in",
        group: "Commands",
        icon: Login01Icon,
        title: "Owner sign in…",
        meta: "Workspace",
        shortcut: "⌘⇧L",
        keywords: ["login", "sign in", "owner", "admin", "unlock"],
        onSelect: () => closeAndRun(openLockCurtain),
      });
    }

    return items;
  }, [
    authenticated,
    bookmarks,
    closeAndRun,
    entries,
    nextWallpaper,
    onCloseAll,
    onOpenApp,
    openLockCurtain,
    openResumeSection,
    refreshContentCache,
    router,
    signOut,
    theme,
    toggleTheme,
  ]);

  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length > 0;

  const { filteredGroups, totalMatches } = useMemo(() => {
    if (!hasQuery) {
      return {
        filteredGroups: [] as Array<{ label: string; items: PaletteItem[] }>,
        totalMatches: 0,
      };
    }

    // Deduplicate Saved vs Content when searching so the same entry isn't listed twice.
    const seenEntrySlugs = new Set<string>();
    const scored: Array<{ item: PaletteItem; score: number }> = [];

    for (const item of allItems) {
      const s = scoreSearchCandidate(trimmedQuery, {
        title: item.title,
        subtitle: item.subtitle,
        keywords: [item.meta, ...item.keywords],
        slug: item.slug,
        date: item.date,
      });
      if (s <= 0) continue;

      if (item.id.startsWith("saved:") || item.id.startsWith("entry:")) {
        const slugIdentity = item.id.replace(/^(saved|entry):/, "");
        if (seenEntrySlugs.has(slugIdentity)) continue;
        seenEntrySlugs.add(slugIdentity);
      }

      scored.push({ item, score: s });
    }

    scored.sort((a, b) => b.score - a.score);
    const ranked = scored.slice(0, 12).map((entry) => entry.item);

    const groupOrder = ["Content", "Saved", "Studio", "Workspace", "Commands"];
    const byGroup = new Map<string, PaletteItem[]>();
    for (const item of ranked) {
      const list = byGroup.get(item.group) ?? [];
      list.push(item);
      byGroup.set(item.group, list);
    }

    const groups: Array<{ label: string; items: PaletteItem[] }> = [];
    for (const g of groupOrder) {
      const list = byGroup.get(g);
      if (list && list.length > 0) {
        groups.push({ label: g, items: list });
      }
    }
    return { filteredGroups: groups, totalMatches: scored.length };
  }, [allItems, hasQuery, trimmedQuery]);

  const flatItems = useMemo(
    () => filteredGroups.flatMap((group) => group.items),
    [filteredGroups],
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [trimmedQuery]);

  useEffect(() => {
    if (activeIndex >= flatItems.length && flatItems.length > 0) {
      setActiveIndex(flatItems.length - 1);
    }
  }, [activeIndex, flatItems.length]);

  useEffect(() => {
    if (!hasQuery) return;
    const container = listRef.current;
    if (!container) return;
    const activeEl = container.querySelector<HTMLElement>(
      `[data-cmd-index="${activeIndex}"]`,
    );
    activeEl?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, hasQuery]);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!hasQuery) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!flatItems.length) return;
      setActiveIndex((prev) => (prev + 1) % flatItems.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!flatItems.length) return;
      setActiveIndex(
        (prev) => (prev - 1 + flatItems.length) % flatItems.length,
      );
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      if (flatItems.length > 0) setActiveIndex(flatItems.length - 1);
      return;
    }
    if (event.key === "Enter") {
      const target = flatItems[activeIndex];
      if (target) {
        event.preventDefault();
        target.onSelect();
      }
    }
  };

  let runningIndex = -1;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="cmd-backdrop" />
        <DialogPrimitive.Viewport className="cmd-viewport">
          <DialogPrimitive.Popup
            className="cmd-popup"
            data-has-query={hasQuery ? "true" : undefined}
            aria-label="Workspace command search"
            onKeyDown={handleKeyDown}
          >
            <div className="cmd-input-row">
              <HugeiconsIcon
                icon={Search01Icon}
                size={15}
                strokeWidth={2}
                className="cmd-search-icon"
                aria-hidden
              />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search entries, apps, or commands…"
                aria-label="Search workspace"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                className="cmd-input"
              />
              {query ? (
                <button
                  type="button"
                  className="cmd-clear-btn"
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  aria-label="Clear search query"
                >
                  <HugeiconsIcon
                    icon={Cancel01Icon}
                    size={12}
                    strokeWidth={2}
                    aria-hidden
                  />
                </button>
              ) : null}
              <kbd className="cmd-kbd">Esc</kbd>
            </div>

            {hasQuery ? (
              <>
                <div
                  ref={listRef}
                  className="cmd-list"
                  role="listbox"
                  aria-label="Search results"
                >
                  {flatItems.length === 0 ? (
                    <div className="cmd-empty">
                      {loadingIndex
                        ? "Indexing published entries…"
                        : `No matches for “${trimmedQuery}”.`}
                    </div>
                  ) : (
                    filteredGroups.map((group) => (
                      <div key={group.label} className="cmd-group">
                        <div className="cmd-group-label">{group.label}</div>
                        {group.items.map((item) => {
                          runningIndex += 1;
                          const itemIndex = runningIndex;
                          const isActive = itemIndex === activeIndex;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              role="option"
                              aria-selected={isActive}
                              data-cmd-index={itemIndex}
                              className={`cmd-row${isActive ? " is-active" : ""}`}
                              onMouseMove={() => {
                                if (activeIndex !== itemIndex) {
                                  setActiveIndex(itemIndex);
                                }
                              }}
                              onClick={item.onSelect}
                            >
                              <HugeiconsIcon
                                icon={item.icon}
                                size={14}
                                strokeWidth={1.9}
                                className="cmd-row-icon"
                                aria-hidden
                              />
                              <span className="cmd-row-title">
                                {item.title}
                              </span>
                              {item.shortcut ? (
                                <kbd className="cmd-kbd">{item.shortcut}</kbd>
                              ) : (
                                <span className="cmd-row-meta">
                                  {item.meta}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ))
                  )}
                </div>

                <footer className="cmd-footer" aria-hidden>
                  <div className="cmd-footer-hints">
                    <span>
                      <kbd className="cmd-kbd">↑↓</kbd> Navigate
                    </span>
                    <span>
                      <kbd className="cmd-kbd">↵</kbd> Open
                    </span>
                  </div>
                  <span className="cmd-footer-count">
                    {loadingIndex
                      ? "Indexing…"
                      : `${totalMatches} ${totalMatches === 1 ? "match" : "matches"}`}
                  </span>
                </footer>
              </>
            ) : null}
          </DialogPrimitive.Popup>
        </DialogPrimitive.Viewport>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
