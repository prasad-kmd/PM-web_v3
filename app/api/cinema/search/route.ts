import { NextResponse, type NextRequest } from "next/server";

import { requireAdminSession } from "@/lib/admin/auth";
import { searchCinema } from "@/lib/cinema/tmdb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "private, no-store, max-age=0" };

/**
 * Unified search: films, series **and** people in one response.
 *
 * The reference app threw `person` results away, which is why its cast lists
 * were dead text. Keeping them here is what makes the filmography view
 * reachable at all.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;

  const params = request.nextUrl.searchParams;
  const query = (params.get("q") ?? "").trim();
  const pageParam = Number.parseInt(params.get("page") ?? "1", 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  if (query.length < 2) {
    return NextResponse.json(
      {
        query,
        titles: [],
        people: [],
        page: 1,
        totalPages: 1,
        totalResults: 0,
      },
      { headers: HEADERS },
    );
  }

  const result = await searchCinema(query, page);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      {
        status: result.error.code === "rate_limited" ? 429 : 502,
        headers: HEADERS,
      },
    );
  }

  return NextResponse.json({ query, ...result.data }, { headers: HEADERS });
}
