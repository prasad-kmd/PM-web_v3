import { NextResponse, type NextRequest } from "next/server";

import { requireAdminSession } from "@/lib/admin/auth";
import { fetchCinemaDownloads } from "@/lib/cinema/yts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "private, no-store, max-age=0" };

/**
 * YTS releases for one title. Always available (no feature flag), and it always
 * distinguishes "no release" from "YTS failed".
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;

  const params = request.nextUrl.searchParams;
  const imdbId = params.get("imdb");
  const title = (params.get("title") ?? "Untitled").slice(0, 200);

  const result = await fetchCinemaDownloads(imdbId, title);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: 502, headers: HEADERS },
    );
  }

  return NextResponse.json(result.data, { headers: HEADERS });
}
