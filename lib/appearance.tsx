"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Theme } from "@/lib/registry";
import {
  DEFAULT_WALLPAPER,
  WALLPAPERS,
  type WallpaperId,
} from "@/lib/wallpapers";

const THEME_STORAGE_KEY = "pm-theme";
const WALLPAPER_STORAGE_KEY = "pm-desktop-wallpaper";

type AppearanceValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  wallpaper: WallpaperId;
  setWallpaper: (wallpaper: WallpaperId) => void;
};

const AppearanceContext = createContext<AppearanceValue | null>(null);

function readTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === "light"
      ? "light"
      : "dark";
  } catch {
    return "dark";
  }
}

function readWallpaper(): WallpaperId {
  if (typeof window === "undefined") return DEFAULT_WALLPAPER;
  try {
    const stored = window.localStorage.getItem(WALLPAPER_STORAGE_KEY);
    return (
      WALLPAPERS.find((wallpaper) => wallpaper.id === stored)?.id ??
      DEFAULT_WALLPAPER
    );
  } catch {
    return DEFAULT_WALLPAPER;
  }
}

export function AppearanceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [wallpaper, setWallpaperState] =
    useState<WallpaperId>(DEFAULT_WALLPAPER);

  useEffect(() => {
    setThemeState(readTheme());
    setWallpaperState(readWallpaper());
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Storage is optional; visual preference must never block the workspace.
    }
  }, [theme]);

  useEffect(() => {
    try {
      window.localStorage.setItem(WALLPAPER_STORAGE_KEY, wallpaper);
    } catch {
      // Keep wallpaper selection usable when storage is unavailable.
    }
  }, [wallpaper]);

  const setTheme = useCallback(
    (nextTheme: Theme) => setThemeState(nextTheme),
    [],
  );
  const toggleTheme = useCallback(
    () => setThemeState((current) => (current === "dark" ? "light" : "dark")),
    [],
  );
  const setWallpaper = useCallback((nextWallpaper: WallpaperId) => {
    setWallpaperState(
      WALLPAPERS.some((option) => option.id === nextWallpaper)
        ? nextWallpaper
        : DEFAULT_WALLPAPER,
    );
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme, wallpaper, setWallpaper }),
    [setTheme, setWallpaper, theme, toggleTheme, wallpaper],
  );

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance(): AppearanceValue {
  const context = useContext(AppearanceContext);
  if (!context)
    throw new Error("useAppearance must be used inside <AppearanceProvider>");
  return context;
}
