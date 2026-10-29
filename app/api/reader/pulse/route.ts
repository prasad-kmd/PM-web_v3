import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { sameOrigin } from "@/lib/comments/request-context";
import { CONTENT_TYPES } from "@/lib/content-types";
import { isValidSlug, recordEntryRead } from "@/lib/engagement/reads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  type: z.enum(CONTENT_TYPES),
  slug: z.string().trim().min(1).max(160),
  ref: z.string().trim().max(512).optional(),
});

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
