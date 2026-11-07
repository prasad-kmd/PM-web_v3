import "server-only";

import { CINEMA_PROVIDER_PROBE_TIMEOUT_MS } from "./config";
import { getPlaybackProviders } from "./vidsrc";

/**
 * Origin reachability for the playback providers.
 *
 * Honest limits, stated up front:
 *  - we probe each provider's **origin**, not every embed path, because probing
 *    a stream path just to discard the response is wasteful and slow;
 *  - a `200` proves DNS + TLS + routing, not that a specific title is available;
 *  - a provider that returns `403` to a non-browser request is *not* necessarily
 *    broken inside an iframe, so a failure here is advisory, never a veto.
 *
 * The result only re-orders the chain and adds a warning dot. The client's
 * iframe watchdog is the authoritative signal.
 */

type ProbeEntry = { reachable: boolean; at: number };

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, ProbeEntry>();

const PROBE_HEADERS = {
  Accept: "text/html,application/xhtml+xml",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
};

async function probeOrigin(origin: string): Promise<boolean> {
  const cached = cache.get(origin);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.reachable;

  let reachable = false;
  try {
    const response = await fetch(`${origin}/`, {
      method: "GET",
      redirect: "follow",
      headers: PROBE_HEADERS,
      signal: AbortSignal.timeout(CINEMA_PROVIDER_PROBE_TIMEOUT_MS),
      cache: "no-store",
    });
    reachable = response.status < 500;
  } catch {
    reachable = false;
  }

  cache.set(origin, { reachable, at: Date.now() });
  return reachable;
}

/** `providerId → reachable`. Never throws. */
export async function probePlaybackProviders(): Promise<
  Record<string, boolean>
> {
  const providers = getPlaybackProviders();
  const results = await Promise.allSettled(
    providers.map((provider) => probeOrigin(provider.baseUrl)),
  );

  const map: Record<string, boolean> = {};
  providers.forEach((provider, index) => {
    const settled = results[index];
    map[provider.id] = settled.status === "fulfilled" ? settled.value : false;
  });
  return map;
}
