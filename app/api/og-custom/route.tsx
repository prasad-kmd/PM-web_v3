import { ImageResponse } from "next/og";
import { NextResponse, type NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/admin/auth";
import { sameOrigin } from "@/lib/comments/request-context";
import { buildCustomOgImage } from "@/lib/og/custom-renderer";
import {
  OgCustomSchema,
  parseOgCustomSearchParams,
} from "@/lib/og/custom-schema";

export const runtime = "nodejs";

const RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
};

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const config = parseOgCustomSearchParams(url.searchParams);
  const { element, width, height, fonts } = await buildCustomOgImage(
    config,
    url.origin,
  );

  return new ImageResponse(element, {
    width,
    height,
    fonts,
    headers: RESPONSE_HEADERS,
  });
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json(
      { error: "Cross-origin requests are not permitted." },
      { status: 403, headers: RESPONSE_HEADERS },
    );
  }
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid configuration payload." },
      { status: 400, headers: RESPONSE_HEADERS },
    );
  }

  const parsed = OgCustomSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check your image settings and try again." },
      { status: 400, headers: RESPONSE_HEADERS },
    );
  }

  const url = new URL(request.url);
  const { element, width, height, fonts } = await buildCustomOgImage(
    parsed.data,
    url.origin,
  );

  return new ImageResponse(element, {
    width,
    height,
    fonts,
    headers: RESPONSE_HEADERS,
  });
}
