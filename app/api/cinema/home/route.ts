import { NextResponse, type NextRequest } from "next/server";

import { requireAdminSession } from "@/lib/admin/auth";
import {
  CINEMA_COLLECTIONS,
  CINEMA_HOME_ROWS,
  CINEMA_MOODS,
} from "@/lib/cinema/catalog";
import { CINEMA_HERO_POOL_SIZE } from "@/lib/cinema/config";
import {
  discoverCinema,
  fetchCinemaList,
  type CinemaListPage,
} from "@/lib/cinema/tmdb";
import type {
  CinemaCollectionPayload,
  CinemaHomePayload,
  CinemaHomeRowPayload,
  CinemaTitle,
} from "@/lib/cinema/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "private, no-store, max-age=0" };

/**
 * Today's feature — deterministic per UTC day, so the hero is stable across
 * reloads and identical for every request within a day. (The reference app
 * re-shuffled its whole catalogue on every server render.)
 */
function dayOfEpoch(): number {
  const now = new Date();
  return Math.floor(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) /
      86_400_000,
  );
}

function buildHero(pool: CinemaTitle[]): {
  hero: CinemaTitle[];
  index: number;
} {
  const withArt = pool.filter((item) => item.backdropPath);
  const usable = withArt.length > 0 ? withArt : pool;
  if (usable.length === 0) return { hero: [], index: 0 };
  const subset = usable.slice(0, CINEMA_HERO_POOL_SIZE);
  return { hero: subset, index: dayOfEpoch() % subset.length };
}

function unwrap(
  result: { ok: true; data: CinemaListPage } | { ok: false; error: unknown },
): CinemaListPage | null {
  return result.ok ? result.data : null;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;

  /* The first row *is* the trending list, which also seeds the hero — fetch it
     once and reuse it rather than spending two TMDB calls on the same shelf. */
  const [trendingSettled, restSettled, collectionSettled] = await Promise.all([
    fetchCinemaList("trending-movies"),
    Promise.allSettled(
      CINEMA_HOME_ROWS.slice(1).map((row) => fetchCinemaList(row.kind)),
    ),
    Promise.allSettled(
      CINEMA_COLLECTIONS.map((collection) =>
        discoverCinema(collection.discover, 1),
      ),
    ),
  ]);

  const degraded: string[] = [];

  const trending = unwrap(trendingSettled);
  const trendingRow = CINEMA_HOME_ROWS[0];

  const rows: CinemaHomeRowPayload[] = [];
  if (trending && trending.items.length > 0) {
    rows.push({
      id: trendingRow.id,
      label: trendingRow.label,
      ranked: Boolean(trendingRow.ranked),
      kind: trendingRow.kind,
      items: trending.items,
      totalPages: trending.totalPages,
    });
  } else {
    degraded.push(trendingRow.label);
  }

  CINEMA_HOME_ROWS.slice(1).forEach((config, index) => {
    const settled = restSettled[index];
    const page =
      settled && settled.status === "fulfilled" ? unwrap(settled.value) : null;
    if (!page || page.items.length === 0) {
      if (!degraded.includes(config.label)) degraded.push(config.label);
      return;
    }
    rows.push({
      id: config.id,
      label: config.label,
      ranked: Boolean(config.ranked),
      kind: config.kind,
      items: page.items,
      totalPages: page.totalPages,
    });
  });

  const collections: CinemaCollectionPayload[] = CINEMA_COLLECTIONS.map(
    (collection, index) => {
      const settled = collectionSettled[index];
      const page =
        settled && settled.status === "fulfilled"
          ? unwrap(settled.value)
          : null;
      const backdrops = (page?.items ?? [])
        .map((item) => item.backdropPath)
        .filter((path): path is string => Boolean(path))
        .slice(0, 2);
      return {
        id: collection.id,
        label: collection.label,
        blurb: collection.blurb,
        backdrops,
      };
    },
  );

  const { hero, index } = buildHero(trending?.items ?? []);

  const payload: CinemaHomePayload = {
    hero,
    heroIndex: index,
    rows,
    collections,
    moods: CINEMA_MOODS.map((mood) => ({ id: mood.id, label: mood.label })),
    degraded,
  };

  return NextResponse.json(payload, { headers: HEADERS });
}
