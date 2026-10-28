"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  FileTextIcon,
  Mail01Icon,
  Moon01Icon,
  PaletteIcon,
  Search01Icon,
  Settings02Icon,
  Sun01Icon,
  TerminalIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useAppearance } from "@/lib/appearance";
import type { AppId } from "@/lib/registry";
import { SPOTLIGHT_IN, SPOTLIGHT_OUT } from "@/lib/windows";

type SpotlightAction = {
  id: string;
  title: string;
  category: "Applications" | "Actions";
  subtitle: string;
  icon: React.ReactNode;
  onSelect: () => void;
};

export function Spotlight({
  open,
  onClose,
  onOpenApp,
}: {
  open: boolean;
  onClose: () => void;
  onOpenApp: (appId: AppId) => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { theme, toggleTheme, setWallpaper } = useAppearance();

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIdx(0);
      const t = window.setTimeout(() => inputRef.current?.focus(), 60);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  const actions: SpotlightAction[] = useMemo(
    () => [
      {
        id: "app-settings",
        category: "Applications",
        title: "System Settings",
        subtitle: "Personalize theme, accent color, and wallpaper",
        icon: <HugeiconsIcon icon={Settings02Icon} strokeWidth={2} aria-hidden="true" size={16} />,
        onSelect: () => onOpenApp("settings"),
      },
      {
        id: "app-resume",
        category: "Applications",
        title: "Resume",
        subtitle: "Profile, experience, education, interests, and languages",
        icon: <HugeiconsIcon icon={FileTextIcon} strokeWidth={2} aria-hidden="true" size={16} />,
        onSelect: () => onOpenApp("resume"),
      },
      {
        id: "act-theme",
        category: "Actions",
        title: `Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`,
        subtitle: "Toggle system appearance",
        icon: theme === "dark" ? <HugeiconsIcon icon={Sun01Icon} strokeWidth={2} aria-hidden="true" size={16} /> : <HugeiconsIcon icon={Moon01Icon} strokeWidth={2} aria-hidden="true" size={16} />,
        onSelect: () => {
          toggleTheme();
          toast.success(`Switched to ${theme === "dark" ? "light" : "dark"} mode`);
        },
      },
      {
        id: "act-wall-hill",
        category: "Actions",
        title: "Set Wallpaper: Hill Country (Kandy)",
        subtitle: "Scenic Central Province landscape",
        icon: <HugeiconsIcon icon={PaletteIcon} strokeWidth={2} aria-hidden="true" size={16} />,
        onSelect: () => {
          setWallpaper("hill-country");
          toast.success("Wallpaper updated to Hill Country");
        },
      },
      {
        id: "act-wall-bloom",
        category: "Actions",
        title: "Set Wallpaper: Bloom",
        subtitle: "Glossy flowing ribbon sculpture",
        icon: <HugeiconsIcon icon={PaletteIcon} strokeWidth={2} aria-hidden="true" size={16} />,
        onSelect: () => {
          setWallpaper("bloom");
          toast.success("Wallpaper updated to Spatial Bloom");
        },
      },
      {
        id: "act-github",
        category: "Actions",
        title: "GitHub Profile",
        subtitle: "github.com/prasad-kmd",
        icon: <HugeiconsIcon icon={TerminalIcon} strokeWidth={2} aria-hidden="true" size={16} />,
        onSelect: () => window.open("https://github.com/prasad-kmd", "_blank"),
      },
      {
        id: "act-contact",
        category: "Actions",
        title: "Contact Prasad",
        subtitle: "Send a message or get the email address",
        icon: <HugeiconsIcon icon={Mail01Icon} strokeWidth={2} aria-hidden="true" size={16} />,
        onSelect: () => onOpenApp("contact"),
      },
    ],
    [onOpenApp, setWallpaper, theme, toggleTheme],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.subtitle.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q),
    );
  }, [actions, query]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((prev) => (prev + 1) % Math.max(1, filtered.length));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
      }
      if (e.key === "Enter" && filtered[selectedIdx]) {
        e.preventDefault();
        filtered[selectedIdx].onSelect();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filtered, onClose, open, selectedIdx]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="spotlight-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
            onClick={onClose}
            aria-hidden
          />

          <motion.div
            className="spotlight-panel"
            role="dialog"
            aria-label="Spotlight Search"
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -6 }}
            transition={open ? SPOTLIGHT_IN : SPOTLIGHT_OUT}
          >
            <div className="spotlight-search-wrap">
              <HugeiconsIcon icon={Search01Icon} strokeWidth={2} aria-hidden="true" size={18} />
              <input
                ref={inputRef}
                className="spotlight-input"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIdx(0);
                }}
                placeholder="Spotlight Search"
                aria-label="Spotlight Search"
              />
            </div>

            <div className="spotlight-results">
              {filtered.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--muted-ink)]">
                  No matching items found for “{query}”
                </div>
              ) : (
                filtered.map((item, i) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`spotlight-item${selectedIdx === i ? " is-selected" : ""}`}
                    onClick={() => {
                      item.onSelect();
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIdx(i)}
                  >
                    <div className="spotlight-item-icon">{item.icon}</div>
                    <div className="min-w-0 flex-1">
                      <div className="spotlight-item-title">{item.title}</div>
                      <div className="spotlight-item-sub">{item.subtitle}</div>
                    </div>
                  </button>
                ))
              )}
            </div>

            <footer className="spotlight-footer">
              <span>
                Use <kbd>↑</kbd> <kbd>↓</kbd> to navigate, <kbd>↵</kbd> to select
              </span>
              <span>
                <kbd>esc</kbd> to dismiss
              </span>
            </footer>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
