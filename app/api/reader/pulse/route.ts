import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { sameOrigin } from "@/lib/comments/request-context";
import { CONTENT_TYPES } from "@/lib/content-types";
import {
  getEntryReadCount,
  isContentType,
  isValidSlug,
  recordEntryRead,
} from "@/lib/engagement/reads";

export const runtime = "nodejs";

// Keep the count edge-cached for one hour, with only a short stale window.
// Browsers revalidate; they do not hold their own copy for the whole ISR period.
const READ_CACHE_CONTROL =
  "public, max-age=0, s-maxage=3600, stale-while-revalidate=300";

const payloadSchema = z.object({
  type: z.enum(CONTENT_TYPES),
  slug: z.string().trim().min(1).max(160),
  ref: z.string().trim().max(512).optional(),
});

export async function GET(request: NextRequest) {
  const rawType = request.nextUrl.searchParams.get("type")?.trim() ?? "";
  const rawSlug = request.nextUrl.searchParams.get("slug")?.trim() ?? "";

  if (!isContentType(rawType) || !isValidSlug(rawSlug)) {
    return NextResponse.json(
      { error: "Invalid entry parameters." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const count = await getEntryReadCount(rawType, rawSlug);
    return NextResponse.json(
      { configured: count !== null, count },
      { headers: { "Cache-Control": READ_CACHE_CONTROL } },
    );
  } catch {
    // Do not let a provider outage become a cached error response.
    return NextResponse.json(
      { error: "Read count is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json(
      { error: "Request rejected." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Malformed request." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success || !isValidSlug(parsed.data.slug)) {
    return NextResponse.json(
      { error: "Invalid entry parameters." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const result = await recordEntryRead({
    request,
    type: parsed.data.type,
    slug: parsed.data.slug,
    referrer: parsed.data.ref ?? null,
  });

  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
