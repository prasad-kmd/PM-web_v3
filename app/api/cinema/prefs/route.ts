import { NextResponse, type NextRequest } from "next/server";

import { requireAdminSession } from "@/lib/admin/auth";
import { sameOrigin } from "@/lib/comments/request-context";
import { CinemaPrefsSchema } from "@/lib/cinema/library";
import {
  invalidateCinemaSettings,
  loadCinemaSettings,
  saveCinemaSettings,
} from "@/lib/cinema/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "private, no-store, max-age=0" };

/**
 * Preferences — stored on the Notion **settings page** when
 * `NOTION_CINEMA_SETTINGS_PAGE_ID` is configured, otherwise on the
 * `__cinema_prefs` row inside the library database, otherwise in this process.
 *
 * `mode` tells the UI which of those is true; `notice` carries a real reason
 * when a configured store refused the write.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;

  const settings = await loadCinemaSettings();
  return NextResponse.json(settings, { headers: HEADERS });
}

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
    invalidateCinemaSettings();
    const saved = await saveCinemaSettings(parsed.data);
    return NextResponse.json(saved, { headers: HEADERS });
  } catch {
    return NextResponse.json(
      { error: "Could not save preferences." },
      { status: 500, headers: HEADERS },
    );
  }
}
