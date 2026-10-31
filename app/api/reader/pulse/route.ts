import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { sameOrigin } from "@/lib/comments/request-context";
import { CONTENT_TYPES } from "@/lib/content-types";
import { getContentIndex } from "@/lib/notion-cms";
import {
  getEntryReadCount,
  isContentType,
  isValidSlug,
  recordEntryRead,
} from "@/lib/engagement/reads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public aggregate counts are deliberately allowed to lag by about an hour.
// Keep the browser cache short; Vercel's shared cache absorbs repeat reads.
const READ_COUNT_HEADERS = {
  "Cache-Control":
    "public, max-age=60, s-maxage=3600, stale-while-revalidate=300",
};
const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

const payloadSchema = z.object({
  type: z.enum(CONTENT_TYPES),
  slug: z.string().trim().min(1).max(160),
  ref: z.string().trim().max(512).optional(),
});

/** Read a count for a currently published public entry. */
export async function GET(request: NextRequest) {
  const rawType = request.nextUrl.searchParams.get("type")?.trim() ?? "";
  const rawSlug = request.nextUrl.searchParams.get("slug")?.trim() ?? "";

  if (!isContentType(rawType) || !isValidSlug(rawSlug)) {
    return NextResponse.json(
      { error: "Invalid entry parameters." },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const index = await getContentIndex(rawType);
  if (!index.configured) {
    return NextResponse.json(
      { configured: false, count: null },
      { headers: NO_STORE_HEADERS },
    );
  }
  if (index.error) {
    return NextResponse.json(
      { error: "Content is temporarily unavailable." },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }

  const item = index.items.find(
    (entry) => entry.slug.toLowerCase() === rawSlug.toLowerCase(),
  );
  if (!item) {
    return NextResponse.json(
      { error: "Entry not found." },
      { status: 404, headers: NO_STORE_HEADERS },
    );
  }

  const count = await getEntryReadCount(rawType, item.slug);
  if (count === null) {
    return NextResponse.json(
      { configured: false, count: null },
      { headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json(
    { configured: true, count },
    { headers: READ_COUNT_HEADERS },
  );
}

/** Record an active public read; this response is never shared-cacheable. */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json(
      { error: "Request rejected." },
      { status: 403, headers: NO_STORE_HEADERS },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Malformed request." },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success || !isValidSlug(parsed.data.slug)) {
    return NextResponse.json(
      { error: "Invalid entry parameters." },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const result = await recordEntryRead({
    request,
    type: parsed.data.type,
    slug: parsed.data.slug,
    referrer: parsed.data.ref ?? null,
  });

  return NextResponse.json(result, { headers: NO_STORE_HEADERS });
}
