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
/**
 * Best-effort, per-instance sliding-window limiter; this is not a distributed
 * abuse control. Returns 0 when allowed, otherwise the seconds to wait.
 */
function createLimiter(max: number, windowMs = 60_000) {
  const hits = new Map<string, number[]>();
  return (ip: string) => {
    const now = Date.now();
    if (hits.size >= 512)
      for (const [key, times] of hits)
        if (times.every((time) => now - time >= windowMs)) hits.delete(key);
    // Bound the table even if forwarded IP headers are spoofed or a botnet floods it.
    if (hits.size >= 2048 && !hits.has(ip)) return 60;
    const recent = (hits.get(ip) || []).filter((time) => now - time < windowMs);
    if (recent.length >= max)
      return Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000));
    recent.push(now);
    hits.set(ip, recent);
    return 0;
  };
}
/** Contact form submissions: 3 per minute per IP. */
export const contactLimit = createLimiter(3);
/** Email reveals: 5 per minute per IP, separate from the form's budget. */
export const emailRevealLimit = createLimiter(5);
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
