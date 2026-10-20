"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { WALLPAPERS, type Theme, type Wallpaper } from "@/lib/registry";

/* =========================================================
   Appearance — theme / wallpaper / accent
   One provider, persisted to localStorage, mirrored onto <html>
   so CSS custom properties react instantly.
   ========================================================= */

const STORAGE = { theme: "pm-theme", wallpaper: "pm-wallpaper", accent: "pm-accent" } as const;

export const ACCENTS = [
  "#0067c0",
  "#0f6cbd",
  "#8764b8",
  "#d83b01",
  "#107c10",
  "#e3008c",
  "#4cc2ff",
];

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
  const [accent, setAccentState] = useState<string>("#0067c0");

  // Hydrate from storage after mount (the layout script already painted it).
  useEffect(() => {
    setThemeState(readStored<Theme>(STORAGE.theme, "dark", ["light", "dark"]));
    setWallpaperState(
      readStored<Wallpaper>(STORAGE.wallpaper, "hill", Object.keys(WALLPAPERS)),
    );
    setAccentState(readStored<string>(STORAGE.accent, "#0067c0", ACCENTS));
  }, []);

  // Mirror to the document.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      window.localStorage.setItem(STORAGE.theme, theme);
    } catch {
      /* storage unavailable — non fatal */
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-wallpaper", wallpaper);
    try {
      window.localStorage.setItem(STORAGE.wallpaper, wallpaper);
    } catch {
      /* noop */
    }
  }, [wallpaper]);

  useEffect(() => {
    document.documentElement.style.setProperty("--flu-accent", accent);
    document.documentElement.style.setProperty("--flu-accent-soft", `${accent}22`);
    try {
      window.localStorage.setItem(STORAGE.accent, accent);
    } catch {
      /* noop */
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
