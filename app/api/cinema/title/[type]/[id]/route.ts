import { NextResponse, type NextRequest } from "next/server";

import { requireAdminSession } from "@/lib/admin/auth";
import { getOmdbKey } from "@/lib/cinema/env";
import { fetchCinemaTitle } from "@/lib/cinema/tmdb";
import { fetchOmdbInfo } from "@/lib/cinema/omdb";
import type { CinemaMediaType, CinemaOmdbInfo } from "@/lib/cinema/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "private, no-store, max-age=0" };

type RouteContext = { params: Promise<{ type: string; id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;

  const { type, id } = await context.params;
  if (type !== "movie" && type !== "tv") {
    return NextResponse.json(
      { error: "Unknown media type." },
      { status: 400, headers: HEADERS },
    );
  }
  const tmdbId = Number.parseInt(id, 10);
  if (!Number.isFinite(tmdbId) || tmdbId <= 0) {
    return NextResponse.json(
      { error: "Unknown title." },
      { status: 400, headers: HEADERS },
    );
  }

  const detail = await fetchCinemaTitle(type as CinemaMediaType, tmdbId);
  if (!detail.ok) {
    // 404 stays 404; everything else is an upstream problem the UI can retry.
    const status = detail.error.code === "not_found" ? 404 : 502;
    return NextResponse.json(
      { error: detail.error.message, code: detail.error.code },
      { status, headers: HEADERS },
    );
  }

  /* Secondary scores are enrichment: if OMDb is unconfigured or unhappy the
     title still renders, with the score row hidden. */
  let ratings: CinemaOmdbInfo | null = null;
  if (getOmdbKey() && detail.data.imdbId) {
    const omdb = await fetchOmdbInfo(detail.data.imdbId);
    if (omdb.ok) ratings = omdb.data;
  }

  return NextResponse.json(
    { title: detail.data, ratings },
    { headers: HEADERS },
  );
}
