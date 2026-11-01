"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, Download04Icon } from "@hugeicons/core-free-icons";
import { useOptionalAdminAuth } from "@/components/admin/AdminAuthProvider";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { PWA_INSTALL_HINT_KEY, shouldRegisterPwa } from "@/lib/pwa";

type InstallHintRecord = {
  visits: number;
  lastVisitAt: number;
  dismissedAt?: number;
};

const ADMIN_PATHS = ["/insights", "/invoices", "/og-studio"];
const NEW_VISIT_AFTER_MS = 30 * 60 * 1000;
const FIRST_VISIT_DELAY_MS = 60 * 1000;
const RETURN_VISIT_DELAY_MS = 5 * 1000;

function readHintRecord(): InstallHintRecord | null {
  try {
    const raw = window.localStorage.getItem(PWA_INSTALL_HINT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<InstallHintRecord>;
    return {
      visits:
        typeof parsed.visits === "number" && parsed.visits > 0
          ? Math.floor(parsed.visits)
          : 1,
      lastVisitAt:
        typeof parsed.lastVisitAt === "number" ? parsed.lastVisitAt : 0,
      dismissedAt:
        typeof parsed.dismissedAt === "number" ? parsed.dismissedAt : undefined,
    };
  } catch {
    return null;
  }
}

function isAdminPath(pathname: string): boolean {
  return ADMIN_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

/**
 * One quiet, one-time install hint. It waits for either a minute of use on
 * a first visit or a later visit, then for boot and the cookie notice to be
 * gone. Dismissing it here — or dismissing the browser prompt — is final.
 */
export function InstallPrompt() {
  const pathname = usePathname() ?? "";
  const adminAuth = useOptionalAdminAuth();
  const { status, canInstall, installed, installing, isIos, promptInstall } =
    usePwaInstall();
  const [record, setRecord] = useState<InstallHintRecord | null>(null);
  const [ready, setReady] = useState(false);
  const visitMarkedRef = useRef(false);

  useEffect(() => {
    if (
      visitMarkedRef.current ||
      !shouldRegisterPwa() ||
      status === "checking" ||
      status === "installed"
    ) {
      return;
    }

    visitMarkedRef.current = true;
    const now = Date.now();
    const previous = readHintRecord();
    const next: InstallHintRecord = previous
      ? {
          ...previous,
          visits:
            now - previous.lastVisitAt >= NEW_VISIT_AFTER_MS
              ? previous.visits + 1
              : previous.visits,
          lastVisitAt: now,
        }
      : { visits: 1, lastVisitAt: now };

    setRecord(next);
    try {
      window.localStorage.setItem(PWA_INSTALL_HINT_KEY, JSON.stringify(next));
    } catch {
      // If storage is unavailable, the in-memory record still prevents a
      // hint from appearing repeatedly during this page view.
    }
  }, [status]);

  useEffect(() => {
    if (!record || record.dismissedAt) return;
    const delay =
      record.visits >= 2 ? RETURN_VISIT_DELAY_MS : FIRST_VISIT_DELAY_MS;
    const startedAt = Date.now();

    const timer = window.setInterval(() => {
      if (Date.now() - startedAt < delay) return;
      const bootState = document.documentElement.dataset.bootState;
      if (bootState && bootState !== "done" && bootState !== "inactive") {
        return;
      }
      if (document.visibilityState !== "visible") return;
      if (document.querySelector(".cookie-notice")) return;
      setReady(true);
      window.clearInterval(timer);
    }, 500);

    return () => window.clearInterval(timer);
  }, [record]);

  const dismiss = () => {
    const now = Date.now();
    setRecord((current) => {
      const next: InstallHintRecord = {
        visits: current?.visits ?? 1,
        lastVisitAt: current?.lastVisitAt ?? now,
        dismissedAt: now,
      };
      try {
        window.localStorage.setItem(PWA_INSTALL_HINT_KEY, JSON.stringify(next));
      } catch {
        // The in-memory update still hides the hint for this page view.
      }
      return next;
    });
  };

  if (
    !shouldRegisterPwa() ||
    !ready ||
    !record ||
    record.dismissedAt ||
    installed ||
    installing ||
    (!canInstall && !isIos) ||
    isAdminPath(pathname) ||
    adminAuth?.lockOpen
  ) {
    return null;
  }

  return (
    <aside className="pwa-install-hint" aria-label="Install this workspace">
      <span className="pwa-install-hint-icon" aria-hidden>
        <HugeiconsIcon icon={Download04Icon} size={18} strokeWidth={1.8} />
      </span>

      <div className="pwa-install-hint-copy">
        <h2>Install this workspace</h2>
        <p>
          {isIos
            ? "Tap Share, then Add to Home Screen to open it like an app. Pages you visit can be available offline."
            : "Open Projects, writing and tutorials like an app. Public pages you visit can be available offline."}
        </p>
        <div className="pwa-install-hint-actions">
          <button
            type="button"
            className="pwa-install-hint-primary"
            onClick={() => {
              dismiss();
              if (canInstall) void promptInstall();
            }}
          >
            {isIos ? "Got it" : "Install"}
          </button>
          <button type="button" onClick={dismiss}>
            Not now
          </button>
        </div>
      </div>

      <button
        type="button"
        className="pwa-install-hint-close"
        onClick={dismiss}
        aria-label="Dismiss install suggestion"
      >
        <HugeiconsIcon icon={Cancel01Icon} size={15} strokeWidth={2} />
      </button>
    </aside>
  );
}
