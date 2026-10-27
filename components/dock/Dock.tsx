"use client";

import { Search01Icon, TerminalIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { APP_REGISTRY, DOCK_ORDER, type AppId } from "@/lib/registry";

/* =========================================================
   macOS Floating Glass Dock
   Centered bottom capsule with spring hover lift & running dots
   ========================================================= */

export function Dock({
  openIds,
  topAppId,
  onOpen,
  onToggleSpotlight,
  registerAnchor,
}: {
  openIds: Set<AppId>;
  topAppId: AppId | null;
  onOpen: (appId: AppId) => void;
  onToggleSpotlight: () => void;
  registerAnchor: (appId: AppId, el: HTMLElement | null) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="dock-wrap" role="toolbar" aria-label="Application Dock">
      <nav className="dock">
        {/* Spotlight / Launchpad Icon */}
        <button
          type="button"
          className="dock-item"
          onClick={onToggleSpotlight}
          onMouseEnter={() => setHovered("Spotlight Search")}
          onMouseLeave={() => setHovered(null)}
          aria-label="Spotlight Search (⌘Space)"
        >
          <div className="dock-icon-box bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md">
            <HugeiconsIcon icon={Search01Icon} aria-hidden="true" size={22} strokeWidth={2.4} />
          </div>
          {hovered === "Spotlight Search" && (
            <span className="dock-tooltip">Spotlight (⌘Space)</span>
          )}
        </button>

        <div className="dock-sep" aria-hidden />

        {/* Pinned & Running Apps */}
        {DOCK_ORDER.map((appId) => {
          const meta = APP_REGISTRY[appId];
          const isRunning = openIds.has(appId);
          const isActive = topAppId === appId;

          return (
            <button
              key={appId}
              type="button"
              ref={(el) => registerAnchor(appId, el)}
              className="dock-item"
              onClick={() => onOpen(appId)}
              onMouseEnter={() => setHovered(meta.title)}
              onMouseLeave={() => setHovered(null)}
              aria-label={meta.title}
            >
              <div className="dock-icon-box">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={meta.icon} alt="" aria-hidden />
              </div>

              {isRunning && (
                <span className={`dock-dot${isActive ? " is-active" : ""}`} aria-hidden />
              )}

              {hovered === meta.title && <span className="dock-tooltip">{meta.title}</span>}
            </button>
          );
        })}

        <div className="dock-sep" aria-hidden />

        {/* GitHub External Shortcut */}
        <a
          href="https://github.com/prasad-kmd"
          target="_blank"
          rel="noopener noreferrer"
          className="dock-item"
          onMouseEnter={() => setHovered("GitHub Profile")}
          onMouseLeave={() => setHovered(null)}
          aria-label="GitHub Profile"
        >
          <div className="dock-icon-box bg-gradient-to-br from-neutral-700 to-neutral-900 text-white shadow-md">
            <HugeiconsIcon icon={TerminalIcon} aria-hidden="true" size={22} strokeWidth={2.2} />
          </div>
          {hovered === "GitHub Profile" && (
            <span className="dock-tooltip">GitHub Profile</span>
          )}
        </a>
      </nav>
    </div>
  );
}
