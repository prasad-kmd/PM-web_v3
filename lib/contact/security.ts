import "server-only";
import { isDisposableEmail } from "fakeout";
import {
  RegExpMatcher,
  englishDataset,
  englishRecommendedTransformers,
} from "obscenity";

const matcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});
export function isBlockedContent(email: string, values: string[]) {
  try {
    return (
      isDisposableEmail(email) ||
      values.some((value) => matcher.hasMatch(value))
    );
  } catch {
    return false;
  }
}
const hits = new Map<string, number[]>();
/** Best-effort, per-instance limit; this is not a distributed abuse control. */
export function contactLimit(ip: string) {
  const now = Date.now(),
    windowMs = 60_000;
  if (hits.size >= 512)
    for (const [key, times] of hits)
      if (times.every((time) => now - time >= windowMs)) hits.delete(key);
  // Bound the table even if forwarded IP headers are spoofed or a botnet floods it.
  if (hits.size >= 2048 && !hits.has(ip)) return 60;
  const recent = (hits.get(ip) || []).filter((time) => now - time < windowMs);
  if (recent.length >= 3)
    return Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000));
  recent.push(now);
  hits.set(ip, recent);
  return 0;
}
export async function verifyTurnstile(token: string) {
  const secret =
    process.env.TURNSTILE_SECRET_KEY?.trim() ||
    (process.env.NODE_ENV !== "production"
      ? "1x0000000000000000000000000000000AA"
      : "");
  if (!secret || !token) return false;
  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret, response: token }),
        signal: AbortSignal.timeout(8_000),
        cache: "no-store",
      },
    );
    const data = (await response.json()) as { success?: boolean };
    return response.ok && data.success === true;
  } catch {
    return false;
  }
}
