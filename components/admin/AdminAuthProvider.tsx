"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import type { AdminCommentProfile } from "@/lib/admin/comment-profile";

type SessionResponse = {
  authenticated: boolean;
  step?: "totp";
  challengeToken?: string;
  expiresInSeconds?: number;
  recoveryAvailable?: boolean;
  trustDurationDays?: number;
  username?: string;
  expiresAt?: number;
  totpEnabled?: boolean;
  deviceTrusted?: boolean;
  usedRecoveryCode?: boolean;
  commentProfile?: AdminCommentProfile;
  expiredChallenge?: boolean;
  error?: string;
};

export type TotpChallengeState = {
  challengeToken: string;
  expiresAtMs: number;
  recoveryAvailable: boolean;
  trustDurationDays: number;
};

export type PrimarySignInResult =
  | { ok: true; step: "authenticated" }
  | { ok: true; step: "totp"; challenge: TotpChallengeState }
  | { ok: false; error: string };

export type TotpVerifyResult =
  { ok: true } | { ok: false; error: string; expiredChallenge?: boolean };

export type AdminAuthContextValue = {
  authenticated: boolean;
  username: string | null;
  expiresAt: number | null;
  totpEnabled: boolean;
  deviceTrusted: boolean;
  commentProfile: AdminCommentProfile | null;
  ready: boolean;
  lockOpen: boolean;
  openLockCurtain: () => void;
  closeLockCurtain: () => void;
  signInPrimary: (input: {
    username: string;
    password: string;
  }) => Promise<PrimarySignInResult>;
  verifyTotpChallenge: (input: {
    challengeToken: string;
    code: string;
    useRecoveryCode?: boolean;
    trustDevice?: boolean;
  }) => Promise<TotpVerifyResult>;
  forgetTrustedDevice: () => Promise<void>;
  signOut: (options?: { forgetDevice?: boolean }) => Promise<void>;
  refreshContentCache: () => Promise<void>;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({
  children,
  onSignedOut,
}: {
  children: ReactNode;
  onSignedOut?: () => void;
}) {
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [deviceTrusted, setDeviceTrusted] = useState(false);
  const [commentProfile, setCommentProfile] =
    useState<AdminCommentProfile | null>(null);
  const [ready, setReady] = useState(false);
  const [lockOpen, setLockOpen] = useState(false);

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/session", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!res.ok) {
        setAuthenticated(false);
        setUsername(null);
        setExpiresAt(null);
        setTotpEnabled(false);
        setDeviceTrusted(false);
        setCommentProfile(null);
        return;
      }
      const data = (await res.json()) as SessionResponse;
      const isAuthed = Boolean(data.authenticated);
      setAuthenticated(isAuthed);
      setUsername(data.username ?? null);
      setExpiresAt(data.expiresAt ?? null);
      setTotpEnabled(Boolean(data.totpEnabled));
      setDeviceTrusted(Boolean(data.deviceTrusted));
      setCommentProfile(isAuthed ? (data.commentProfile ?? null) : null);
    } catch {
      // Quietly stay signed out if offline or unreachable.
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  const openLockCurtain = useCallback(() => {
    setLockOpen(true);
  }, []);

  const closeLockCurtain = useCallback(() => {
    setLockOpen(false);
  }, []);

  const signInPrimary = useCallback(
    async ({
      username: userField,
      password,
    }: {
      username: string;
      password: string;
    }): Promise<PrimarySignInResult> => {
      try {
        const res = await fetch("/api/admin/session", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            step: "credentials",
            username: userField,
            password,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as SessionResponse;

        if (!res.ok) {
          return {
            ok: false,
            error: data.error || "Incorrect username or password.",
          };
        }

        if (data.step === "totp" && data.challengeToken) {
          const ttlSec = data.expiresInSeconds ?? 90;
          return {
            ok: true,
            step: "totp",
            challenge: {
              challengeToken: data.challengeToken,
              expiresAtMs: Date.now() + ttlSec * 1000,
              recoveryAvailable: Boolean(data.recoveryAvailable),
              trustDurationDays:
                typeof data.trustDurationDays === "number"
                  ? data.trustDurationDays
                  : 30,
            },
          };
        }

        if (!data.authenticated) {
          return {
            ok: false,
            error: data.error || "Incorrect username or password.",
          };
        }

        setAuthenticated(true);
        setUsername(data.username ?? userField.trim());
        setExpiresAt(data.expiresAt ?? null);
        setTotpEnabled(Boolean(data.totpEnabled));
        setDeviceTrusted(Boolean(data.deviceTrusted));
        setCommentProfile(data.commentProfile ?? null);
        setLockOpen(false);
        toast.success("Workspace unlocked.");
        return { ok: true, step: "authenticated" };
      } catch {
        return {
          ok: false,
          error: "Unable to reach the workspace right now.",
        };
      }
    },
    [],
  );

  const verifyTotpChallenge = useCallback(
    async ({
      challengeToken,
      code,
      useRecoveryCode,
      trustDevice,
    }: {
      challengeToken: string;
      code: string;
      useRecoveryCode?: boolean;
      trustDevice?: boolean;
    }): Promise<TotpVerifyResult> => {
      try {
        const res = await fetch("/api/admin/session", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            step: "totp",
            challengeToken,
            code,
            useRecoveryCode: Boolean(useRecoveryCode),
            trustDevice: Boolean(trustDevice),
          }),
        });
        const data = (await res.json().catch(() => ({}))) as SessionResponse;

        if (!res.ok || !data.authenticated) {
          return {
            ok: false,
            error: data.error || "Invalid verification code.",
            expiredChallenge: Boolean(data.expiredChallenge),
          };
        }

        setAuthenticated(true);
        setUsername(data.username ?? null);
        setExpiresAt(data.expiresAt ?? null);
        setTotpEnabled(true);
        setDeviceTrusted(Boolean(data.deviceTrusted));
        setCommentProfile(data.commentProfile ?? null);
        setLockOpen(false);

        if (data.usedRecoveryCode) {
          toast.warning("Unlocked with an emergency recovery code.", {
            description:
              "Rotate your authenticator & recovery codes when convenient.",
          });
        } else {
          toast.success("Workspace unlocked.");
        }
        return { ok: true };
      } catch {
        return {
          ok: false,
          error: "Unable to reach the workspace right now.",
        };
      }
    },
    [],
  );

  const forgetTrustedDevice = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/session", {
        method: "PATCH",
        credentials: "same-origin",
      });
      if (!res.ok) {
        toast.error("Could not update browser trust setting.");
        return;
      }
      setDeviceTrusted(false);
      toast.success(
        "Browser trust removed. Next sign-in will prompt for a code.",
      );
    } catch {
      toast.error("Could not update browser trust setting.");
    }
  }, []);

  const signOut = useCallback(
    async (options?: { forgetDevice?: boolean }) => {
      const query = options?.forgetDevice ? "?forgetDevice=1" : "";
      try {
        await fetch(`/api/admin/session${query}`, {
          method: "DELETE",
          credentials: "same-origin",
        });
      } catch {
        // Clear local state regardless.
      }
      setAuthenticated(false);
      setUsername(null);
      setExpiresAt(null);
      setCommentProfile(null);
      if (options?.forgetDevice) {
        setDeviceTrusted(false);
      }
      setLockOpen(false);
      onSignedOut?.();
      toast.success("Signed out.");
    },
    [onSignedOut],
  );

  const refreshContentCache = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/cache/purge", {
        method: "POST",
        credentials: "same-origin",
      });
      if (!res.ok) {
        if (res.status === 401) {
          setAuthenticated(false);
          setCommentProfile(null);
          onSignedOut?.();
          toast.error("Session expired. Please sign in again.");
          return;
        }
        toast.error("Could not refresh workspace content.");
        return;
      }
      toast.success("Workspace content refreshed.");
    } catch {
      toast.error("Could not refresh workspace content.");
    }
  }, [onSignedOut]);

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      authenticated,
      username,
      expiresAt,
      totpEnabled,
      deviceTrusted,
      commentProfile,
      ready,
      lockOpen,
      openLockCurtain,
      closeLockCurtain,
      signInPrimary,
      verifyTotpChallenge,
      forgetTrustedDevice,
      signOut,
      refreshContentCache,
    }),
    [
      authenticated,
      closeLockCurtain,
      commentProfile,
      deviceTrusted,
      expiresAt,
      forgetTrustedDevice,
      lockOpen,
      openLockCurtain,
      ready,
      refreshContentCache,
      signInPrimary,
      signOut,
      totpEnabled,
      username,
      verifyTotpChallenge,
    ],
  );

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error("useAdminAuth must be used inside <AdminAuthProvider>.");
  }
  return ctx;
}

export function useOptionalAdminAuth(): AdminAuthContextValue | null {
  return useContext(AdminAuthContext);
}
