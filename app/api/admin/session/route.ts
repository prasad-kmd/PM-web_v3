import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  adminClearCookieHeaders,
  adminClearTrustCookieHeaders,
  adminSetCookieHeader,
  adminSetTrustCookieHeader,
  consumeTotpChallenge,
  createAdminSessionToken,
  createTotpChallengeToken,
  createTrustedDeviceToken,
  getAdminSession,
  getTrustDeviceTtlSeconds,
  hasAdminRecoveryCodes,
  hasTrustedDeviceCookie,
  isAdminAuthConfigured,
  isAdminTotpRequired,
  notifyRecoveryCodeUsed,
  recordTotpChallengeFailure,
  verifyAdminPrimaryCredentials,
  verifyAdminRecoveryCode,
  verifyAdminTotpStep,
  verifyTotpChallengeToken,
} from "@/lib/admin/auth";
import { clientIp, sameOrigin } from "@/lib/comments/request-context";
import { createLimiter } from "@/lib/contact/security";

export const runtime = "nodejs";

/** Step 1: 6 password attempts per 15 min per IP + 3/30s burst gate. */
const loginWindowLimit = createLimiter(6, 15 * 60_000);
const loginBurstLimit = createLimiter(3, 30_000);

/** Step 2: 5 failed TOTP/recovery attempts per 10 min per IP + 6/30s burst gate. */
const totpFailureLimit = createLimiter(5, 10 * 60_000);
const totpBurstLimit = createLimiter(6, 30_000);

const CredentialsStepSchema = z.object({
  step: z.literal("credentials").optional(),
  username: z.string().trim().min(1).max(120),
  password: z.string().min(1).max(256),
});

const TotpStepSchema = z.object({
  step: z.literal("totp"),
  challengeToken: z.string().trim().min(20).max(2048),
  code: z.string().trim().min(1).max(64),
  useRecoveryCode: z.boolean().optional(),
  trustDevice: z.boolean().optional(),
});

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
};

async function jitterDelay() {
  await new Promise((resolve) =>
    setTimeout(resolve, 170 + Math.floor(Math.random() * 90)),
  );
}

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) {
    // Public visitors receive zero metadata about whether 2FA/TOTP is configured.
    return NextResponse.json(
      { authenticated: false },
      { headers: NO_STORE_HEADERS },
    );
  }
  const totpEnabled = isAdminTotpRequired();
  return NextResponse.json(
    {
      authenticated: true,
      username: session.username,
      expiresAt: session.expiresAt,
      totpEnabled,
      deviceTrusted: totpEnabled
        ? hasTrustedDeviceCookie(request, session.username)
        : false,
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request payload." },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const ip = clientIp(request);
  const isTotpStep =
    typeof body === "object" &&
    body !== null &&
    "step" in body &&
    (body as { step?: unknown }).step === "totp";

  // --- Step 2: TOTP or Emergency Recovery Code verification ---
  if (isTotpStep) {
    const burstWait = totpBurstLimit(ip);
    if (burstWait > 0) {
      return NextResponse.json(
        {
          error: `Too many requests. Please wait ${burstWait}s before trying again.`,
          retryAfter: burstWait,
        },
        {
          status: 429,
          headers: { ...NO_STORE_HEADERS, "Retry-After": String(burstWait) },
        },
      );
    }

    const parsedTotp = TotpStepSchema.safeParse(body);
    if (!parsedTotp.success) {
      return NextResponse.json(
        { error: "Enter a valid verification code." },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    const challenge = verifyTotpChallengeToken(
      parsedTotp.data.challengeToken,
      ip,
      request,
    );
    if (!challenge.ok) {
      await jitterDelay();
      return NextResponse.json(
        {
          error: "Verification challenge expired. Enter your password again.",
          expiredChallenge: true,
        },
        { status: 401, headers: NO_STORE_HEADERS },
      );
    }

    let verified = false;
    let failureMessage = "Invalid verification code.";
    let usedRecoveryCode = false;

    if (parsedTotp.data.useRecoveryCode) {
      const recovery = await verifyAdminRecoveryCode(parsedTotp.data.code);
      if (recovery.ok) {
        verified = true;
        usedRecoveryCode = true;
      } else if (recovery.alreadyUsed) {
        failureMessage = "That recovery code has already been used.";
      } else {
        failureMessage = "Invalid recovery code.";
      }
    } else {
      const totp = verifyAdminTotpStep(
        parsedTotp.data.code,
        challenge.username,
      );
      if (totp.ok) {
        verified = true;
      } else if (totp.replay) {
        failureMessage =
          "That code was just used. Wait for the next 6-digit code.";
      }
    }

    if (!verified) {
      const ipPenalty = totpFailureLimit(ip);
      const { burned } = recordTotpChallengeFailure(
        challenge.jti,
        challenge.expiresAtMs,
      );
      await jitterDelay();

      if (ipPenalty > 0) {
        return NextResponse.json(
          {
            error: `Too many incorrect codes. Please wait ${ipPenalty}s before trying again.`,
            retryAfter: ipPenalty,
            expiredChallenge: true,
          },
          {
            status: 429,
            headers: {
              ...NO_STORE_HEADERS,
              "Retry-After": String(ipPenalty),
            },
          },
        );
      }

      if (burned) {
        return NextResponse.json(
          {
            error: "Too many incorrect codes. Please sign in again.",
            expiredChallenge: true,
          },
          { status: 401, headers: NO_STORE_HEADERS },
        );
      }

      return NextResponse.json(
        { error: failureMessage },
        { status: 401, headers: NO_STORE_HEADERS },
      );
    }

    consumeTotpChallenge(challenge.jti, challenge.expiresAtMs);

    if (usedRecoveryCode) {
      notifyRecoveryCodeUsed(ip, request.headers.get("user-agent") || "");
    }

    const { token, session, maxAgeSeconds } = createAdminSessionToken(
      challenge.username,
    );
    const trustCookie = parsedTotp.data.trustDevice
      ? createTrustedDeviceToken(challenge.username, request)
      : null;

    const response = NextResponse.json(
      {
        authenticated: true,
        username: session.username,
        expiresAt: session.expiresAt,
        totpEnabled: true,
        deviceTrusted: Boolean(trustCookie),
        usedRecoveryCode,
      },
      { headers: NO_STORE_HEADERS },
    );

    response.headers.append(
      "Set-Cookie",
      adminSetCookieHeader(token, maxAgeSeconds, request),
    );
    if (trustCookie) {
      response.headers.append(
        "Set-Cookie",
        adminSetTrustCookieHeader(
          trustCookie.token,
          trustCookie.maxAgeSeconds,
          request,
        ),
      );
    }
    return response;
  }

  // --- Step 1: Primary Username + Password verification ---
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

  const parsedCreds = CredentialsStepSchema.safeParse(body);
  if (!parsedCreds.success) {
    return NextResponse.json(
      { error: "Enter both your username and password." },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const primary = await verifyAdminPrimaryCredentials(
    parsedCreds.data.username,
    parsedCreds.data.password,
  );

  if (!primary.ok) {
    await jitterDelay();
    return NextResponse.json(
      { error: "Incorrect username or password." },
      { status: 401, headers: NO_STORE_HEADERS },
    );
  }

  const totpEnabled = isAdminTotpRequired();
  const trustedBrowser =
    totpEnabled && hasTrustedDeviceCookie(request, primary.canonicalUsername);

  // If TOTP is active and this browser is not trusted, step up to Step 2.
  if (totpEnabled && !trustedBrowser) {
    const { challengeToken, expiresInSeconds } = createTotpChallengeToken(
      primary.canonicalUsername,
      ip,
      request,
    );
    const trustTtlSec = getTrustDeviceTtlSeconds();
    return NextResponse.json(
      {
        authenticated: false,
        step: "totp" as const,
        challengeToken,
        expiresInSeconds,
        recoveryAvailable: hasAdminRecoveryCodes(),
        trustDurationDays:
          trustTtlSec > 0 ? Math.round(trustTtlSec / 86_400) : 0,
      },
      { headers: NO_STORE_HEADERS },
    );
  }

  const { token, session, maxAgeSeconds } = createAdminSessionToken(
    primary.canonicalUsername,
  );
  const response = NextResponse.json(
    {
      authenticated: true,
      username: session.username,
      expiresAt: session.expiresAt,
      totpEnabled,
      deviceTrusted: trustedBrowser,
    },
    { headers: NO_STORE_HEADERS },
  );
  response.headers.append(
    "Set-Cookie",
    adminSetCookieHeader(token, maxAgeSeconds, request),
  );
  return response;
}

export async function PATCH(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json(
      { error: "Cross-origin requests are not permitted." },
      { status: 403, headers: NO_STORE_HEADERS },
    );
  }
  const session = await getAdminSession(request);
  if (!session) {
    return NextResponse.json(
      { error: "Sign in required." },
      { status: 401, headers: NO_STORE_HEADERS },
    );
  }
  const response = NextResponse.json(
    { ok: true, deviceTrusted: false },
    { headers: NO_STORE_HEADERS },
  );
  for (const header of adminClearTrustCookieHeaders(request)) {
    response.headers.append("Set-Cookie", header);
  }
  return response;
}

export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json(
      { error: "Cross-origin requests are not permitted." },
      { status: 403, headers: NO_STORE_HEADERS },
    );
  }
  const forgetDevice =
    new URL(request.url).searchParams.get("forgetDevice") === "1";

  const response = NextResponse.json(
    { authenticated: false },
    { headers: NO_STORE_HEADERS },
  );
  for (const cookieHeader of adminClearCookieHeaders(request)) {
    response.headers.append("Set-Cookie", cookieHeader);
  }
  if (forgetDevice) {
    for (const trustHeader of adminClearTrustCookieHeaders(request)) {
      response.headers.append("Set-Cookie", trustHeader);
    }
  }
  return response;
}
