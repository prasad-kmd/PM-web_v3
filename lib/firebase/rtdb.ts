import "server-only";
import { createSign } from "node:crypto";
import { cleanEnvValue } from "@/lib/telegram";

type FirebaseServiceConfig = {
  databaseUrl: string;
  clientEmail: string;
  privateKey: string;
};

type CachedAccessToken = {
  token: string;
  expiresAtMs: number;
};

const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const FIREBASE_SCOPES = [
  "https://www.googleapis.com/auth/firebase.database",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

let cachedToken: CachedAccessToken | null = null;
let inflightTokenPromise: Promise<string | null> | null = null;

function toBase64Url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function getFirebaseConfig(): FirebaseServiceConfig | null {
  const rawUrl = cleanEnvValue(process.env.FIREBASE_DATABASE_URL).replace(
    /\/+$/g,
    "",
  );
  const clientEmail = cleanEnvValue(process.env.FIREBASE_CLIENT_EMAIL);
  const rawKey = cleanEnvValue(process.env.FIREBASE_PRIVATE_KEY);

  if (!rawUrl || !clientEmail || !rawKey) return null;

  const privateKey = rawKey.replace(/\\n/g, "\n");
  if (!privateKey.includes("BEGIN PRIVATE KEY")) return null;

  return {
    databaseUrl: rawUrl,
    clientEmail,
    privateKey,
  };
}

export function isFirebaseConfigured(): boolean {
  return getFirebaseConfig() !== null;
}

/**
 * Encodes an arbitrary string (such as a content slug or domain name) into a
 * collision-free, reversible Firebase Realtime Database key.
 * Firebase keys cannot contain `.`, `$`, `#`, `[`, `]`, `/`, or ASCII 0-31/127.
 */
export function encodeRtdbKey(value: string): string {
  return encodeURIComponent(value)
    .replace(/\./g, "%2E")
    .replace(
      /[!'()*]/g,
      (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`,
    );
}

export function decodeRtdbKey(encoded: string): string {
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
}

function signServiceAccountJwt(config: FirebaseServiceConfig): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const header = toBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = toBase64Url(
    JSON.stringify({
      iss: config.clientEmail,
      sub: config.clientEmail,
      aud: OAUTH_TOKEN_URL,
      iat: nowSec,
      exp: nowSec + 3600,
      scope: FIREBASE_SCOPES,
    }),
  );

  const signingInput = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();
  const signature = toBase64Url(signer.sign(config.privateKey));
  return `${signingInput}.${signature}`;
}

async function fetchAccessToken(
  config: FirebaseServiceConfig,
): Promise<string | null> {
  try {
    const assertion = signServiceAccountJwt(config);
    const body = new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    });

    const response = await fetch(OAUTH_TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(
        `[rtdb] OAuth2 token exchange failed with HTTP ${response.status}`,
      );
      return null;
    }

    const data = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
    };

    if (!data.access_token) return null;

    const ttlSeconds = Math.max(60, (data.expires_in ?? 3600) - 300);
    cachedToken = {
      token: data.access_token,
      expiresAtMs: Date.now() + ttlSeconds * 1000,
    };
    return data.access_token;
  } catch (error) {
    console.error("[rtdb] Unable to mint service account access token:", error);
    return null;
  }
}

async function getAccessToken(
  config: FirebaseServiceConfig,
): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAtMs > Date.now()) {
    return cachedToken.token;
  }
  if (inflightTokenPromise) {
    return inflightTokenPromise;
  }
  inflightTokenPromise = fetchAccessToken(config).finally(() => {
    inflightTokenPromise = null;
  });
  return inflightTokenPromise;
}

function buildRtdbUrl(
  databaseUrl: string,
  path: string,
  query?: Record<string, string>,
): string {
  const cleanPath = path.replace(/^\/+|\/+$/g, "");
  const url = new URL(`${databaseUrl}/${cleanPath}.json`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

export type RtdbReadOptions = {
  query?: Record<string, string>;
  revalidate?: number | false;
  tags?: string[];
  timeoutMs?: number;
};

export async function rtdbGet<T>(
  path: string,
  options?: RtdbReadOptions,
): Promise<T | null> {
  const config = getFirebaseConfig();
  if (!config) return null;

  const token = await getAccessToken(config);
  if (!token) return null;

  const url = buildRtdbUrl(config.databaseUrl, path, options?.query);
  const useCache =
    typeof options?.revalidate === "number" && options.revalidate > 0;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(options?.timeoutMs ?? 5_000),
      ...(useCache
        ? {
            next: {
              revalidate: options.revalidate as number,
              ...(options?.tags ? { tags: options.tags } : {}),
            },
          }
        : { cache: "no-store" }),
    });

    if (response.status === 401) {
      cachedToken = null;
    }
    if (!response.ok) return null;

    return (await response.json()) as T | null;
  } catch {
    return null;
  }
}

async function rtdbMutate<T>(
  method: "PATCH" | "PUT" | "DELETE",
  path: string,
  payload?: unknown,
  timeoutMs = 5_000,
): Promise<{ ok: boolean; data: T | null }> {
  const config = getFirebaseConfig();
  if (!config) return { ok: false, data: null };

  const token = await getAccessToken(config);
  if (!token) return { ok: false, data: null };

  const url = buildRtdbUrl(config.databaseUrl, path);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(payload !== undefined
          ? { "content-type": "application/json" }
          : {}),
      },
      ...(payload !== undefined ? { body: JSON.stringify(payload) } : {}),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });

    if (response.status === 401) {
      cachedToken = null;
    }
    if (!response.ok) {
      return { ok: false, data: null };
    }

    if (method === "DELETE") {
      return { ok: true, data: null };
    }

    const data = (await response.json().catch(() => null)) as T | null;
    return { ok: true, data };
  } catch {
    return { ok: false, data: null };
  }
}

export async function rtdbPatch<T = Record<string, unknown>>(
  path: string,
  payload: Record<string, unknown>,
): Promise<T | null> {
  const res = await rtdbMutate<T>("PATCH", path, payload);
  return res.data;
}

export async function rtdbPut<T = unknown>(
  path: string,
  payload: unknown,
): Promise<T | null> {
  const res = await rtdbMutate<T>("PUT", path, payload);
  return res.data;
}

export async function rtdbDelete(path: string): Promise<boolean> {
  const res = await rtdbMutate<null>("DELETE", path);
  return res.ok;
}
