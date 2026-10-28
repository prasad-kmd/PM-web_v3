import "server-only";
import type { NextRequest } from "next/server";

/**
 * Best-effort client IP.
 *
 * Vercel sets `x-vercel-forwarded-for` / `x-forwarded-for`; Cloudflare sets
 * `cf-connecting-ip`. Falls back to `"unknown"`, which still yields a usable
 * (if shared) rate-limit bucket.
 */
export function clientIp(request: NextRequest): string {
  const candidates = [
    request.headers.get("x-vercel-forwarded-for"),
    request.headers.get("cf-connecting-ip"),
    request.headers.get("x-real-ip"),
    request.headers.get("x-forwarded-for"),
  ];
  for (const value of candidates) {
    const first = value?.split(",")[0]?.trim();
    if (first) return first;
  }
  return "unknown";
}

/**
 * Rejects cross-site POSTs. Returns `true` when the request may proceed.
 *
 * A missing Origin/Referer is allowed (some privacy tools strip it) — Turnstile
 * and the rate limits still stand in the way.
 */
export function sameOrigin(request: NextRequest): boolean {
  const source =
    request.headers.get("origin") ?? request.headers.get("referer");
  if (!source) return true;
  try {
    const host = new URL(source).host;
    const target =
      request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ??
      request.headers.get("host") ??
      new URL(request.url).host;
    return host === target;
  } catch {
    return false;
  }
}
