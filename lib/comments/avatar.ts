import "server-only";
import { commentConfig } from "./config";
import type { SocialPlatform } from "./types";

/**
 * Avatar resolution for guest comments.
 *
 * The handle a visitor types is probed server-side and the first image that
 * resolves is stored *in the comment text* alongside the author, so the feed
 * never has to call out to GitHub or X at render time.
 *
 * Everything fails open: with no handle, or no reachable profile, the client
 * draws a deterministic initials avatar instead.
 */

/** Only these hosts may ever appear in an avatar `<img src>`. */
export const ALLOWED_AVATAR_HOSTS = [
  "avatars.githubusercontent.com",
  "github.com",
  "pbs.twimg.com",
  "media.licdn.com",
  "unavatar.io",
] as const;

const HANDLE_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,63}$/;

/** `@prasad-kmd`, `github.com/prasad-kmd` and a pasted URL all become `prasad-kmd`. */
export function normalizeHandle(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const cleaned = value
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^(www\.)?/i, "")
    .replace(/^(github\.com|linkedin\.com|x\.com|twitter\.com)\//i, "")
    .replace(/^in\//i, "")
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "")
    .replace(/^@/, "");
  return HANDLE_PATTERN.test(cleaned) ? cleaned : null;
}

function isAllowed(url: string): boolean {
  try {
    const { hostname, protocol } = new URL(url);
    if (protocol !== "https:") return false;
    return ALLOWED_AVATAR_HOSTS.some(
      (host) => hostname === host || hostname.endsWith(`.${host}`),
    );
  } catch {
    return false;
  }
}

async function head(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(commentConfig.avatarTimeoutMs),
      cache: "no-store",
    });
    if (!response.ok) return null;
    // `response.url` is the post-redirect URL: github.com/x.png → avatars.githubusercontent.com/u/…
    const final = response.url || url;
    return isAllowed(final) ? final.split("?")[0] : null;
  } catch {
    return null;
  }
}

async function fromGithub(handle: string): Promise<string | null> {
  return head(`https://github.com/${handle}.png?size=160`);
}

async function fromTwitter(handle: string): Promise<string | null> {
  try {
    const response = await fetch(`https://api.fxtwitter.com/${handle}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(commentConfig.avatarTimeoutMs),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = (await response.json()) as {
      user?: { avatar_url?: string };
    };
    const avatar = data.user?.avatar_url;
    // Stock egg avatars are not an identity; fall through to initials.
    if (!avatar || avatar.includes("default_profile")) return null;
    return isAllowed(avatar) ? avatar : null;
  } catch {
    return null;
  }
}

async function fromLinkedin(handle: string): Promise<string | null> {
  return head(`https://unavatar.io/linkedin/${handle}?fallback=false`);
}

/**
 * Resolves the first avatar that answers, in a fixed order: GitHub → X →
 * LinkedIn. All three run concurrently but the *order* of preference is
 * respected, so a visitor with both handles gets their GitHub face.
 */
export async function resolveAvatar(
  handles: Partial<Record<SocialPlatform, string | null>>,
): Promise<{
  avatar: string | null;
  source: SocialPlatform | null;
  handle: string | null;
}> {
  const order: SocialPlatform[] = ["github", "twitter", "linkedin"];
  const probes = order
    .filter((platform) => Boolean(handles[platform]))
    .map(async (platform) => {
      const handle = handles[platform] as string;
      const url =
        platform === "github"
          ? await fromGithub(handle)
          : platform === "twitter"
            ? await fromTwitter(handle)
            : await fromLinkedin(handle);
      return { platform, handle, url };
    });

  const settled = await Promise.all(probes);
  for (const platform of order) {
    const hit = settled.find(
      (entry) => entry.platform === platform && entry.url,
    );
    if (hit) {
      return { avatar: hit.url, source: platform, handle: hit.handle };
    }
  }
  return { avatar: null, source: null, handle: null };
}
