"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Shield01Icon, Settings02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useAdminAuth } from "@/components/admin/AdminAuthProvider";
import { Button } from "@/components/ui/button";
import { BOOT_DONE_EVENT } from "@/lib/boot";
import {
  COOKIE_COOKIE_NOTICE,
  getClientCookie,
  setClientCookie,
} from "@/lib/cookies";
import {
  COOKIE_NOTICE_BODY,
  COOKIE_NOTICE_BODY_COMPACT,
  COOKIE_NOTICE_OPEN_EVENT,
  COOKIE_NOTICE_TITLE,
  COOKIE_NOTICE_VERSION,
  LEGAL_ROUTES,
} from "@/lib/legal";

const ADMIN_ROUTE_SEGMENTS = new Set(["og-studio", "invoices", "insights"]);
const LEGAL_ROUTE_SET = new Set<string>(LEGAL_ROUTES);
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function openCookieNotice() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(COOKIE_NOTICE_OPEN_EVENT));
}

export function CookieNoticeButton({
  children = "Re-open cookie notice",
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      onClick={openCookieNotice}
    >
      <HugeiconsIcon
        icon={Shield01Icon}
        strokeWidth={2}
        size={14}
        aria-hidden
      />
      {children}
    </Button>
  );
}

function hasCurrentAcknowledgement(): boolean {
  const raw = getClientCookie(COOKIE_COOKIE_NOTICE);
  return (
    raw === String(COOKIE_NOTICE_VERSION) ||
    Boolean(raw?.startsWith(`${COOKIE_NOTICE_VERSION}.`))
  );
}

export function CookieNotice({
  onOpenSettings,
}: {
  onOpenSettings: () => void;
}) {
  const pathname = usePathname();
  const { authenticated, lockOpen } = useAdminAuth();
  const [visible, setVisible] = useState(false);
  const [forcedOpen, setForcedOpen] = useState(false);
  const [bootSettled, setBootSettled] = useState(false);
  const dismissedForPageSessionRef = useRef(false);
  const titleId = useId();
  const descriptionId = useId();

  const firstSegment = pathname?.split("/").filter(Boolean)[0] ?? "";
  const isAdminRoute = authenticated && ADMIN_ROUTE_SEGMENTS.has(firstSegment);
  const isLegalRoute = pathname ? LEGAL_ROUTE_SET.has(pathname) : false;

  useEffect(() => {
    const syncBootState = () => {
      const state = document.documentElement.dataset.bootState;
      setBootSettled(!state || state === "done" || state === "inactive");
    };
    syncBootState();
    window.addEventListener(BOOT_DONE_EVENT, syncBootState);
    // The layout script also has a hard failsafe; this final read keeps the
    // notice from waiting forever if an event was missed during hydration.
    const fallback = window.setTimeout(syncBootState, 3800);
    return () => {
      window.removeEventListener(BOOT_DONE_EVENT, syncBootState);
      window.clearTimeout(fallback);
    };
  }, []);

  useEffect(() => {
    const open = () => {
      dismissedForPageSessionRef.current = false;
      setForcedOpen(true);
      if (bootSettled) setVisible(true);
    };
    window.addEventListener(COOKIE_NOTICE_OPEN_EVENT, open);
    return () => window.removeEventListener(COOKIE_NOTICE_OPEN_EVENT, open);
  }, [bootSettled]);

  useEffect(() => {
    if (!bootSettled) {
      setVisible(false);
      return;
    }
    if (lockOpen || isAdminRoute || dismissedForPageSessionRef.current) return;
    if (forcedOpen) {
      setVisible(true);
      return;
    }
    if (isLegalRoute) {
      setVisible(false);
      return;
    }
    if (hasCurrentAcknowledgement()) {
      setVisible(false);
      return;
    }

    // Start this settle delay only after the opening sequence is complete.
    const timer = window.setTimeout(() => setVisible(true), 700);
    return () => window.clearTimeout(timer);
  }, [bootSettled, forcedOpen, isAdminRoute, isLegalRoute, lockOpen, pathname]);

  const hideForPageSession = useCallback(() => {
    dismissedForPageSessionRef.current = true;
    setForcedOpen(false);
    setVisible(false);
  }, []);

  const acknowledge = useCallback(() => {
    setClientCookie(
      COOKIE_COOKIE_NOTICE,
      `${COOKIE_NOTICE_VERSION}.${Date.now()}`,
      ONE_YEAR_SECONDS,
    );
    hideForPageSession();
  }, [hideForPageSession]);

  if (!visible || lockOpen || isAdminRoute) return null;

  return (
    <aside
      className="cookie-notice"
      role="region"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <div className="cookie-notice-icon" aria-hidden>
        <HugeiconsIcon icon={Shield01Icon} strokeWidth={1.9} size={18} />
      </div>
      <div className="cookie-notice-copy">
        <h2 id={titleId}>{COOKIE_NOTICE_TITLE}</h2>
        <p id={descriptionId}>
          <span className="cookie-notice-copy-full">{COOKIE_NOTICE_BODY}</span>
          <span className="cookie-notice-copy-compact">
            {COOKIE_NOTICE_BODY_COMPACT}
          </span>
        </p>
        <div className="cookie-notice-actions">
          <Button type="button" size="sm" onClick={acknowledge}>
            Got it
          </Button>
          <Button
            variant="outline"
            size="sm"
            render={<Link href="/privacy-policy#cookies-and-browser-storage" />}
            onClick={hideForPageSession}
          >
            Cookie details
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              hideForPageSession();
              onOpenSettings();
            }}
          >
            <HugeiconsIcon
              icon={Settings02Icon}
              strokeWidth={2}
              size={14}
              aria-hidden
            />
            Privacy &amp; storage
          </Button>
        </div>
      </div>
    </aside>
  );
}
