"use client";

import { AnimatePresence } from "motion/react";
import { Notification01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef, useState } from "react";
import { useClock } from "@/hooks/useClock";
import { CalendarFlyout } from "./CalendarFlyout";
import { NotificationsFlyout, type Notification } from "./NotificationsFlyout";

/* =========================================================
   Status bar — top of screen, Ubuntu / macOS style
   left: user · focused app · app menus
   right: notifications · clock (calendar opens here)
   ========================================================= */

const APP_MENUS = ["File", "Edit", "View", "Help"];

const SEED: Notification[] = [
  {
    id: "n1",
    app: "Resume",
    title: "Welcome to the workspace",
    body: "Open Settings to switch theme, accent, or wallpaper.",
    time: "now",
  },
  {
    id: "n2",
    app: "Desktop",
    title: "Wallpaper set to Hill Country",
    body: "Your choice is remembered on this device.",
    time: "2m",
  },
];

export function StatusBar({ focusedTitle }: { focusedTitle: string | null }) {
  const { time, seconds, date } = useClock();
  const [flyout, setFlyout] = useState<"calendar" | "notifications" | null>(null);
  const [items, setItems] = useState<Notification[]>(SEED);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!flyout) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setFlyout(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFlyout(null);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [flyout]);

  const unread = items.length;

  return (
    <>
      <div className="status-bar" ref={rootRef} role="menubar" aria-label="Status bar">
        <div className="status-left">
          <span className="status-user">Prasad M.</span>
          {focusedTitle && (
            <>
              <span className="status-sep" aria-hidden />
              <span className="status-app">{focusedTitle}</span>
              <nav className="status-menus" aria-label="App menus">
                {APP_MENUS.map((m) => (
                  <span key={m} className="status-menu">
                    {m}
                  </span>
                ))}
              </nav>
            </>
          )}
        </div>

        <div className="status-right">
          <button
            type="button"
            className={`status-btn${flyout === "notifications" ? " is-active" : ""}`}
            onClick={() => setFlyout((f) => (f === "notifications" ? null : "notifications"))}
            aria-label="Notifications"
            aria-expanded={flyout === "notifications"}
          >
            <HugeiconsIcon icon={Notification01Icon} strokeWidth={2} aria-hidden="true" size={13} />
            {unread > 0 && <span className="status-badge">{unread}</span>}
          </button>

          <span className="status-sep" aria-hidden />

          <button
            type="button"
            className={`status-btn status-clock${flyout === "calendar" ? " is-active" : ""}`}
            onClick={() => setFlyout((f) => (f === "calendar" ? null : "calendar"))}
            aria-label="Calendar"
            aria-expanded={flyout === "calendar"}
          >
            <span className="status-date">{date}</span>
            <time className="status-time">{time}</time>
            <span className="status-seconds" aria-hidden>
              :{seconds}
            </span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {flyout === "calendar" && <CalendarFlyout />}
        {flyout === "notifications" && (
          <NotificationsFlyout
            items={items}
            onClear={() => setItems([])}
            onDismiss={(id) => setItems((list) => list.filter((n) => n.id !== id))}
          />
        )}
      </AnimatePresence>
    </>
  );
}
