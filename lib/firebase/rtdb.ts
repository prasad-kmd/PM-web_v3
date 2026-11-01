import "server-only";
import { createSign } from "node:crypto";
import http from "node:http";
import https from "node:https";
import { unstable_cache } from "next/cache";
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

type RawHttpResponse = {
  status: number;
  body: string;
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

/**
 * Performs an outbound HTTP(S) request directly via Node's native `node:https`
 * / `node:http` transport rather than Next.js's patched `globalThis.fetch`.
 *
 * Next.js patches `globalThis.fetch` during static generation (`next build` /
 * `generateStaticParams` / ISR) and throws `DYNAMIC_SERVER_USAGE` on any
 * uncached (`no-store` or `POST`) `fetch` — including OAuth2 service-account
 * token exchanges needed before cached RTDB reads. Using Node's native
 * transport avoids triggering `DYNAMIC_SERVER_USAGE` and ensures ephemeral
 * OAuth2 bearer tokens are never persisted into the shared Data Cache.
 */
function rawHttpRequest(
  urlString: string,
  options: {
    method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
    headers?: Record<string, string>;
    body?: string;
    timeoutMs?: number;
  },
  redirectsRemaining = 3,
): Promise<RawHttpResponse> {
  return new Promise((resolve, reject) => {
    let target: URL;
    try {
      target = new URL(urlString);
    } catch (err) {
      reject(err);
      return;
    }

    const transport = target.protocol === "http:" ? http : https;
    const timeoutMs = options.timeoutMs ?? 5_000;
    const bodyBuffer =
      options.body !== undefined ? Buffer.from(options.body, "utf8") : null;

    const headers: Record<string, string> = {
      Accept: "application/json",
      ...options.headers,
    };
    if (bodyBuffer !== null && headers["Content-Length"] === undefined) {
      headers["Content-Length"] = String(bodyBuffer.byteLength);
    }

    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(deadlineTimer);
      fn();
    };

    const req = transport.request(
      target,
      {
        method: options.method,
        headers,
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const location = res.headers.location;

        if (
          (status === 301 ||
            status === 302 ||
            status === 307 ||
            status === 308) &&
          location &&
          redirectsRemaining > 0
        ) {
          res.resume();
          const nextUrl = new URL(location, target);
          const nextHeaders = { ...options.headers };
          if (nextUrl.origin !== target.origin) {
            delete nextHeaders.Authorization;
            delete nextHeaders.authorization;
          }
          const preserveMethod = status === 307 || status === 308;
          finish(() => {
            rawHttpRequest(
              nextUrl.toString(),
              {
                method: preserveMethod ? options.method : "GET",
                headers: nextHeaders,
                body: preserveMethod ? options.body : undefined,
                timeoutMs,
              },
              redirectsRemaining - 1,
            ).then(resolve, reject);
          });
          return;
        }

        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer | string) => {
          chunks.push(
            typeof chunk === "string" ? Buffer.from(chunk, "utf8") : chunk,
          );
        });
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          finish(() => resolve({ status, body: text }));
        });
        res.on("error", (err) => {
          finish(() => reject(err));
        });
      },
    );

    const deadlineTimer = setTimeout(() => {
      req.destroy(
        new Error(`RTDB HTTP request timed out after ${timeoutMs}ms`),
      );
    }, timeoutMs);

    req.on("error", (err) => {
      finish(() => reject(err));
    });

    if (bodyBuffer !== null) {
      req.write(bodyBuffer);
    }
    req.end();
  });
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

    const response = await rawHttpRequest(OAUTH_TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      timeoutMs: 5_000,
    });

    if (response.status < 200 || response.status >= 300) {
      console.error(
        `[rtdb] OAuth2 token exchange failed with HTTP ${response.status}`,
      );
      return null;
    }

    const data = JSON.parse(response.body) as {
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
    const sortedEntries = Object.entries(query).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    for (const [key, value] of sortedEntries) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

/**
 * Executes a direct authenticated GET against Firebase RTDB.
 * Throws on transport/auth/HTTP errors so `unstable_cache` never caches
 * transient failures, while legitimately returning `null` when RTDB responds
 * HTTP 200 with JSON `"null"` (meaning the node does not exist yet).
 */
async function fetchRtdbNodeUncached<T>(
  config: FirebaseServiceConfig,
  url: string,
  timeoutMs: number,
): Promise<T | null> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const token = await getAccessToken(config);
    if (!token) {
      throw new Error("Unable to acquire Firebase RTDB access token");
    }

    const response = await rawHttpRequest(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      timeoutMs,
    });

    if (response.status === 401 && attempt === 0) {
      cachedToken = null;
      continue;
    }

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`RTDB GET failed with HTTP ${response.status}`);
    }

    return JSON.parse(response.body) as T | null;
  }

  throw new Error("RTDB GET failed after token refresh retry");
}

export type RtdbReadOptions = {
  query?: Record<string, string>;
  revalidate?: number | false;
  tags?: string[];
  timeoutMs?: number;
  /** Propagate provider/cache errors when the caller must avoid caching a false zero. */
  throwOnError?: boolean;
};

export async function rtdbGet<T>(
  path: string,
  options?: RtdbReadOptions,
): Promise<T | null> {
  const config = getFirebaseConfig();
  if (!config) return null;

  const url = buildRtdbUrl(config.databaseUrl, path, options?.query);
  const timeoutMs = options?.timeoutMs ?? 5_000;
  const useCache =
    typeof options?.revalidate === "number" && options.revalidate > 0;

  try {
    if (!useCache) {
      return await fetchRtdbNodeUncached<T>(config, url, timeoutMs);
    }

    const cachedReader = unstable_cache(
      async function readRtdbNode() {
        return fetchRtdbNodeUncached<T>(config, url, timeoutMs);
      },
      ["rtdb-get", url],
      {
        revalidate: options.revalidate as number,
        ...(options?.tags && options.tags.length > 0
          ? { tags: options.tags }
          : {}),
      },
    );

    try {
      return await cachedReader();
    } catch (cacheErr) {
      if (
        cacheErr instanceof Error &&
        cacheErr.message.includes("incrementalCache missing")
      ) {
        return await fetchRtdbNodeUncached<T>(config, url, timeoutMs);
      }
      throw cacheErr;
    }
  } catch (error) {
    if (options?.throwOnError) throw error;
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

  const url = buildRtdbUrl(config.databaseUrl, path);
  const serializedPayload =
    payload !== undefined ? JSON.stringify(payload) : undefined;

  try {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const token = await getAccessToken(config);
      if (!token) return { ok: false, data: null };

      const response = await rawHttpRequest(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(serializedPayload !== undefined
            ? { "content-type": "application/json" }
            : {}),
        },
        ...(serializedPayload !== undefined ? { body: serializedPayload } : {}),
        timeoutMs,
      });

      if (response.status === 401 && attempt === 0) {
        cachedToken = null;
        continue;
      }

      if (response.status < 200 || response.status >= 300) {
        return { ok: false, data: null };
      }

      if (method === "DELETE" || !response.body.trim()) {
        return { ok: true, data: null };
      }

      try {
        const data = JSON.parse(response.body) as T | null;
        return { ok: true, data };
      } catch {
        return { ok: true, data: null };
      }
    }

    return { ok: false, data: null };
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
