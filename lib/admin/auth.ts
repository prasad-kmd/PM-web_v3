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
import { COOKIE_ADMIN_DEV, COOKIE_ADMIN_PROD } from "@/lib/cookies";

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 };
const SCRYPT_KEYLEN = 64;
const DUMMY_SALT = Buffer.alloc(16, 0x5a);
const DUMMY_HASH = Buffer.alloc(SCRYPT_KEYLEN, 0xa5);

export type AdminSession = {
  username: string;
  issuedAt: number;
  expiresAt: number;
};

type SessionPayload = {
  v: 1;
  u: string;
  iat: number;
  exp: number;
  jti: string;
};

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
  return Boolean(cleanEnv(process.env.ADMIN_TOTP_SECRET));
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

/** Decode standard Base32 secret (RFC 4648) for optional TOTP verification. */
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
  return Buffer.from(bytes);
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

function verifyTotpCode(code: string | undefined): boolean {
  const rawSecret = cleanEnv(process.env.ADMIN_TOTP_SECRET);
  if (!rawSecret) return true;
  if (!code || !/^\d{6}$/.test(code.trim())) return false;
  const key = decodeBase32(rawSecret);
  if (!key || key.length === 0) return false;
  const step = Math.floor(Date.now() / 1000 / 30);
  const normalized = code.trim();
  for (const delta of [-1, 0, 1]) {
    const candidate = computeTotp(key, step + delta);
    if (safeEqualStrings(normalized, candidate)) return true;
  }
  return false;
}

export async function verifyAdminCredentials(
  username: string,
  password: string,
  otp?: string,
): Promise<boolean> {
  if (!isAdminAuthConfigured()) {
    await deriveScrypt(password || "invalid", DUMMY_SALT);
    void DUMMY_HASH;
    return false;
  }
  const expectedUser = getConfiguredUsername();
  const userMatches = safeEqualStrings(username.trim(), expectedUser);
  const passwordMatches = await verifyPassword(password);
  const totpMatches = verifyTotpCode(otp);
  return userMatches && passwordMatches && totpMatches;
}

function signPayload(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");
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
    v: 1,
    u: username,
    iat: nowSec,
    exp: nowSec + maxAgeSeconds,
    jti: randomBytes(12).toString("base64url"),
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  const signature = signPayload(encoded, secret);
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
  const expectedSig = signPayload(encoded, secret);

  const a = Buffer.from(providedSig, "utf8");
  const b = Buffer.from(expectedSig, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as Partial<SessionPayload>;
    if (parsed.v !== 1 || typeof parsed.u !== "string") return null;
    if (typeof parsed.iat !== "number" || typeof parsed.exp !== "number")
      return null;
    const nowSec = Math.floor(Date.now() / 1000);
    if (parsed.exp <= nowSec) return null;
    if (!safeEqualStrings(parsed.u, getConfiguredUsername())) return null;
    return {
      username: parsed.u,
      issuedAt: parsed.iat * 1000,
      expiresAt: parsed.exp * 1000,
    };
  } catch {
    return null;
  }
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

export function adminClearCookieHeaders(request?: NextRequest): string[] {
  const secure = isSecureRequest(request);
  const headers = [
    `${COOKIE_ADMIN_DEV}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict`,
  ];
  if (secure) {
    headers.push(
      `${COOKIE_ADMIN_PROD}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict; Secure`,
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
