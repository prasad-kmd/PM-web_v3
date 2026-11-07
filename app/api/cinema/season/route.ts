import { NextResponse, type NextRequest } from "next/server";

import { requireAdminSession } from "@/lib/admin/auth";
import { fetchCinemaSeason } from "@/lib/cinema/tmdb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "private, no-store, max-age=0" };

/** Episode list for one season — powers the TV episode picker. */
export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;

  const params = request.nextUrl.searchParams;
  const tvId = Number.parseInt(params.get("tv") ?? "", 10);
  const season = Number.parseInt(params.get("season") ?? "", 10);

  if (!Number.isFinite(tvId) || tvId <= 0) {
    return NextResponse.json(
      { error: "Unknown series." },
      { status: 400, headers: HEADERS },
    );
  }
  if (!Number.isFinite(season) || season < 0) {
    return NextResponse.json(
      { error: "Unknown season." },
      { status: 400, headers: HEADERS },
    );
  }

  const result = await fetchCinemaSeason(tvId, season);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      {
        status: result.error.code === "not_found" ? 404 : 502,
        headers: HEADERS,
      },
    );
  }

  return NextResponse.json(
    { tvId, season, episodes: result.data },
    { headers: HEADERS },
  );
}
