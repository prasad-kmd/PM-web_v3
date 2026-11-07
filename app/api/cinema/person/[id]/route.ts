import { NextResponse, type NextRequest } from "next/server";

import { requireAdminSession } from "@/lib/admin/auth";
import { fetchCinemaPerson } from "@/lib/cinema/tmdb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "private, no-store, max-age=0" };

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Filmography for one person, from `combined_credits`.
 *
 * `discover/tv` has no `with_cast` filter, so TV credits cannot be paged
 * server-side the way films can; the merged credit list from TMDB is the only
 * complete source. The whole filmography ships in one payload and the client
 * filters/sorts it.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const personId = Number.parseInt(id, 10);
  if (!Number.isFinite(personId) || personId <= 0) {
    return NextResponse.json(
      { error: "Unknown person." },
      { status: 400, headers: HEADERS },
    );
  }

  const result = await fetchCinemaPerson(personId);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      {
        status: result.error.code === "not_found" ? 404 : 502,
        headers: HEADERS,
      },
    );
  }

  return NextResponse.json(result.data, { headers: HEADERS });
}
