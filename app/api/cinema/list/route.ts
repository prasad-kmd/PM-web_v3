import { NextResponse, type NextRequest } from "next/server";

import { requireAdminSession } from "@/lib/admin/auth";
import { findCollection, findHomeRow, findMood } from "@/lib/cinema/catalog";
import {
  discoverCinema,
  fetchCinemaList,
  type CinemaListKind,
} from "@/lib/cinema/tmdb";
import type {
  CinemaListPayload,
  CinemaResult,
  CinemaTitle,
} from "@/lib/cinema/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "private, no-store, max-age=0" };

/**
 * Backing endpoint for every "See all" surface.
 *
 * `source` is a closed union resolved against literals in
 * `lib/cinema/catalog.ts` — the client can never smuggle an arbitrary TMDB
 * query through here.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;

  const params = request.nextUrl.searchParams;
  const source = params.get("source");
  const id = params.get("id");
  const pageParam = Number.parseInt(params.get("page") ?? "1", 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  if (!id) {
    return NextResponse.json(
      { error: "A list id is required." },
      { status: 400, headers: HEADERS },
    );
  }

  let result: CinemaResult<{
    items: CinemaTitle[];
    page: number;
    totalPages: number;
    totalResults: number;
  }>;
  let title = "Results";

  if (source === "row") {
    const row = findHomeRow(id);
    if (!row) {
      return NextResponse.json(
        { error: "Unknown row." },
        { status: 404, headers: HEADERS },
      );
    }
    title = row.label;
    result = await fetchCinemaList(row.kind as CinemaListKind, page);
  } else if (source === "collection") {
    const collection = findCollection(id);
    if (!collection) {
      return NextResponse.json(
        { error: "Unknown collection." },
        { status: 404, headers: HEADERS },
      );
    }
    title = collection.label;
    result = await discoverCinema(collection.discover, page);
  } else if (source === "mood") {
    const mood = findMood(id);
    if (!mood) {
      return NextResponse.json(
        { error: "Unknown mood." },
        { status: 404, headers: HEADERS },
      );
    }
    title = mood.label;
    result = await discoverCinema(mood.discover, page);
  } else {
    return NextResponse.json(
      { error: "Unknown list source." },
      { status: 400, headers: HEADERS },
    );
  }

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      {
        status: result.error.code === "rate_limited" ? 429 : 502,
        headers: HEADERS,
      },
    );
  }

  const payload: CinemaListPayload = {
    title,
    items: result.data.items,
    page: result.data.page,
    totalPages: result.data.totalPages,
    totalResults: result.data.totalResults,
  };
  return NextResponse.json(payload, { headers: HEADERS });
}
