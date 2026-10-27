"use client";

import { motion } from "motion/react";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect } from "react";
import { APP_REGISTRY, PINNED_ORDER, type AppId } from "@/lib/registry";
import { FLYOUT_IN } from "@/lib/windows";

/* =========================================================
   Taskbar — 48px acrylic, three zones
   left: apps · centre: Start + search · right: apps
   (no tray, no clock — those live on the status bar)
   ========================================================= */

const HALF = Math.ceil(PINNED_ORDER.length / 2);
const LEFT_APPS = PINNED_ORDER.slice(0, HALF);
const RIGHT_APPS = PINNED_ORDER.slice(HALF);

export function Taskbar({
  openIds,
  topAppId,
  onOpen,
  startOpen,
  onToggleStart,
  registerAnchor,
}: {
  openIds: Set<AppId>;
  topAppId: AppId | null;
  onOpen: (appId: AppId) => void;
  startOpen: boolean;
  onToggleStart: () => void;
  registerAnchor: (appId: AppId, el: HTMLElement | null) => void;
}) {
  // Keep anchors fresh (layout shifts when windows open/close).
  useEffect(() => {
    const onResize = () => window.dispatchEvent(new Event("pm:measure-anchors"));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div className="taskbar" role="toolbar" aria-label="Taskbar">
      <div className="taskbar-zone taskbar-zone-left">
        {LEFT_APPS.map((appId) => (
          <TaskbarApp
            key={appId}
            appId={appId}
            isRunning={openIds.has(appId)}
            isActive={topAppId === appId}
            onOpen={onOpen}
            registerAnchor={registerAnchor}
          />
        ))}
      </div>

      <div className="taskbar-center">
        <motion.button
          type="button"
          className={`taskbar-icon taskbar-start${startOpen ? " is-active" : ""}`}
          onClick={onToggleStart}
          whileTap={{ scale: 0.9 }}
          transition={{ duration: 0.12, ease: [0.2, 0, 0, 1] }}
          aria-label="Start"
          aria-expanded={startOpen}
        >
          <WindowsLogo />
        </motion.button>

        <motion.button
          type="button"
          className="taskbar-icon"
          onClick={onToggleStart}
          whileTap={{ scale: 0.9 }}
          transition={{ duration: 0.12, ease: [0.2, 0, 0, 1] }}
          aria-label="Search"
        >
          <HugeiconsIcon icon={Search01Icon} strokeWidth={2} aria-hidden="true" size={18} />
        </motion.button>
      </div>

      <div className="taskbar-zone taskbar-zone-right">
        {RIGHT_APPS.map((appId) => (
          <TaskbarApp
            key={appId}
            appId={appId}
            isRunning={openIds.has(appId)}
            isActive={topAppId === appId}
            onOpen={onOpen}
            registerAnchor={registerAnchor}
          />
        ))}
      </div>
    </div>
  );
}

function TaskbarApp({
  appId,
  isRunning,
  isActive,
  onOpen,
  registerAnchor,
}: {
  appId: AppId;
  isRunning: boolean;
  isActive: boolean;
  onOpen: (appId: AppId) => void;
  registerAnchor: (appId: AppId, el: HTMLElement | null) => void;
}) {
  const meta = APP_REGISTRY[appId];
  return (
    <motion.button
      type="button"
      ref={(el) => registerAnchor(appId, el)}
      className={`taskbar-icon${isRunning ? " is-running" : ""}${isActive ? " is-active" : ""}`}
      onClick={() => onOpen(appId)}
      whileTap={{ scale: 0.9 }}
      transition={{ duration: 0.12, ease: [0.2, 0, 0, 1] }}
      title={meta.title}
      aria-label={meta.title}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={meta.icon} alt="" aria-hidden />
    </motion.button>
  );
}

function WindowsLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden focusable="false">
      <g fill="currentColor">
        <rect x="1" y="1" width="8.2" height="8.2" rx="0.6" />
        <rect x="10.8" y="1" width="8.2" height="8.2" rx="0.6" />
        <rect x="1" y="10.8" width="8.2" height="8.2" rx="0.6" />
        <rect x="10.8" y="10.8" width="8.2" height="8.2" rx="0.6" />
      </g>
    </svg>
  );
}

export const TASKBAR_MOTION = FLYOUT_IN;
