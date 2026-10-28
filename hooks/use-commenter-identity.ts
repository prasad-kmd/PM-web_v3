"use client";

import { useCallback, useEffect, useState } from "react";
import {
  COOKIE_COMMENTER,
  getClientCookie,
  setClientCookie,
} from "@/lib/cookies";
import type { CommenterIdentity } from "@/lib/comments/types";

/**
 * The guest identity, backed by the `pm_commenter` cookie.
 *
 * The cookie is written by the server on a successful POST and mirrored here so
 * the composer can prefill without a round-trip. It is a convenience cache: the
 * server re-validates every field on each submit and never trusts it.
 */

const MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

type Stored = {
  v: number;
  n: string;
  e: string;
  g?: string;
  l?: string;
  t?: string;
};

export const EMPTY_IDENTITY: CommenterIdentity = {
  name: "",
  email: "",
  github: "",
  linkedin: "",
  twitter: "",
};

function decode(raw: string | null): CommenterIdentity | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Stored;
    if (parsed?.v !== 1) return null;
    if (!parsed.n?.trim() || !parsed.e?.includes("@")) return null;
    return {
      name: parsed.n,
      email: parsed.e,
      github: parsed.g ?? "",
      linkedin: parsed.l ?? "",
      twitter: parsed.t ?? "",
    };
  } catch {
    return null;
  }
}

function encode(identity: CommenterIdentity): string {
  const stored: Stored = {
    v: 1,
    n: identity.name.trim(),
    e: identity.email.trim(),
    ...(identity.github?.trim() ? { g: identity.github.trim() } : {}),
    ...(identity.linkedin?.trim() ? { l: identity.linkedin.trim() } : {}),
    ...(identity.twitter?.trim() ? { t: identity.twitter.trim() } : {}),
  };
  return JSON.stringify(stored);
}

export function useCommenterIdentity() {
  const [identity, setIdentity] = useState<CommenterIdentity>(EMPTY_IDENTITY);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setIdentity(decode(getClientCookie(COOKIE_COMMENTER)) ?? EMPTY_IDENTITY);
    setHydrated(true);
  }, []);

  const save = useCallback((next: CommenterIdentity) => {
    setIdentity(next);
    setClientCookie(COOKIE_COMMENTER, encode(next), MAX_AGE_SECONDS);
  }, []);

  const forget = useCallback(() => {
    setIdentity(EMPTY_IDENTITY);
    setClientCookie(COOKIE_COMMENTER, "", 0);
    // Let the server drop its copy too; failure is harmless.
    void fetch("/api/comments/identity", { method: "DELETE" }).catch(() => {});
  }, []);

  const known =
    hydrated && Boolean(identity.name.trim() && identity.email.includes("@"));

  return { identity, setIdentity, save, forget, known, hydrated };
}
