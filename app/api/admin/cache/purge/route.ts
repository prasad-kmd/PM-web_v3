import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/admin/auth";
import { sameOrigin } from "@/lib/comments/request-context";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json(
      { error: "Cross-origin requests are not permitted." },
      { status: 403 },
    );
  }
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;

  revalidateTag("notion-cms", "max");

  return NextResponse.json(
    { ok: true, refreshedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
