"use client";

import {
  ArrowLeft01Icon,
  Bookmark01Icon,
  Film02Icon,
  InformationCircleIcon,
  Search01Icon,
  Settings02Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useShouldReduceMotion } from "@animate-ui/react/utils/motion";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  CinemaLibraryProvider,
  useCinemaLibrary,
} from "@/components/admin/cinema/store/LibraryProvider";
import {
  routeKey,
  tabForRoute,
  useCinemaRouter,
  type CinemaRoute,
} from "@/components/admin/cinema/store/use-cinema-nav";
import { BrowseView } from "@/components/admin/cinema/views/BrowseView";
import { LibraryView } from "@/components/admin/cinema/views/LibraryView";
import { PersonView } from "@/components/admin/cinema/views/PersonView";
import { SearchView } from "@/components/admin/cinema/views/SearchView";
import { SeeAllView } from "@/components/admin/cinema/views/SeeAllView";
import { SettingsView } from "@/components/admin/cinema/views/SettingsView";
import { TitleView } from "@/components/admin/cinema/views/TitleView";
import { StateNotice } from "@/components/admin/cinema/parts/StateNotice";
import { LoadingView } from "@/components/system/states/LoadingView";
import { Button } from "@/components/ui/button";
import {
  CINEMA_APP_TITLE,
  CINEMA_VIEWS,
  type CinemaViewId,
} from "@/lib/cinema/config";
import type { CinemaCapabilities, CinemaTitle } from "@/lib/cinema/types";

const VIEW_ICONS = {
  browse: Film02Icon,
  search: Search01Icon,
  library: Bookmark01Icon,
  settings: Settings02Icon,
} as const;

type StatusState =
  | { kind: "loading" }
  | { kind: "ready"; capabilities: CinemaCapabilities }
  | { kind: "error" };

const TAB_ROUTE: Record<CinemaViewId, CinemaRoute> = {
  browse: { view: "browse" },
  search: { view: "search", query: "" },
  library: { view: "library" },
  settings: { view: "settings" },
};

/** Shared transition for every in-app screen change. */
const VIEW_MOTION = {
  duration: 0.18,
  ease: [0.23, 1, 0.32, 1] as [number, number, number, number],
};

export function CinemaStudioApp() {
  return (
    <CinemaLibraryProvider>
      <CinemaStudioShell />
    </CinemaLibraryProvider>
  );
}

function CinemaStudioShell() {
  const [status, setStatus] = useState<StatusState>({ kind: "loading" });
  const library = useCinemaLibrary();
  const reduceMotion = useShouldReduceMotion();
  const { route, go, back } = useCinemaRouter();
  /* Last committed search term, so the Search tab reopens where you left it. */
  const lastTermRef = useRef("");

  const loadStatus = useCallback(async (signal?: AbortSignal) => {
    setStatus({ kind: "loading" });
    try {
      const response = await fetch("/api/cinema/status", {
        cache: "no-store",
        signal,
      });
      if (!response.ok) throw new Error("status");
      const payload = (await response.json()) as {
        capabilities?: CinemaCapabilities;
      };
      if (!payload.capabilities) throw new Error("status");
      setStatus({ kind: "ready", capabilities: payload.capabilities });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setStatus({ kind: "error" });
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadStatus(controller.signal);
    return () => controller.abort();
  }, [loadStatus]);

  /* ⌘[ / Ctrl+[ step back through the studio's own history. */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) {
        return;
      }
      if (event.key !== "[") return;
      event.preventDefault();
      back();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [back]);

  const openTitle = useCallback(
    (title: CinemaTitle) => {
      go({ view: "title", mediaType: title.mediaType, tmdbId: title.tmdbId });
    },
    [go],
  );

  const openPerson = useCallback(
    (personId: number) => {
      go({ view: "person", personId });
    },
    [go],
  );

  /* Search keeps its term in the address bar without a router navigation per
     keystroke, so Back from a result returns to the same result list. */
  const commitSearchTerm = useCallback((term: string) => {
    lastTermRef.current = term;
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (term) url.searchParams.set("q", term);
    else url.searchParams.delete("q");
    window.history.replaceState(null, "", url.toString());
  }, []);

  const activeTab = useMemo(() => tabForRoute(route), [route]);
  const canGoBack = route.view !== "browse";

  if (status.kind === "loading") {
    return <LoadingView label={CINEMA_APP_TITLE} layout="cinema" />;
  }

  const capabilities: CinemaCapabilities =
    status.kind === "ready"
      ? status.capabilities
      : { tmdb: false, omdb: false, notion: false, settings: false };

  const view = !capabilities.tmdb ? (
    <div className="cinema-scroll">
      <StateNotice
        title="TMDB is not configured yet"
        body="Add TMDB_API_KEY to the environment — a v3 key or a v4 read token, both work — then reload the workspace. Optional: OMDB_API_KEY for IMDb and Metacritic scores, NOTION_CINEMA_FAVORITES_ID for the Notion library."
      />
    </div>
  ) : status.kind === "error" ? (
    <div className="cinema-scroll">
      <StateNotice
        title="Studio state could not be read"
        body="The capability endpoint did not answer. Nothing was changed — retry to continue."
        action={
          <Button size="xs" variant="outline" onClick={() => void loadStatus()}>
            Retry
          </Button>
        }
      />
    </div>
  ) : route.view === "browse" ? (
    <BrowseView
      onOpenTitle={openTitle}
      onOpenList={(source, id, title) =>
        go({ view: "list", source, id, title })
      }
    />
  ) : route.view === "list" ? (
    <SeeAllView
      source={route.source}
      listId={route.id}
      title={route.title}
      onBack={back}
      onOpenTitle={openTitle}
    />
  ) : route.view === "title" ? (
    <TitleView
      mediaType={route.mediaType}
      tmdbId={route.tmdbId}
      onOpenTitle={openTitle}
      onOpenPerson={openPerson}
    />
  ) : route.view === "search" ? (
    <SearchView
      initialQuery={route.query}
      onQueryChange={commitSearchTerm}
      onOpenTitle={openTitle}
      onOpenPerson={(person) => openPerson(person.tmdbId)}
    />
  ) : route.view === "person" ? (
    <PersonView
      personId={route.personId}
      onBack={back}
      onOpenTitle={openTitle}
    />
  ) : route.view === "library" ? (
    <LibraryView
      onOpenTitle={openTitle}
      onBrowse={() => go({ view: "browse" })}
    />
  ) : (
    <SettingsView />
  );

  return (
    <div
      className={`admin-studio-shell cinema-studio-shell${
        library.prefs.posterDensity === "compact" ? " is-compact" : ""
      }`}
    >
      <header className="admin-studio-toolbar">
        <div className="admin-studio-toolbar-left">
          {canGoBack ? (
            <Button
              size="icon-xs"
              variant="ghost"
              onClick={back}
              aria-label="Back"
              title="Back (⌘[)"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} size={14} />
            </Button>
          ) : null}

          <nav
            className="admin-segmented-tabs cinema-tabs"
            aria-label="Cinema studio sections"
          >
            {CINEMA_VIEWS.map((item) => {
              const Icon = VIEW_ICONS[item.id];
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    go(
                      item.id === "search"
                        ? { view: "search", query: lastTermRef.current }
                        : TAB_ROUTE[item.id],
                    )
                  }
                  className={`admin-segmented-tab${active ? " is-active" : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  {active ? (
                    <motion.span
                      layoutId="cinema-tab-pill"
                      className="cinema-tab-pill"
                      transition={
                        reduceMotion
                          ? { duration: 0 }
                          : { type: "spring", stiffness: 520, damping: 38 }
                      }
                    />
                  ) : null}
                  <span className="cinema-tab-inner">
                    <HugeiconsIcon icon={Icon} strokeWidth={2} size={13} />
                    <span>{item.label}</span>
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="admin-studio-toolbar-right">
          <span
            className="admin-studio-pill cinema-storage-pill"
            title={
              library.storageMode === "cloud"
                ? "Library rows are stored in your Notion database."
                : "Notion is not configured — the library lives in this session only."
            }
          >
            <HugeiconsIcon
              icon={
                library.storageMode === "cloud"
                  ? Tick02Icon
                  : InformationCircleIcon
              }
              strokeWidth={2}
              size={12}
            />
            {!library.ready
              ? "Library…"
              : library.storageMode === "cloud"
                ? "Notion library"
                : "Session library"}
          </span>
        </div>
      </header>

      <div className="cinema-body">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={routeKey(route)}
            className="cinema-view"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
            transition={reduceMotion ? { duration: 0 } : VIEW_MOTION}
          >
            {view}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
