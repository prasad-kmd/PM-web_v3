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

type SessionResponse = {
  authenticated: boolean;
  username?: string;
  expiresAt?: number;
  totpRequired?: boolean;
  error?: string;
};

type SignInInput = {
  username: string;
  password: string;
  otp?: string;
};

export type AdminAuthContextValue = {
  authenticated: boolean;
  username: string | null;
  expiresAt: number | null;
  totpRequired: boolean;
  ready: boolean;
  lockOpen: boolean;
  openLockCurtain: () => void;
  closeLockCurtain: () => void;
  signIn: (input: SignInInput) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
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
  const [totpRequired, setTotpRequired] = useState(false);
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
        return;
      }
      const data = (await res.json()) as SessionResponse;
      setAuthenticated(Boolean(data.authenticated));
      setUsername(data.username ?? null);
      setExpiresAt(data.expiresAt ?? null);
      setTotpRequired(Boolean(data.totpRequired));
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

  const signIn = useCallback(
    async ({ username: userField, password, otp }: SignInInput) => {
      try {
        const res = await fetch("/api/admin/session", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: userField,
            password,
            ...(otp ? { otp } : {}),
          }),
        });
        const data = (await res.json().catch(() => ({}))) as SessionResponse;
        if (!res.ok || !data.authenticated) {
          return {
            ok: false,
            error: data.error || "Incorrect username or password.",
          };
        }
        setAuthenticated(true);
        setUsername(data.username ?? userField.trim());
        setExpiresAt(data.expiresAt ?? null);
        setLockOpen(false);
        toast.success("Workspace unlocked.");
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

  const signOut = useCallback(async () => {
    try {
      await fetch("/api/admin/session", {
        method: "DELETE",
        credentials: "same-origin",
      });
    } catch {
      // Clear local state regardless.
    }
    setAuthenticated(false);
    setUsername(null);
    setExpiresAt(null);
    setLockOpen(false);
    onSignedOut?.();
    toast.success("Signed out.");
  }, [onSignedOut]);

  const refreshContentCache = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/cache/purge", {
        method: "POST",
        credentials: "same-origin",
      });
      if (!res.ok) {
        if (res.status === 401) {
          setAuthenticated(false);
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
      totpRequired,
      ready,
      lockOpen,
      openLockCurtain,
      closeLockCurtain,
      signIn,
      signOut,
      refreshContentCache,
    }),
    [
      authenticated,
      closeLockCurtain,
      expiresAt,
      lockOpen,
      openLockCurtain,
      ready,
      refreshContentCache,
      signIn,
      signOut,
      totpRequired,
      username,
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
