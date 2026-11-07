import { NextResponse, type NextRequest } from "next/server";

import { requireAdminSession } from "@/lib/admin/auth";
import { getCinemaCapabilities } from "@/lib/cinema/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "private, no-store, max-age=0" };

/**
 * Reports which upstream integrations are usable. It never calls an external
 * API — it only reflects environment presence, so the studio can render an
 * honest "not configured" state instead of an empty, broken-looking page.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;

  return NextResponse.json(
    { capabilities: getCinemaCapabilities() },
    { headers: HEADERS },
  );
}
