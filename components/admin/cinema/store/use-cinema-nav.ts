"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";

import { findCollection, findHomeRow, findMood } from "@/lib/cinema/catalog";
import type { CinemaMediaType } from "@/lib/cinema/types";
import type { CinemaViewId } from "@/lib/cinema/config";

export type CinemaListSource = "row" | "collection" | "mood";

export type CinemaRoute =
  | { view: "browse" }
  | { view: "search"; query: string }
  | { view: "library" }
  | { view: "settings" }
  | { view: "list"; source: CinemaListSource; id: string; title: string }
  | { view: "title"; mediaType: CinemaMediaType; tmdbId: number }
  | { view: "person"; personId: number };

export const CINEMA_BASE_PATH = "/cinema";

/** Which toolbar tab owns a route — detail screens belong to Browse. */
export function tabForRoute(route: CinemaRoute): CinemaViewId {
  switch (route.view) {
    case "search":
      return "search";
    case "library":
      return "library";
    case "settings":
      return "settings";
    default:
      return "browse";
  }
}

export function routeKey(route: CinemaRoute): string {
  switch (route.view) {
    case "list":
      return `list:${route.source}:${route.id}`;
    case "title":
      return `title:${route.mediaType}:${route.tmdbId}`;
    case "person":
      return `person:${route.personId}`;
    default:
      return route.view;
  }
}

function listTitle(source: CinemaListSource, id: string): string {
  if (source === "row") return findHomeRow(id)?.label ?? "Results";
  if (source === "collection") return findCollection(id)?.label ?? "Collection";
  return findMood(id)?.label ?? "Results";
}

function positiveInt(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Pathname → route.
 *
 * `/cinema`                     browse
 * `/cinema/search?q=dune`       search
 * `/cinema/library`             library
 * `/cinema/settings`            settings
 * `/cinema/movie/550`           film detail
 * `/cinema/tv/1396`             series detail
 * `/cinema/person/287`          filmography
 * `/cinema/list/row/trending`   see-all shelf
 */
export function cinemaRouteFromPath(
  pathname: string | null | undefined,
  search?: string | null,
): CinemaRoute {
  const path = (pathname ?? CINEMA_BASE_PATH).replace(/\/+$/, "");
  const rest = path.startsWith(CINEMA_BASE_PATH)
    ? path.slice(CINEMA_BASE_PATH.length)
    : path;
  const segments = rest.split("/").filter(Boolean);

  if (segments.length === 0) return { view: "browse" };

  const [head, first, second] = segments;

  if (head === "search") {
    const query = new URLSearchParams(search ?? "").get("q") ?? "";
    return { view: "search", query };
  }
  if (head === "library") return { view: "library" };
  if (head === "settings") return { view: "settings" };

  if (head === "movie" || head === "tv") {
    const tmdbId = positiveInt(first);
    if (!tmdbId) return { view: "browse" };
    return { view: "title", mediaType: head, tmdbId };
  }

  if (head === "person") {
    const personId = positiveInt(first);
    if (!personId) return { view: "browse" };
    return { view: "person", personId };
  }

  if (
    head === "list" &&
    (first === "row" || first === "collection" || first === "mood")
  ) {
    if (!second) return { view: "browse" };
    return {
      view: "list",
      source: first,
      id: second,
      title: listTitle(first, second),
    };
  }

  return { view: "browse" };
}

export function cinemaPathFor(
  route: CinemaRoute,
  options: { query?: string } = {},
): string {
  switch (route.view) {
    case "search":
      return route.query
        ? `${CINEMA_BASE_PATH}/search?q=${encodeURIComponent(route.query)}`
        : `${CINEMA_BASE_PATH}/search`;
    case "library":
      return `${CINEMA_BASE_PATH}/library`;
    case "settings":
      return `${CINEMA_BASE_PATH}/settings`;
    case "list":
      return `${CINEMA_BASE_PATH}/list/${route.source}/${route.id}`;
    case "title":
      return `${CINEMA_BASE_PATH}/${route.mediaType}/${route.tmdbId}`;
    case "person":
      return `${CINEMA_BASE_PATH}/person/${route.personId}`;
    default:
      return options.query
        ? `${CINEMA_BASE_PATH}?q=${encodeURIComponent(options.query)}`
        : CINEMA_BASE_PATH;
  }
}

/** Depth of in-app navigation, so Back never leaves the studio on a cold load. */
let navDepth = 0;

/**
 * URL-driven in-window router.
 *
 * The route is derived from `usePathname()`, so browser Back/Forward, deep
 * links and `⌘[` all agree, and the window survives a reload on any page.
 */
export function useCinemaRouter() {
  const pathname = usePathname();
  const router = useRouter();

  const route = useMemo(() => cinemaRouteFromPath(pathname), [pathname]);

  const go = useCallback(
    (next: CinemaRoute) => {
      navDepth += 1;
      router.push(cinemaPathFor(next), { scroll: false });
    },
    [router],
  );

  const replace = useCallback(
    (next: CinemaRoute) => {
      router.replace(cinemaPathFor(next), { scroll: false });
    },
    [router],
  );

  const back = useCallback(() => {
    if (navDepth > 0) {
      navDepth -= 1;
      router.back();
      return;
    }
    router.push(CINEMA_BASE_PATH, { scroll: false });
  }, [router]);

  return { route, go, replace, back };
}
