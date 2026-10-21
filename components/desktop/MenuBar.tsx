"use client";

import { Moon, Sun } from "lucide-react";
import { useClock } from "@/hooks/useClock";
import { useAppearance } from "@/lib/appearance";

const APP_MENUS = ["File", "Edit", "View", "Window", "Help"];

export function MenuBar({
  focusedTitle,
  onOpenSettings,
}: {
  focusedTitle: string | null;
  onOpenSettings: () => void;
}) {
  const { formatted } = useClock();
  const { theme, toggleTheme } = useAppearance();

  const activeApp = focusedTitle ?? "Prasad M.";

  return (
    <header className="menu-bar" role="menubar" aria-label="Menu bar">
      <div className="menu-bar-left">
        {/* Personal Monogram Brand Icon */}
        <button
          type="button"
          className="menu-bar-logo"
          onClick={onOpenSettings}
          title="Settings"
          aria-label="Settings"
        >
          ⌘
        </button>

        <span className="menu-bar-item menu-bar-app-name">{activeApp}</span>

        <nav className="flex items-center gap-0.5" aria-label="Application menus">
          {APP_MENUS.map((m) => (
            <span key={m} className="menu-bar-item hidden sm:inline-flex">
              {m}
            </span>
          ))}
        </nav>
      </div>

      <div className="menu-bar-right">
        {/* Theme Quick Toggle */}
        <button
          type="button"
          className="menu-bar-icon-btn"
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label="Toggle Theme"
        >
          {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
        </button>

        {/* Live Date & Time: YYYY-MM-DD , hh:MM A/PM */}
        <div className="menu-bar-item menu-bar-clock">
          <span>{formatted}</span>
        </div>
      </div>
    </header>
  );
}
