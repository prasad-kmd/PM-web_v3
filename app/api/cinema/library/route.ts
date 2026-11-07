import { NextResponse, type NextRequest } from "next/server";

import { requireAdminSession } from "@/lib/admin/auth";
import { sameOrigin } from "@/lib/comments/request-context";
import {
  CinemaLibraryDraftSchema,
  listCinemaLibrary,
  upsertCinemaLibraryEntry,
} from "@/lib/cinema/library";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "private, no-store, max-age=0" };

/** Whole library (entries + prefs + storage mode) in one read. */
export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;

  const snapshot = await listCinemaLibrary();
  return NextResponse.json(snapshot, { headers: HEADERS });
}

/** Idempotent upsert on `titleKey` — favouriting twice never duplicates a row. */
export async function POST(request: NextRequest) {
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
      { error: "Invalid library payload." },
      { status: 400, headers: HEADERS },
    );
  }

  const parsed = CinemaLibraryDraftSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ??
          "Check the title fields and try again.",
      },
      { status: 400, headers: HEADERS },
    );
  }

  try {
    const result = await upsertCinemaLibraryEntry(parsed.data);
    return NextResponse.json(result, { headers: HEADERS });
  } catch {
    return NextResponse.json(
      { error: "Could not save to the library." },
      { status: 500, headers: HEADERS },
    );
  }
}
