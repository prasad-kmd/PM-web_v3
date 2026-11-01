import "server-only";
import {
  createHash,
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import {
  COOKIE_ADMIN_DEV,
  COOKIE_ADMIN_HINT,
  COOKIE_ADMIN_PROD,
  COOKIE_ADMIN_TRUST_DEV,
  COOKIE_ADMIN_TRUST_PROD,
} from "@/lib/cookies";

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 };
const SCRYPT_KEYLEN = 64;
const DUMMY_SALT = Buffer.alloc(16, 0x5a);
const DUMMY_HASH = Buffer.alloc(SCRYPT_KEYLEN, 0xa5);

export const TOTP_CHALLENGE_TTL_SECONDS = 90;
const TOTP_CHALLENGE_MAX_FAILURES = 4;
const TOTP_REPLAY_RETENTION_MS = 120_000;

export type AdminSession = {
  username: string;
  issuedAt: number;
  expiresAt: number;
};

type SessionPayload = {
  v: 1 | 2;
  u: string;
  fp?: string;
  iat: number;
  exp: number;
  jti: string;
};

type TotpChallengePayload = {
  v: 1;
  typ: "totp-challenge";
  u: string;
  ip: string;
  ua: string;
  fp: string;
  iat: number;
  exp: number;
  jti: string;
};

type TrustedDevicePayload = {
  v: 1;
  typ: "trust";
  u: string;
  ua: string;
  fp: string;
  iat: number;
  exp: number;
  jti: string;
};

/**
 * Warm-instance anti-replay & challenge-burn stores.
 * Even across serverless instances, `challengeToken` expires in 90s and is IP+UA
 * bound; within any warm instance, used TOTP steps, consumed challenges, and used
 * recovery hashes cannot be replayed.
 */
const usedTotpSteps = new Map<string, number>();
const challengeStates = new Map<
  string,
  { failures: number; consumed: boolean; expiresAtMs: number }
>();
const consumedRecoveryFingerprints = new Set<string>();

function pruneEphemeralMaps(nowMs: number): void {
  for (const [key, expiresAt] of usedTotpSteps) {
    if (expiresAt <= nowMs) usedTotpSteps.delete(key);
  }
  for (const [jti, entry] of challengeStates) {
    if (entry.expiresAtMs <= nowMs) challengeStates.delete(jti);
  }
}

/**
 * Normalizes env values and strips accidental wrapping quotes (e.g. when pasted
 * into hosting dashboards where quotes are stored literally).
 */
function cleanEnv(raw: string | undefined): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function deriveScrypt(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(
      password.normalize("NFKC"),
      salt,
      SCRYPT_KEYLEN,
      SCRYPT_PARAMS,
      (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey);
      },
    );
  });
}

function getConfiguredUsername(): string {
  return cleanEnv(process.env.ADMIN_USERNAME);
}

function getSessionSecret(): string {
  return cleanEnv(process.env.ADMIN_SESSION_SECRET);
}

function getSessionTtlSeconds(): number {
  const rawHours = Number(
    cleanEnv(process.env.ADMIN_SESSION_TTL_HOURS) || "12",
  );
  const hours = Number.isFinite(rawHours)
    ? Math.min(Math.max(rawHours, 1), 168)
    : 12;
  return Math.round(hours * 3600);
}

export function getTrustDeviceTtlSeconds(): number {
  const rawDays = Number(cleanEnv(process.env.ADMIN_TRUST_TTL_DAYS) || "30");
  if (!Number.isFinite(rawDays)) return 30 * 86_400;
  if (rawDays <= 0) return 0;
  const clampedDays = Math.min(Math.max(Math.round(rawDays), 1), 90);
  return clampedDays * 86_400;
}

/**
 * Domain-separated HMAC key derivation so session tokens, TOTP step-up challenge
 * tokens, and 30-day trusted-device tokens cannot cross-validate.
 */
function deriveDomainKey(
  purpose: "session" | "challenge" | "trust",
  masterSecret: string,
): Buffer {
  return createHmac("sha256", masterSecret)
    .update(`pm-admin:${purpose}:v1`, "utf8")
    .digest();
}

function signDomainPayload(
  purpose: "session" | "challenge" | "trust",
  encodedPayload: string,
  masterSecret: string,
): string {
  const subkey = deriveDomainKey(purpose, masterSecret);
  return createHmac("sha256", subkey)
    .update(encodedPayload, "utf8")
    .digest("base64url");
}

/** Legacy v1 signature helper kept so existing sessions stay valid smoothly. */
function signLegacySessionPayload(
  encodedPayload: string,
  secret: string,
): string {
  return createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");
}

function shortContextHash(input: string): string {
  return createHash("sha256")
    .update(input || "empty", "utf8")
    .digest("base64url")
    .slice(0, 22);
}

/**
 * Fingerprint of active owner credentials. Rotating username, password, TOTP
 * secret, or session secret invalidates existing sessions & trusted browsers.
 */
function computeCredentialFingerprint(): string {
  const user = getConfiguredUsername();
  const pw =
    cleanEnv(process.env.ADMIN_PASSWORD_HASH) ||
    cleanEnv(process.env.ADMIN_PASSWORD);
  const totp = cleanEnv(process.env.ADMIN_TOTP_SECRET)
    .toUpperCase()
    .replace(/[\s=-]+/g, "");
  return createHash("sha256")
    .update(`${user}\n${pw}\n${totp}`, "utf8")
    .digest("base64url")
    .slice(0, 20);
}

function parseScryptHashSpec(
  rawSpec: string,
): { salt: Buffer; expected: Buffer } | null {
  if (!rawSpec) return null;
  // Primary format: `scrypt:<saltHex>:<derivedHex>` (colon avoids `.env` `$` interpolation).
  // Legacy format:  `scrypt$<saltHex>$<derivedHex>` (works when single-quoted in `.env`).
  const delimiter = rawSpec.includes(":") ? ":" : "$";
  const parts = rawSpec.split(delimiter);
  if (parts.length !== 3 || parts[0] !== "scrypt") return null;
  const [, saltHex, derivedHex] = parts;
  if (
    !/^[0-9a-f]+$/i.test(saltHex) ||
    saltHex.length < 16 ||
    saltHex.length % 2 !== 0
  ) {
    return null;
  }
  if (
    !/^[0-9a-f]+$/i.test(derivedHex) ||
    derivedHex.length !== SCRYPT_KEYLEN * 2
  ) {
    return null;
  }
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(derivedHex, "hex");
  if (salt.length < 8 || expected.length !== SCRYPT_KEYLEN) return null;
  return { salt, expected };
}

/** Decode standard Base32 secret (RFC 4648) for TOTP verification. */
function decodeBase32(input: string): Buffer | null {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleaned = input.toUpperCase().replace(/[\s=-]+/g, "");
  if (!cleaned) return null;
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const ch of cleaned) {
    const idx = alphabet.indexOf(ch);
    if (idx === -1) return null;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return bytes.length > 0 ? Buffer.from(bytes) : null;
}

export function isAdminAuthConfigured(): boolean {
  const username = getConfiguredUsername();
  const secret = getSessionSecret();
  const rawHash = cleanEnv(process.env.ADMIN_PASSWORD_HASH);
  const hasValidHash = Boolean(parseScryptHashSpec(rawHash));
  const hasPlainPassword = Boolean(cleanEnv(process.env.ADMIN_PASSWORD));
  return Boolean(
    username && (hasValidHash || hasPlainPassword) && secret.length >= 32,
  );
}

export function isAdminTotpRequired(): boolean {
  const raw = cleanEnv(process.env.ADMIN_TOTP_SECRET);
  if (!raw) return false;
  return Boolean(decodeBase32(raw));
}

function getParsedRecoveryHashes(): Array<{
  raw: string;
  salt: Buffer;
  expected: Buffer;
}> {
  const rawList = cleanEnv(process.env.ADMIN_RECOVERY_HASHES);
  if (!rawList) return [];
  return rawList
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const parsed = parseScryptHashSpec(entry);
      return parsed ? { raw: entry, ...parsed } : null;
    })
    .filter(
      (
        item,
      ): item is {
        raw: string;
        salt: Buffer;
        expected: Buffer;
      } => item !== null,
    );
}

export function hasAdminRecoveryCodes(): boolean {
  return getParsedRecoveryHashes().length > 0;
}

function safeEqualStrings(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a, "utf8").digest();
  const hashB = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(hashA, hashB);
}

async function verifyPassword(candidate: string): Promise<boolean> {
  const hashSpec = cleanEnv(process.env.ADMIN_PASSWORD_HASH);
  if (hashSpec) {
    const parsed = parseScryptHashSpec(hashSpec);
    if (parsed) {
      try {
        const actual = await deriveScrypt(candidate, parsed.salt);
        return timingSafeEqual(actual, parsed.expected);
      } catch {
        await deriveScrypt(candidate, DUMMY_SALT);
        return false;
      }
    }

    console.warn(
      "[admin-auth] ADMIN_PASSWORD_HASH is malformed or was truncated by `.env` `$` interpolation. " +
        "Regenerate using colon format (`scrypt:<salt>:<hash>`) via: node scripts/hash-admin-password.mjs",
    );
  }

  const plain = cleanEnv(process.env.ADMIN_PASSWORD);
  await deriveScrypt(candidate, DUMMY_SALT);
  if (!plain) return false;
  return safeEqualStrings(candidate.normalize("NFKC"), plain.normalize("NFKC"));
}

/**
 * Step 1: Verify owner username and password in constant time.
 */
export async function verifyAdminPrimaryCredentials(
  username: string,
  password: string,
): Promise<{ ok: boolean; canonicalUsername: string }> {
  if (!isAdminAuthConfigured()) {
    await deriveScrypt(password || "invalid", DUMMY_SALT);
    void DUMMY_HASH;
    return { ok: false, canonicalUsername: "" };
  }
  const expectedUser = getConfiguredUsername();
  const userMatches = safeEqualStrings(username.trim(), expectedUser);
  const passwordMatches = await verifyPassword(password);
  return {
    ok: userMatches && passwordMatches,
    canonicalUsername: expectedUser,
  };
}

function computeTotp(secretKey: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", secretKey).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
}

/**
 * Step 2a: Verify a 6-digit RFC 6238 TOTP code within ±1 30s window, with
 * warm-instance replay protection so the same 6-digit step cannot be reused.
 */
export function verifyAdminTotpStep(
  code: string,
  username: string,
): { ok: true } | { ok: false; replay?: boolean } {
  const rawSecret = cleanEnv(process.env.ADMIN_TOTP_SECRET);
  if (!rawSecret) return { ok: true };

  const normalized = code.replace(/[\s-]+/g, "").trim();
  if (!/^\d{6}$/.test(normalized)) return { ok: false };

  const key = decodeBase32(rawSecret);
  if (!key) return { ok: false };

  const nowMs = Date.now();
  pruneEphemeralMaps(nowMs);

  const currentStep = Math.floor(nowMs / 1000 / 30);
  let matchedCounter: number | null = null;

  for (const delta of [-1, 0, 1]) {
    const counter = currentStep + delta;
    const candidate = computeTotp(key, counter);
    if (safeEqualStrings(normalized, candidate)) {
      matchedCounter = counter;
    }
  }

  if (matchedCounter === null) {
    return { ok: false };
  }

  const replayKey = `${username}:${matchedCounter}`;
  if (usedTotpSteps.has(replayKey)) {
    return { ok: false, replay: true };
  }

  usedTotpSteps.set(replayKey, nowMs + TOTP_REPLAY_RETENTION_MS);
  return { ok: true };
}

export function normalizeRecoveryCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/**
 * Step 2b: Verify an emergency recovery code against comma-separated `scrypt:...`
 * hashes in `ADMIN_RECOVERY_HASHES`. Evaluates all configured hashes to avoid
 * leaking index position, and blocks repeat use within the running instance.
 */
export async function verifyAdminRecoveryCode(
  rawCode: string,
): Promise<{ ok: boolean; alreadyUsed?: boolean }> {
  const normalized = normalizeRecoveryCode(rawCode);
  const hashes = getParsedRecoveryHashes();

  if (!normalized || normalized.length < 8 || hashes.length === 0) {
    await deriveScrypt(normalized || "invalid", DUMMY_SALT);
    return { ok: false };
  }

  let matchedRaw: string | null = null;
  for (const entry of hashes) {
    try {
      const derived = await deriveScrypt(normalized, entry.salt);
      if (timingSafeEqual(derived, entry.expected)) {
        matchedRaw = entry.raw;
      }
    } catch {
      // Continue constant-work pass across remaining hashes.
    }
  }

  if (!matchedRaw) {
    return { ok: false };
  }

  const hashId = shortContextHash(matchedRaw);
  if (consumedRecoveryFingerprints.has(hashId)) {
    return { ok: false, alreadyUsed: true };
  }

  consumedRecoveryFingerprints.add(hashId);
  return { ok: true };
}

/**
 * Non-blocking owner security notice when an emergency recovery code is used.
 * Uses the existing server-side Telegram bot transport if configured.
 */
export function notifyRecoveryCodeUsed(ip: string, userAgent: string): void {
  console.warn(
    `[admin-auth] Emergency recovery code used to unlock workspace (ip=${ip}). Rotate ADMIN_RECOVERY_HASHES / ADMIN_TOTP_SECRET when convenient.`,
  );
  const token = cleanEnv(process.env.TELEGRAM_TOKEN);
  const chatId = cleanEnv(process.env.TELEGRAM_CHAT_ID);
  if (!token || !chatId) return;

  const text = [
    "⚠️ Workspace Security Notice",
    "An emergency recovery code was just used to unlock your admin workspace.",
    `Time: ${new Date().toISOString()}`,
    `IP: ${ip.slice(0, 64)}`,
    `Agent: ${(userAgent || "Unknown").slice(0, 140)}`,
    "",
    "Rotate ADMIN_TOTP_SECRET and ADMIN_RECOVERY_HASHES via scripts/generate-admin-totp.mjs when convenient.",
  ].join("\n");

  void fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
    signal: AbortSignal.timeout(8_000),
    cache: "no-store",
  }).catch(() => {
    // Non-blocking alert; never interrupt sign-in.
  });
}

function requestUserAgent(request?: NextRequest): string {
  return (request?.headers.get("user-agent") || "").slice(0, 300);
}

/**
 * Create a short-lived (90s) HMAC-signed stateless challenge token after Step 1
 * (username + password) succeeds, bound to client IP + User-Agent + credential fp.
 */
export function createTotpChallengeToken(
  username: string,
  ip: string,
  request: NextRequest,
): { challengeToken: string; expiresInSeconds: number } {
  const secret = getSessionSecret();
  const nowSec = Math.floor(Date.now() / 1000);
  const jti = randomBytes(12).toString("base64url");
  const payload: TotpChallengePayload = {
    v: 1,
    typ: "totp-challenge",
    u: username,
    ip: shortContextHash(ip),
    ua: shortContextHash(requestUserAgent(request)),
    fp: computeCredentialFingerprint(),
    iat: nowSec,
    exp: nowSec + TOTP_CHALLENGE_TTL_SECONDS,
    jti,
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  const sig = signDomainPayload("challenge", encoded, secret);

  pruneEphemeralMaps(Date.now());
  challengeStates.set(jti, {
    failures: 0,
    consumed: false,
    expiresAtMs: (payload.exp + 15) * 1000,
  });

  return {
    challengeToken: `${encoded}.${sig}`,
    expiresInSeconds: TOTP_CHALLENGE_TTL_SECONDS,
  };
}

export function verifyTotpChallengeToken(
  rawToken: string,
  ip: string,
  request: NextRequest,
):
  | { ok: true; username: string; jti: string; expiresAtMs: number }
  | { ok: false; expired: boolean } {
  if (!rawToken || !isAdminAuthConfigured()) {
    return { ok: false, expired: true };
  }
  const dot = rawToken.indexOf(".");
  if (dot <= 0 || dot !== rawToken.lastIndexOf(".")) {
    return { ok: false, expired: true };
  }
  const encoded = rawToken.slice(0, dot);
  const providedSig = rawToken.slice(dot + 1);
  const expectedSig = signDomainPayload(
    "challenge",
    encoded,
    getSessionSecret(),
  );

  const a = Buffer.from(providedSig, "utf8");
  const b = Buffer.from(expectedSig, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, expired: true };
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as Partial<TotpChallengePayload>;
    if (
      parsed.v !== 1 ||
      parsed.typ !== "totp-challenge" ||
      typeof parsed.u !== "string" ||
      typeof parsed.jti !== "string" ||
      typeof parsed.exp !== "number"
    ) {
      return { ok: false, expired: true };
    }

    const nowMs = Date.now();
    pruneEphemeralMaps(nowMs);
    if (parsed.exp * 1000 <= nowMs) {
      return { ok: false, expired: true };
    }

    if (
      !safeEqualStrings(parsed.u, getConfiguredUsername()) ||
      parsed.fp !== computeCredentialFingerprint() ||
      parsed.ip !== shortContextHash(ip) ||
      parsed.ua !== shortContextHash(requestUserAgent(request))
    ) {
      return { ok: false, expired: true };
    }

    const state = challengeStates.get(parsed.jti);
    if (
      state &&
      (state.consumed || state.failures >= TOTP_CHALLENGE_MAX_FAILURES)
    ) {
      return { ok: false, expired: true };
    }

    return {
      ok: true,
      username: parsed.u,
      jti: parsed.jti,
      expiresAtMs: (parsed.exp + 15) * 1000,
    };
  } catch {
    return { ok: false, expired: true };
  }
}

/**
 * Records a failed Step-2 attempt against a challenge token. Returns `burned: true`
 * once `TOTP_CHALLENGE_MAX_FAILURES` wrong codes are submitted so the caller forces
 * re-entry of the primary password.
 */
export function recordTotpChallengeFailure(
  jti: string,
  expiresAtMs: number,
): { burned: boolean } {
  const existing = challengeStates.get(jti) ?? {
    failures: 0,
    consumed: false,
    expiresAtMs,
  };
  existing.failures += 1;
  challengeStates.set(jti, existing);
  return { burned: existing.failures >= TOTP_CHALLENGE_MAX_FAILURES };
}

export function consumeTotpChallenge(jti: string, expiresAtMs: number): void {
  challengeStates.set(jti, {
    failures: 0,
    consumed: true,
    expiresAtMs,
  });
}

/**
 * Create a 30-day HMAC-signed trusted-browser token bound to User-Agent and
 * active credential fingerprint.
 */
export function createTrustedDeviceToken(
  username: string,
  request: NextRequest,
): { token: string; maxAgeSeconds: number } | null {
  const maxAgeSeconds = getTrustDeviceTtlSeconds();
  if (maxAgeSeconds <= 0) return null;
  const secret = getSessionSecret();
  const nowSec = Math.floor(Date.now() / 1000);
  const payload: TrustedDevicePayload = {
    v: 1,
    typ: "trust",
    u: username,
    ua: shortContextHash(requestUserAgent(request)),
    fp: computeCredentialFingerprint(),
    iat: nowSec,
    exp: nowSec + maxAgeSeconds,
    jti: randomBytes(12).toString("base64url"),
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  const sig = signDomainPayload("trust", encoded, secret);
  return { token: `${encoded}.${sig}`, maxAgeSeconds };
}

export function hasTrustedDeviceCookie(
  request: NextRequest,
  expectedUsername?: string,
): boolean {
  if (!isAdminAuthConfigured()) return false;
  const rawToken =
    request.cookies.get(COOKIE_ADMIN_TRUST_PROD)?.value ??
    request.cookies.get(COOKIE_ADMIN_TRUST_DEV)?.value;
  if (!rawToken) return false;

  const dot = rawToken.indexOf(".");
  if (dot <= 0 || dot !== rawToken.lastIndexOf(".")) return false;
  const encoded = rawToken.slice(0, dot);
  const providedSig = rawToken.slice(dot + 1);
  const expectedSig = signDomainPayload("trust", encoded, getSessionSecret());

  const a = Buffer.from(providedSig, "utf8");
  const b = Buffer.from(expectedSig, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as Partial<TrustedDevicePayload>;
    if (
      parsed.v !== 1 ||
      parsed.typ !== "trust" ||
      typeof parsed.u !== "string" ||
      typeof parsed.exp !== "number"
    ) {
      return false;
    }
    const nowSec = Math.floor(Date.now() / 1000);
    if (parsed.exp <= nowSec) return false;
    const targetUser = expectedUsername ?? getConfiguredUsername();
    if (!safeEqualStrings(parsed.u, targetUser)) return false;
    if (parsed.fp !== computeCredentialFingerprint()) return false;
    if (parsed.ua !== shortContextHash(requestUserAgent(request))) return false;
    return true;
  } catch {
    return false;
  }
}

export function createAdminSessionToken(username: string): {
  token: string;
  session: AdminSession;
  maxAgeSeconds: number;
} {
  const secret = getSessionSecret();
  if (secret.length < 32) {
    throw new Error("Admin session secret is not configured.");
  }
  const nowSec = Math.floor(Date.now() / 1000);
  const maxAgeSeconds = getSessionTtlSeconds();
  const payload: SessionPayload = {
    v: 2,
    u: username,
    fp: computeCredentialFingerprint(),
    iat: nowSec,
    exp: nowSec + maxAgeSeconds,
    jti: randomBytes(12).toString("base64url"),
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  const signature = signDomainPayload("session", encoded, secret);
  return {
    token: `${encoded}.${signature}`,
    session: {
      username,
      issuedAt: payload.iat * 1000,
      expiresAt: payload.exp * 1000,
    },
    maxAgeSeconds,
  };
}

export function verifyAdminSessionToken(
  rawToken: string | null | undefined,
): AdminSession | null {
  if (!rawToken || !isAdminAuthConfigured()) return null;
  const dot = rawToken.indexOf(".");
  if (dot <= 0 || dot !== rawToken.lastIndexOf(".")) return null;
  const encoded = rawToken.slice(0, dot);
  const providedSig = rawToken.slice(dot + 1);
  const secret = getSessionSecret();

  let parsed: Partial<SessionPayload>;
  try {
    parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as Partial<SessionPayload>;
  } catch {
    return null;
  }

  const expectedSig =
    parsed.v === 2
      ? signDomainPayload("session", encoded, secret)
      : signLegacySessionPayload(encoded, secret);

  const a = Buffer.from(providedSig, "utf8");
  const b = Buffer.from(expectedSig, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  if (
    (parsed.v !== 1 && parsed.v !== 2) ||
    typeof parsed.u !== "string" ||
    typeof parsed.iat !== "number" ||
    typeof parsed.exp !== "number"
  ) {
    return null;
  }
  const nowSec = Math.floor(Date.now() / 1000);
  if (parsed.exp <= nowSec) return null;
  if (!safeEqualStrings(parsed.u, getConfiguredUsername())) return null;
  if (parsed.v === 2 && parsed.fp !== computeCredentialFingerprint()) {
    return null;
  }
  return {
    username: parsed.u,
    issuedAt: parsed.iat * 1000,
    expiresAt: parsed.exp * 1000,
  };
}

function isSecureRequest(request?: NextRequest): boolean {
  if (request) {
    const proto = request.headers
      .get("x-forwarded-proto")
      ?.split(",")[0]
      ?.trim();
    if (proto === "https") return true;
    if (proto === "http") return false;
    try {
      return new URL(request.url).protocol === "https:";
    } catch {
      // fall through
    }
  }
  return process.env.NODE_ENV === "production";
}

export function adminSetCookieHeader(
  token: string,
  maxAgeSeconds: number,
  request?: NextRequest,
): string {
  const secure = isSecureRequest(request);
  const name = secure ? COOKIE_ADMIN_PROD : COOKIE_ADMIN_DEV;
  const secureAttr = secure ? "; Secure" : "";
  return `${name}=${token}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly; SameSite=Strict${secureAttr}`;
}

export function adminSetHintCookieHeader(
  maxAgeSeconds: number,
  request?: NextRequest,
): string {
  const secure = isSecureRequest(request);
  const secureAttr = secure ? "; Secure" : "";
  return `${COOKIE_ADMIN_HINT}=1; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secureAttr}`;
}

export function adminClearHintCookieHeader(request?: NextRequest): string {
  const secure = isSecureRequest(request);
  const secureAttr = secure ? "; Secure" : "";
  return `${COOKIE_ADMIN_HINT}=; Path=/; Max-Age=0; SameSite=Lax${secureAttr}`;
}

export function adminClearCookieHeaders(request?: NextRequest): string[] {
  const secure = isSecureRequest(request);
  const headers = [
    `${COOKIE_ADMIN_DEV}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict`,
    adminClearHintCookieHeader(request),
  ];
  if (secure) {
    headers.push(
      `${COOKIE_ADMIN_PROD}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict; Secure`,
    );
  }
  return headers;
}

export function adminSetTrustCookieHeader(
  token: string,
  maxAgeSeconds: number,
  request?: NextRequest,
): string {
  const secure = isSecureRequest(request);
  const name = secure ? COOKIE_ADMIN_TRUST_PROD : COOKIE_ADMIN_TRUST_DEV;
  const secureAttr = secure ? "; Secure" : "";
  return `${name}=${token}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly; SameSite=Strict${secureAttr}`;
}

export function adminClearTrustCookieHeaders(request?: NextRequest): string[] {
  const secure = isSecureRequest(request);
  const headers = [
    `${COOKIE_ADMIN_TRUST_DEV}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict`,
  ];
  if (secure) {
    headers.push(
      `${COOKIE_ADMIN_TRUST_PROD}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict; Secure`,
    );
  }
  return headers;
}

export async function getAdminSession(
  request?: NextRequest,
): Promise<AdminSession | null> {
  if (request) {
    const raw =
      request.cookies.get(COOKIE_ADMIN_PROD)?.value ??
      request.cookies.get(COOKIE_ADMIN_DEV)?.value;
    return verifyAdminSessionToken(raw);
  }
  const store = await cookies();
  const raw =
    store.get(COOKIE_ADMIN_PROD)?.value ?? store.get(COOKIE_ADMIN_DEV)?.value;
  return verifyAdminSessionToken(raw);
}

export async function requireAdminSession(
  request: NextRequest,
): Promise<
  { ok: true; session: AdminSession } | { ok: false; response: NextResponse }
> {
  const session = await getAdminSession(request);
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Sign in required." },
        {
          status: 401,
          headers: { "Cache-Control": "private, no-store" },
        },
      ),
    };
  }
  return { ok: true, session };
}
