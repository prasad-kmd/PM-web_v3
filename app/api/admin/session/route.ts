import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  adminClearCookieHeaders,
  adminSetCookieHeader,
  createAdminSessionToken,
  getAdminSession,
  isAdminAuthConfigured,
  isAdminTotpRequired,
  verifyAdminCredentials,
} from "@/lib/admin/auth";
import { clientIp, sameOrigin } from "@/lib/comments/request-context";
import { createLimiter } from "@/lib/contact/security";

export const runtime = "nodejs";

/** 6 sign-in attempts per 15 minutes per IP, plus a tight 3/30s burst gate. */
const loginWindowLimit = createLimiter(6, 15 * 60_000);
const loginBurstLimit = createLimiter(3, 30_000);

const LoginSchema = z.object({
  username: z.string().trim().min(1).max(120),
  password: z.string().min(1).max(256),
  otp: z.string().trim().max(12).optional(),
});

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
};

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) {
    return NextResponse.json(
      {
        authenticated: false,
        totpRequired: isAdminTotpRequired(),
      },
      { headers: NO_STORE_HEADERS },
    );
  }
  return NextResponse.json(
    {
      authenticated: true,
      username: session.username,
      expiresAt: session.expiresAt,
    },
    { headers: NO_STORE_HEADERS },
  );
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json(
      { error: "Cross-origin sign-in requests are not permitted." },
      { status: 403, headers: NO_STORE_HEADERS },
    );
  }

  if (!isAdminAuthConfigured()) {
    return NextResponse.json(
      { error: "Workspace sign-in is currently unavailable." },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }

  const ip = clientIp(request);
  const burstWait = loginBurstLimit(ip);
  const windowWait = loginWindowLimit(ip);
  const retryAfter = Math.max(burstWait, windowWait);
  if (retryAfter > 0) {
    return NextResponse.json(
      {
        error: `Too many attempts. Please wait ${retryAfter}s before trying again.`,
        retryAfter,
      },
      {
        status: 429,
        headers: {
          ...NO_STORE_HEADERS,
          "Retry-After": String(retryAfter),
        },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request payload." },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter both your username and password." },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const valid = await verifyAdminCredentials(
    parsed.data.username,
    parsed.data.password,
    parsed.data.otp,
  );

  if (!valid) {
    await new Promise((resolve) =>
      setTimeout(resolve, 180 + Math.floor(Math.random() * 90)),
    );
    return NextResponse.json(
      { error: "Incorrect username or password." },
      { status: 401, headers: NO_STORE_HEADERS },
    );
  }

  const { token, session, maxAgeSeconds } = createAdminSessionToken(
    parsed.data.username.trim(),
  );
  const response = NextResponse.json(
    {
      authenticated: true,
      username: session.username,
      expiresAt: session.expiresAt,
    },
    { headers: NO_STORE_HEADERS },
  );
  response.headers.append(
    "Set-Cookie",
    adminSetCookieHeader(token, maxAgeSeconds, request),
  );
  return response;
}

export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json(
      { error: "Cross-origin requests are not permitted." },
      { status: 403, headers: NO_STORE_HEADERS },
    );
  }
  const response = NextResponse.json(
    { authenticated: false },
    { headers: NO_STORE_HEADERS },
  );
  for (const cookieHeader of adminClearCookieHeaders(request)) {
    response.headers.append("Set-Cookie", cookieHeader);
  }
  return response;
}
