"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  ChevronRightIcon,
  PowerIcon,
  Search01Icon,
  SunMoonIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useAppearance } from "@/lib/appearance";
import {
  APP_REGISTRY,
  PINNED_ORDER,
  RECOMMENDED,
  type AppId,
} from "@/lib/registry";
import { FLYOUT_IN, FLYOUT_OUT } from "@/lib/windows";

/* =========================================================
   Start — acrylic panel, pinned / recommended / all apps
   Open & close use a single expo curve so it reads as one
   continuous motion (matches the win11React reference).
   ========================================================= */

const ALL_APPS = (Object.keys(APP_REGISTRY) as AppId[])
  .filter((id) => !APP_REGISTRY[id].adminOnly)
  .sort((a, b) => APP_REGISTRY[a].title.localeCompare(APP_REGISTRY[b].title));

export function StartMenu({
  open,
  onClose,
  onOpenApp,
}: {
  open: boolean;
  onClose: () => void;
  onOpenApp: (appId: AppId) => void;
}) {
  const [query, setQuery] = useState("");
  const [allApps, setAllApps] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { theme, toggleTheme } = useAppearance();

  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 120);
      return () => window.clearTimeout(t);
    }
    setQuery("");
    setAllApps(false);
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_APPS;
    return ALL_APPS.filter(
      (id) =>
        APP_REGISTRY[id].title.toLowerCase().includes(q) ||
        APP_REGISTRY[id].description.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="start-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.section
            className="start-panel"
            role="dialog"
            aria-label="Start"
            initial={{ opacity: 0, y: 26, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={open ? FLYOUT_IN : FLYOUT_OUT}
          >
            <div className="start-search-wrap">
              <label className="start-search">
                <HugeiconsIcon
                  icon={Search01Icon}
                  strokeWidth={2}
                  aria-hidden="true"
                />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search apps and settings"
                  aria-label="Search"
                />
              </label>
            </div>

            <div className="start-content">
              {!query && !allApps && (
                <>
                  <div className="start-section-head">
                    <h2>Pinned</h2>
                    <button
                      type="button"
                      className="start-more-btn"
                      onClick={() => setAllApps(true)}
                    >
                      All apps{" "}
                      <HugeiconsIcon
                        icon={ChevronRightIcon}
                        strokeWidth={2}
                        aria-hidden="true"
                        size={12}
                      />
                    </button>
                  </div>

                  <div className="pinned-grid">
                    {PINNED_ORDER.map((appId, i) => (
                      <motion.button
                        key={appId}
                        type="button"
                        className="pinned-tile"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ ...FLYOUT_IN, delay: 0.03 + i * 0.025 }}
                        onClick={() => onOpenApp(appId)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={APP_REGISTRY[appId].icon}
                          alt=""
                          aria-hidden
                        />
                        <span>{APP_REGISTRY[appId].title}</span>
                      </motion.button>
                    ))}
                  </div>

                  <div className="start-section-head mt-2">
                    <h2>Recommended</h2>
                  </div>
                  <div className="recommended-grid">
                    {RECOMMENDED.map((item, i) => (
                      <motion.button
                        key={item.appId}
                        type="button"
                        className="recommended-item"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ ...FLYOUT_IN, delay: 0.09 + i * 0.025 }}
                        onClick={() => onOpenApp(item.appId)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={APP_REGISTRY[item.appId].icon}
                          alt=""
                          aria-hidden
                        />
                        <span className="recommended-copy">
                          <strong>{APP_REGISTRY[item.appId].title}</strong>
                          <small>{item.subtitle}</small>
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </>
              )}

              {(query || allApps) && (
                <>
                  <div className="start-section-head">
                    <h2>{query ? "Results" : "All apps"}</h2>
                    {allApps && !query && (
                      <button
                        type="button"
                        className="start-more-btn"
                        onClick={() => setAllApps(false)}
                      >
                        Back
                      </button>
                    )}
                  </div>

                  <div className="all-apps-list">
                    {results.length === 0 && (
                      <p className="text-xs text-[var(--muted-ink)] px-3 py-6 text-center">
                        No matches for “{query}”.
                      </p>
                    )}
                    {results.map((appId, i) => (
                      <motion.button
                        key={appId}
                        type="button"
                        className="all-apps-item"
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          ...FLYOUT_IN,
                          delay: Math.min(i * 0.02, 0.12),
                        }}
                        onClick={() => onOpenApp(appId)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={APP_REGISTRY[appId].icon}
                          alt=""
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-medium truncate">
                            {APP_REGISTRY[appId].title}
                          </span>
                          <span className="all-apps-kind">
                            {APP_REGISTRY[appId].kind}
                          </span>
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <footer className="start-footer">
              <div className="profile-chip">
                <span className="profile-avatar">PM</span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold leading-tight">
                    Prasad M.
                  </span>
                  <span className="block text-[10px] text-[var(--muted-ink)] leading-tight">
                    Kandy, LK
                  </span>
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="power-btn"
                  onClick={toggleTheme}
                  title={
                    theme === "dark" ? "Switch to light" : "Switch to dark"
                  }
                  aria-label="Toggle theme"
                >
                  <HugeiconsIcon
                    icon={SunMoonIcon}
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                </button>
                <button
                  type="button"
                  className="power-btn"
                  onClick={() => {
                    toast.info(
                      "Sign out is a demo action in this portfolio shell.",
                    );
                    onClose();
                  }}
                  title="Power"
                  aria-label="Power"
                >
                  <HugeiconsIcon
                    icon={PowerIcon}
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                </button>
              </div>
            </footer>
          </motion.section>
        </>
      )}
    </AnimatePresence>
  );
}
