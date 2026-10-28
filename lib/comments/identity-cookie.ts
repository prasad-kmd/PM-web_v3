import { COOKIE_COMMENTER } from "@/lib/cookies";
import type { CommenterIdentity } from "./types";

/**
 * `pm_commenter` — the guest identity cookie, byte-compatible with PM-Web_V2.
 *
 *   value  URL-encoded JSON `{v:1,n,e,g,l,t}`
 *   life   180 days, Path=/, SameSite=Lax, Secure in production
 *
 * Deliberately **not** HttpOnly: the composer has to prefill from it on the
 * client. It is therefore never trusted — the server re-validates every field
 * on each POST and treats the cookie purely as a convenience cache.
 */

export const IDENTITY_COOKIE = COOKIE_COMMENTER;

const SCHEMA_VERSION = 1;
const MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

type StoredIdentity = {
  v: number;
  n: string;
  e: string;
  g?: string;
  l?: string;
  t?: string;
};

function toStored(identity: CommenterIdentity): StoredIdentity {
  return {
    v: SCHEMA_VERSION,
    n: identity.name,
    e: identity.email,
    ...(identity.github ? { g: identity.github } : {}),
    ...(identity.linkedin ? { l: identity.linkedin } : {}),
    ...(identity.twitter ? { t: identity.twitter } : {}),
  };
}

function fromStored(raw: string | null | undefined): CommenterIdentity | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as StoredIdentity;
    if (parsed?.v !== SCHEMA_VERSION) return null;
    if (typeof parsed.n !== "string" || typeof parsed.e !== "string")
      return null;
    if (!parsed.n.trim() || !parsed.e.includes("@")) return null;
    return {
      name: parsed.n,
      email: parsed.e,
      ...(parsed.g ? { github: parsed.g } : {}),
      ...(parsed.l ? { linkedin: parsed.l } : {}),
      ...(parsed.t ? { twitter: parsed.t } : {}),
    };
  } catch {
    return null;
  }
}

export function serializeIdentity(identity: CommenterIdentity): string {
  return encodeURIComponent(JSON.stringify(toStored(identity)));
}

export function parseIdentity(
  raw: string | null | undefined,
): CommenterIdentity | null {
  return fromStored(raw);
}

function attributes(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}

export function identitySetCookie(identity: CommenterIdentity): string {
  return `${IDENTITY_COOKIE}=${serializeIdentity(identity)}; ${attributes()}`;
}

export function identityClearCookie(): string {
  return `${IDENTITY_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
