import { NextResponse, type NextRequest } from "next/server";

import { requireAdminSession } from "@/lib/admin/auth";
import { sameOrigin } from "@/lib/comments/request-context";
import {
  CinemaPrefsSchema,
  DEFAULT_CINEMA_PREFS,
  listCinemaLibrary,
  saveCinemaPrefs,
} from "@/lib/cinema/library";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  const snapshot = await listCinemaLibrary();
  return NextResponse.json(
    { prefs: snapshot.prefs ?? DEFAULT_CINEMA_PREFS },
    { headers: HEADERS },
  );
}

/** Preferences live as one row in the same database — no second env var. */
export async function PUT(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json(
      { error: "Cross-origin requests are not permitted." },
      { status: 403, headers: HEADERS },
    );
  }
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid preferences payload." },
      { status: 400, headers: HEADERS },
    );
  }

  const parsed = CinemaPrefsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check the preference values." },
      { status: 400, headers: HEADERS },
    );
  }

  try {
    const result = await saveCinemaPrefs(parsed.data);
    return NextResponse.json(result, { headers: HEADERS });
  } catch {
    return NextResponse.json(
      { error: "Could not save preferences." },
      { status: 500, headers: HEADERS },
    );
  }
}
