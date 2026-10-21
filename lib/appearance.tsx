"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { WALLPAPERS, type Theme, type Wallpaper } from "@/lib/registry";

/* =========================================================
   Appearance Provider — Spatial Glass OS
   System Theme (Light / Dark), Accent Color, Wallpaper
   ========================================================= */

const STORAGE = {
  theme: "pm-theme",
  wallpaper: "pm-wallpaper",
  accent: "pm-accent",
} as const;

export const ACCENTS = [
  { id: "blue", label: "Blue", color: "#0071e3" },
  { id: "purple", label: "Purple", color: "#af52de" },
  { id: "pink", label: "Pink", color: "#ff2d55" },
  { id: "red", label: "Red", color: "#ff3b30" },
  { id: "orange", label: "Orange", color: "#ff9500" },
  { id: "yellow", label: "Yellow", color: "#ffcc00" },
  { id: "green", label: "Green", color: "#34c759" },
  { id: "graphite", label: "Graphite", color: "#8e8e93" },
] as const;

type AppearanceValue = {
  theme: Theme;
  wallpaper: Wallpaper;
  accent: string;
  setTheme: (t: Theme) => void;
  setWallpaper: (w: Wallpaper) => void;
  setAccent: (a: string) => void;
  toggleTheme: () => void;
};

const AppearanceContext = createContext<AppearanceValue | null>(null);

function readStored<T extends string>(key: string, fallback: T, valid: readonly string[]): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw && valid.includes(raw) ? (raw as T) : fallback;
  } catch {
    return fallback;
  }
}

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [wallpaper, setWallpaperState] = useState<Wallpaper>("hill");
  const [accent, setAccentState] = useState<string>("#0071e3");

  useEffect(() => {
    setThemeState(readStored<Theme>(STORAGE.theme, "dark", ["light", "dark"]));
    setWallpaperState(readStored<Wallpaper>(STORAGE.wallpaper, "hill", Object.keys(WALLPAPERS)));
    setAccentState(
      readStored<string>(
        STORAGE.accent,
        "#0071e3",
        ACCENTS.map((a) => a.color),
      ),
    );
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      window.localStorage.setItem(STORAGE.theme, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-wallpaper", wallpaper);
    try {
      window.localStorage.setItem(STORAGE.wallpaper, wallpaper);
    } catch {
      /* ignore */
    }
  }, [wallpaper]);

  useEffect(() => {
    document.documentElement.style.setProperty("--sys-accent", accent);
    document.documentElement.style.setProperty("--sys-accent-soft", `${accent}24`);
    // Backward compatibility for existing selectors
    document.documentElement.style.setProperty("--flu-accent", accent);
    document.documentElement.style.setProperty("--flu-accent-soft", `${accent}24`);
    try {
      window.localStorage.setItem(STORAGE.accent, accent);
    } catch {
      /* ignore */
    }
  }, [accent]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const setWallpaper = useCallback((w: Wallpaper) => setWallpaperState(w), []);
  const setAccent = useCallback((a: string) => setAccentState(a), []);
  const toggleTheme = useCallback(
    () => setThemeState((t) => (t === "dark" ? "light" : "dark")),
    [],
  );

  const value = useMemo(
    () => ({ theme, wallpaper, accent, setTheme, setWallpaper, setAccent, toggleTheme }),
    [theme, wallpaper, accent, setTheme, setWallpaper, setAccent, toggleTheme],
  );

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance(): AppearanceValue {
  const ctx = useContext(AppearanceContext);
  if (!ctx) throw new Error("useAppearance must be used inside <AppearanceProvider>");
  return ctx;
}
