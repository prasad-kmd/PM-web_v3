"use client";

import { AnimatePresence, motion } from "framer-motion";
import { APP_REGISTRY, type AppId } from "@/lib/registry";

/* =========================================================
   Bottom Floating Mobile Navbar (inspired by pm-web_v2)
   Center button always stays in the middle.
   Opened app icons appear symmetrically on the left/right.
   ========================================================= */

export function BottomNav({
  openIds,
  topAppId,
  onToggleWindow,
  registerAnchor,
}: {
  openIds: Set<AppId>;
  topAppId: AppId | null;
  onToggleWindow: (appId: AppId) => void;
  registerAnchor: (appId: AppId, el: HTMLElement | null) => void;
}) {
  const isSettingsOpen = openIds.has("settings");
  const isResumeOpen = openIds.has("resume");

  return (
    <div className="bottom-nav-wrap" role="toolbar" aria-label="Bottom Navigation">
      <motion.nav
        layout
        transition={{ type: "spring", stiffness: 450, damping: 32 }}
        className="bottom-nav"
      >
        {/* Left Slot: Settings (when open) */}
        <div className="flex items-center justify-end min-w-0">
          <AnimatePresence mode="popLayout">
            {isSettingsOpen && (
              <motion.button
                key="nav-settings"
                ref={(el) => registerAnchor("settings", el)}
                type="button"
                className={`bottom-nav-btn${topAppId === "settings" ? " is-active" : ""}`}
                onClick={() => onToggleWindow("settings")}
                title={APP_REGISTRY.settings.title}
                aria-label={APP_REGISTRY.settings.title}
                initial={{ opacity: 0, scale: 0.6, x: 10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.6, x: 10 }}
                transition={{ type: "spring", stiffness: 480, damping: 28 }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={APP_REGISTRY.settings.icon} alt="" aria-hidden />
                {topAppId === "settings" && <span className="bottom-nav-dot" aria-hidden />}
              </motion.button>
            )}
          </AnimatePresence>

          {/* Symmetrical placeholder when only Resume is open */}
          {!isSettingsOpen && isResumeOpen && (
            <div className="w-[44px] h-[44px] pointer-events-none opacity-0" aria-hidden />
          )}
        </div>

        {/* Center Anchor Button (Always in the middle, no feature for now) */}
        <motion.button
          layout
          type="button"
          className="bottom-nav-btn bottom-nav-center"
          title="Prasad M."
          aria-label="Profile"
          whileTap={{ scale: 0.94 }}
        >
          {/* Fluent Account / Profile Icon */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/fluent-color/account.svg" alt="" aria-hidden />
        </motion.button>

        {/* Right Slot: Resume (when open) */}
        <div className="flex items-center justify-start min-w-0">
          <AnimatePresence mode="popLayout">
            {isResumeOpen && (
              <motion.button
                key="nav-resume"
                ref={(el) => registerAnchor("resume", el)}
                type="button"
                className={`bottom-nav-btn${topAppId === "resume" ? " is-active" : ""}`}
                onClick={() => onToggleWindow("resume")}
                title={APP_REGISTRY.resume.title}
                aria-label={APP_REGISTRY.resume.title}
                initial={{ opacity: 0, scale: 0.6, x: -10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.6, x: -10 }}
                transition={{ type: "spring", stiffness: 480, damping: 28 }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={APP_REGISTRY.resume.icon} alt="" aria-hidden />
                {topAppId === "resume" && <span className="bottom-nav-dot" aria-hidden />}
              </motion.button>
            )}
          </AnimatePresence>

          {/* Symmetrical placeholder when only Settings is open */}
          {isSettingsOpen && !isResumeOpen && (
            <div className="w-[44px] h-[44px] pointer-events-none opacity-0" aria-hidden />
          )}
        </div>
      </motion.nav>
    </div>
  );
}
