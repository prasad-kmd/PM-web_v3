import { NextResponse, type NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/admin/auth";
import { loadCinemaTaste, type TasteAngle } from "@/lib/cinema/taste-server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  const value = request.nextUrl.searchParams.get("angle");
  const angle: TasteAngle =
    value === "popular" || value === "recent" ? value : "rating";
  let taste = null;
  try {
    taste = await loadCinemaTaste(angle);
  } catch {
    /* recommendations are optional */
  }
  return NextResponse.json(taste ?? { profile: null, reason: "", items: [] }, {
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
}
