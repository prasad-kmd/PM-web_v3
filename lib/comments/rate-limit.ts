import "server-only";
import { createLimiter } from "@/lib/contact/security";
import { commentConfig } from "./config";

/**
 * Comment rate limits, reusing the contact form's in-memory sliding window.
 *
 * Both limiters return `0` when the call is allowed, otherwise the number of
 * seconds to wait — the same contract as `contactLimit` and `emailRevealLimit`.
 *
 * Per-instance by design: Turnstile and the honeypot are the real gate. Swapping
 * this for KV/Upstash only means replacing `createLimiter`, because callers only
 * ever see "seconds to wait".
 */

/** Short burst: stops a script from flooding one page. */
export const commentBurstLimit = createLimiter(
  commentConfig.burst.limit,
  commentConfig.burst.window,
);

/** Long window: caps how much one address can post in a day. */
export const commentDailyLimit = createLimiter(
  commentConfig.daily.limit,
  commentConfig.daily.window,
);

/** Reads are cheap but not free; a page that is being refreshed hard gets 120/min. */
export const commentReadLimit = createLimiter(120, 60_000);
