import { NextResponse, type NextRequest } from "next/server";

import { requireAdminSession } from "@/lib/admin/auth";
import { sameOrigin } from "@/lib/comments/request-context";
import {
  CinemaLibraryPatchSchema,
  archiveCinemaLibraryEntry,
  patchCinemaLibraryEntry,
} from "@/lib/cinema/library";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "private, no-store, max-age=0" };

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  if (!sameOrigin(request)) {
    return NextResponse.json(
      { error: "Cross-origin requests are not permitted." },
      { status: 403, headers: HEADERS },
    );
  }
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid library payload." },
      { status: 400, headers: HEADERS },
    );
  }

  const parsed = CinemaLibraryPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid patch." },
      { status: 400, headers: HEADERS },
    );
  }

  try {
    const result = await patchCinemaLibraryEntry(id, parsed.data);
    if (!result.entry) {
      return NextResponse.json(
        { error: "That library row no longer exists." },
        { status: 404, headers: HEADERS },
      );
    }
    return NextResponse.json(result, { headers: HEADERS });
  } catch {
    return NextResponse.json(
      { error: "Could not update the library row." },
      { status: 500, headers: HEADERS },
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!sameOrigin(request)) {
    return NextResponse.json(
      { error: "Cross-origin requests are not permitted." },
      { status: 403, headers: HEADERS },
    );
  }
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  try {
    const result = await archiveCinemaLibraryEntry(id);
    if (!result.ok) {
      return NextResponse.json(
        { error: "Could not remove that row." },
        { status: 404, headers: HEADERS },
      );
    }
    return NextResponse.json(result, { headers: HEADERS });
  } catch {
    return NextResponse.json(
      { error: "Could not remove that row." },
      { status: 500, headers: HEADERS },
    );
  }
}
