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
  recordTotpChallengeFailure,
  verifyAdminPrimaryCredentials,
  verifyAdminRecoveryCode,
  verifyAdminTotpStep,
  verifyTotpChallengeToken,
} from "@/lib/admin/auth";
import { getAdminCommentProfile } from "@/lib/admin/comment-profile";
import { notifyAdminLoginAttempt } from "@/lib/admin/telegram-notify";
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

function peekUsername(body: unknown): string | null {
  if (
    typeof body === "object" &&
    body !== null &&
    "username" in body &&
    typeof (body as { username?: unknown }).username === "string"
  ) {
    return (body as { username: string }).username.trim().slice(0, 80) || null;
  }
  return null;
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
      commentProfile: getAdminCommentProfile(),
    },
    { headers: NO_STORE_HEADERS },
  );
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    notifyAdminLoginAttempt({
      request,
      outcome: "blocked",
      stage: "Origin check",
      reason: "Cross-origin sign-in request blocked",
      statusCode: 403,
    });
    return NextResponse.json(
      { error: "Cross-origin sign-in requests are not permitted." },
      { status: 403, headers: NO_STORE_HEADERS },
    );
  }

  if (!isAdminAuthConfigured()) {
    notifyAdminLoginAttempt({
      request,
      outcome: "failed",
      stage: "System configuration",
      reason: "Admin credentials are not configured on server",
      statusCode: 503,
    });
    return NextResponse.json(
      { error: "Workspace sign-in is currently unavailable." },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    notifyAdminLoginAttempt({
      request,
      outcome: "failed",
      stage: "Request validation",
      reason: "Malformed JSON payload",
      statusCode: 400,
    });
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
      notifyAdminLoginAttempt({
        request,
        outcome: "rate_limited",
        stage: "Two-step verification",
        reason: "Burst rate limit exceeded on 2FA verification",
        statusCode: 429,
        retryAfterSeconds: burstWait,
      });
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
      notifyAdminLoginAttempt({
        request,
        outcome: "failed",
        stage: "Two-step verification",
        reason: "Invalid or missing verification code fields",
        statusCode: 400,
      });
      return NextResponse.json(
        { error: "Enter a valid verification code." },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    const stepMethod = parsedTotp.data.useRecoveryCode
      ? "Emergency recovery code"
      : "Authenticator (TOTP)";

    const challenge = verifyTotpChallengeToken(
      parsedTotp.data.challengeToken,
      ip,
      request,
    );
    if (!challenge.ok) {
      notifyAdminLoginAttempt({
        request,
        outcome: "failed",
        stage: "Two-step verification",
        method: stepMethod,
        reason: "Expired, consumed, or mismatched 2FA challenge",
        statusCode: 401,
      });
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
    let failureReason = "Incorrect 6-digit authenticator code";
    let usedRecoveryCode = false;

    if (parsedTotp.data.useRecoveryCode) {
      const recovery = await verifyAdminRecoveryCode(parsedTotp.data.code);
      if (recovery.ok) {
        verified = true;
        usedRecoveryCode = true;
      } else if (recovery.alreadyUsed) {
        failureMessage = "That recovery code has already been used.";
        failureReason = "Recovery code already consumed";
      } else {
        failureMessage = "Invalid recovery code.";
        failureReason = "Invalid emergency recovery code";
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
        failureReason = "Replayed 6-digit authenticator code";
      }
    }

    if (!verified) {
      const ipPenalty = totpFailureLimit(ip);
      const { burned } = recordTotpChallengeFailure(
        challenge.jti,
        challenge.expiresAtMs,
      );

      if (ipPenalty > 0) {
        notifyAdminLoginAttempt({
          request,
          outcome: "rate_limited",
          stage: "Two-step verification",
          method: stepMethod,
          reason: `${failureReason} · IP locked out`,
          username: challenge.username,
          statusCode: 429,
          retryAfterSeconds: ipPenalty,
        });
      } else {
        notifyAdminLoginAttempt({
          request,
          outcome: "failed",
          stage: "Two-step verification",
          method: stepMethod,
          reason: burned
            ? `${failureReason} · Challenge burned after repeated failures`
            : failureReason,
          username: challenge.username,
          statusCode: 401,
        });
      }

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
      console.warn(
        `[admin-auth] Emergency recovery code used to unlock workspace (ip=${ip}). Rotate ADMIN_RECOVERY_HASHES / ADMIN_TOTP_SECRET when convenient.`,
      );
    }

    const { token, session, maxAgeSeconds } = createAdminSessionToken(
      challenge.username,
    );
    const trustCookie = parsedTotp.data.trustDevice
      ? createTrustedDeviceToken(challenge.username, request)
      : null;

    notifyAdminLoginAttempt({
      request,
      outcome: usedRecoveryCode ? "succeeded_recovery" : "succeeded",
      stage: "Two-step verification",
      method: usedRecoveryCode
        ? "Password + Emergency recovery code"
        : "Password + Authenticator (TOTP)",
      username: session.username,
      statusCode: 200,
      deviceTrusted: Boolean(trustCookie),
      trustDurationDays: trustCookie
        ? Math.round(trustCookie.maxAgeSeconds / 86_400)
        : 0,
    });

    const response = NextResponse.json(
      {
        authenticated: true,
        username: session.username,
        expiresAt: session.expiresAt,
        totpEnabled: true,
        deviceTrusted: Boolean(trustCookie),
        usedRecoveryCode,
        commentProfile: getAdminCommentProfile(),
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
  const candidateUser = peekUsername(body);
  const burstWait = loginBurstLimit(ip);
  const windowWait = loginWindowLimit(ip);
  const retryAfter = Math.max(burstWait, windowWait);
  if (retryAfter > 0) {
    notifyAdminLoginAttempt({
      request,
      outcome: "rate_limited",
      stage: "Primary credentials",
      reason: "Password attempt rate limit exceeded",
      username: candidateUser,
      statusCode: 429,
      retryAfterSeconds: retryAfter,
    });
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
    notifyAdminLoginAttempt({
      request,
      outcome: "failed",
      stage: "Primary credentials",
      reason: "Missing or invalid username or password fields",
      username: candidateUser,
      statusCode: 400,
    });
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
    notifyAdminLoginAttempt({
      request,
      outcome: "failed",
      stage: "Primary credentials",
      method: "Password",
      reason: "Incorrect username or password",
      username: parsedCreds.data.username,
      statusCode: 401,
    });
    await jitterDelay();
    return NextResponse.json(
      { error: "Incorrect username or password." },
      { status: 401, headers: NO_STORE_HEADERS },
    );
  }

  const totpEnabled = isAdminTotpRequired();
  const trustedBrowser =
    totpEnabled && hasTrustedDeviceCookie(request, primary.canonicalUsername);
  const trustTtlSec = getTrustDeviceTtlSeconds();
  const trustDurationDays =
    trustTtlSec > 0 ? Math.round(trustTtlSec / 86_400) : 0;

  // If TOTP is active and this browser is not trusted, step up to Step 2.
  if (totpEnabled && !trustedBrowser) {
    const { challengeToken, expiresInSeconds } = createTotpChallengeToken(
      primary.canonicalUsername,
      ip,
      request,
    );
    notifyAdminLoginAttempt({
      request,
      outcome: "challenge_issued",
      stage: "Primary credentials",
      method: "Password (2FA challenge issued)",
      username: primary.canonicalUsername,
      statusCode: 200,
    });
    return NextResponse.json(
      {
        authenticated: false,
        step: "totp" as const,
        challengeToken,
        expiresInSeconds,
        recoveryAvailable: hasAdminRecoveryCodes(),
        trustDurationDays,
      },
      { headers: NO_STORE_HEADERS },
    );
  }

  const { token, session, maxAgeSeconds } = createAdminSessionToken(
    primary.canonicalUsername,
  );

  notifyAdminLoginAttempt({
    request,
    outcome: "succeeded",
    stage: "Primary credentials",
    method: trustedBrowser ? "Password + Trusted browser" : "Password",
    username: session.username,
    statusCode: 200,
    deviceTrusted: trustedBrowser,
    trustDurationDays: trustedBrowser ? trustDurationDays : 0,
  });

  const response = NextResponse.json(
    {
      authenticated: true,
      username: session.username,
      expiresAt: session.expiresAt,
      totpEnabled,
      deviceTrusted: trustedBrowser,
      commentProfile: getAdminCommentProfile(),
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
