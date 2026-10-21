"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ExternalLink,
  FileText,
  FolderGit2,
  Mail,
  Moon,
  Palette,
  Search,
  Settings as SettingsIcon,
  Sun,
  Terminal,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useAppearance } from "@/lib/appearance";
import type { AppId } from "@/lib/registry";
import { SPOTLIGHT_IN, SPOTLIGHT_OUT } from "@/lib/windows";

type SpotlightAction = {
  id: string;
  title: string;
  category: "Applications" | "Projects" | "Actions";
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
        icon: <SettingsIcon size={16} />,
        onSelect: () => onOpenApp("settings"),
      },
      {
        id: "app-readme",
        category: "Applications",
        title: "Read Me.txt",
        subtitle: "Welcome notes, bio, and quick links",
        icon: <FileText size={16} />,
        onSelect: () => onOpenApp("notepad"),
      },
      {
        id: "proj-pmeng",
        category: "Projects",
        title: "PMEngineer.lk — Field Platform",
        subtitle: "Civil site management & quantity surveying software",
        icon: <FolderGit2 size={16} />,
        onSelect: () => {
          window.open("https://github.com/prasad-kmd", "_blank");
          toast.success("Opening PMEngineer repository");
        },
      },
      {
        id: "proj-webv3",
        category: "Projects",
        title: "PM Web v3 — Spatial Glass OS",
        subtitle: "Modern macOS / Spatial desktop portfolio built with Next.js 16",
        icon: <FolderGit2 size={16} />,
        onSelect: () => onOpenApp("notepad"),
      },
      {
        id: "act-theme",
        category: "Actions",
        title: `Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`,
        subtitle: "Toggle system appearance",
        icon: theme === "dark" ? <Sun size={16} /> : <Moon size={16} />,
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
        icon: <Palette size={16} />,
        onSelect: () => {
          setWallpaper("hill");
          toast.success("Wallpaper updated to Hill Country");
        },
      },
      {
        id: "act-wall-bloom",
        category: "Actions",
        title: "Set Wallpaper: Spatial Bloom",
        subtitle: "Modern abstract glass flower",
        icon: <Palette size={16} />,
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
        icon: <Terminal size={16} />,
        onSelect: () => window.open("https://github.com/prasad-kmd", "_blank"),
      },
      {
        id: "act-email",
        category: "Actions",
        title: "Copy Email Address",
        subtitle: "prasad.madhuranga@protonmail.com",
        icon: <Mail size={16} />,
        onSelect: () => {
          navigator.clipboard?.writeText("prasad.madhuranga@protonmail.com");
          toast.success("Copied email to clipboard");
        },
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
              <Search size={18} />
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
