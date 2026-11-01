"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  COOKIE_SLIDESHOW_ENABLED,
  COOKIE_SLIDESHOW_INTERVAL,
  COOKIE_THEME,
  COOKIE_WALLPAPER,
  COOKIE_WALLPAPER_INTENSITY,
  getClientCookie,
  setClientCookie,
} from "@/lib/cookies";
import type { Theme } from "@/lib/registry";
import {
  DEFAULT_SLIDESHOW_INTERVAL,
  DEFAULT_WALLPAPER,
  DEFAULT_WALLPAPER_INTENSITY,
  getNextWallpaperId,
  getWallpaper,
  isWallpaperId,
  resolveSlideshowInterval,
  resolveWallpaperId,
  resolveWallpaperIntensity,
  type SlideshowIntervalSec,
  type WallpaperId,
  type WallpaperIntensity,
} from "@/lib/wallpapers";

export type InitialAppearance = {
  theme: Theme;
  wallpaper: WallpaperId;
  wallpaperIntensity: WallpaperIntensity;
  slideshowEnabled: boolean;
  slideshowInterval: SlideshowIntervalSec;
};

type AppearanceValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  wallpaper: WallpaperId;
  setWallpaper: (wallpaper: string) => void;
  nextWallpaper: () => void;
  wallpaperIntensity: WallpaperIntensity;
  setWallpaperIntensity: (intensity: WallpaperIntensity) => void;
  slideshowEnabled: boolean;
  setSlideshowEnabled: (enabled: boolean) => void;
  slideshowInterval: SlideshowIntervalSec;
  setSlideshowInterval: (interval: SlideshowIntervalSec) => void;
};

const AppearanceContext = createContext<AppearanceValue | null>(null);

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

function readStoredPreference(name: string): string | null {
  const fromCookie = getClientCookie(name);
  if (fromCookie !== null) return fromCookie;
  try {
    return window.localStorage.getItem(name);
  } catch {
    return null;
  }
}

function persistTheme(nextTheme: Theme) {
  setClientCookie(COOKIE_THEME, nextTheme);
  try {
    window.localStorage.setItem(COOKIE_THEME, nextTheme);
  } catch {
    // Optional mirror for client fallback.
  }
}

function persistWallpaper(nextWallpaper: WallpaperId) {
  setClientCookie(COOKIE_WALLPAPER, nextWallpaper);
  try {
    window.localStorage.setItem(COOKIE_WALLPAPER, nextWallpaper);
  } catch {
    // Optional mirror for client fallback.
  }
}

function persistIntensity(nextIntensity: WallpaperIntensity) {
  setClientCookie(COOKIE_WALLPAPER_INTENSITY, nextIntensity);
  try {
    window.localStorage.setItem(COOKIE_WALLPAPER_INTENSITY, nextIntensity);
  } catch {
    // Optional mirror for client fallback.
  }
}

function persistSlideshowEnabled(enabled: boolean) {
  const serialized = enabled ? "1" : "0";
  setClientCookie(COOKIE_SLIDESHOW_ENABLED, serialized);
  try {
    window.localStorage.setItem(COOKIE_SLIDESHOW_ENABLED, serialized);
  } catch {
    // Optional mirror for client fallback.
  }
}

function persistSlideshowInterval(interval: SlideshowIntervalSec) {
  const serialized = String(interval);
  setClientCookie(COOKIE_SLIDESHOW_INTERVAL, serialized);
  try {
    window.localStorage.setItem(COOKIE_SLIDESHOW_INTERVAL, serialized);
  } catch {
    // Optional mirror for client fallback.
  }
}

export function AppearanceProvider({
  children,
  initialAppearance,
}: {
  children: React.ReactNode;
  initialAppearance?: Partial<InitialAppearance>;
}) {
  const [theme, setThemeState] = useState<Theme>(
    initialAppearance?.theme === "light" ? "light" : "dark",
  );
  const [wallpaper, setWallpaperState] = useState<WallpaperId>(
    initialAppearance?.wallpaper
      ? resolveWallpaperId(initialAppearance.wallpaper)
      : DEFAULT_WALLPAPER,
  );
  const [wallpaperIntensity, setWallpaperIntensityState] =
    useState<WallpaperIntensity>(
      initialAppearance?.wallpaperIntensity
        ? resolveWallpaperIntensity(initialAppearance.wallpaperIntensity)
        : DEFAULT_WALLPAPER_INTENSITY,
    );
  const [slideshowEnabled, setSlideshowEnabledState] = useState<boolean>(
    initialAppearance?.slideshowEnabled ?? false,
  );
  const [slideshowInterval, setSlideshowIntervalState] =
    useState<SlideshowIntervalSec>(
      initialAppearance?.slideshowInterval
        ? resolveSlideshowInterval(initialAppearance.slideshowInterval)
        : DEFAULT_SLIDESHOW_INTERVAL,
    );
  const hydratedPrefsRef = useRef(false);

  // Synchronously reconcile saved preferences from cookies / localStorage
  // before the browser's first paint after hydration, keeping RootLayout 100%
  // static without hydration mismatches or theme/wallpaper flashes.
  useIsomorphicLayoutEffect(() => {
    try {
      const rawTheme = readStoredPreference(COOKIE_THEME);
      const nextTheme: Theme = rawTheme === "light" ? "light" : "dark";
      setThemeState(nextTheme);
      if (!getClientCookie(COOKIE_THEME) && rawTheme === "light") {
        persistTheme("light");
      }

      const rawWall = readStoredPreference(COOKIE_WALLPAPER);
      const nextWall = isWallpaperId(rawWall) ? rawWall : DEFAULT_WALLPAPER;
      setWallpaperState(nextWall);
      if (!getClientCookie(COOKIE_WALLPAPER)) {
        persistWallpaper(nextWall);
      }

      const rawIntensity = readStoredPreference(COOKIE_WALLPAPER_INTENSITY);
      const nextIntensity = resolveWallpaperIntensity(rawIntensity);
      setWallpaperIntensityState(nextIntensity);
      if (!getClientCookie(COOKIE_WALLPAPER_INTENSITY) && rawIntensity) {
        persistIntensity(nextIntensity);
      }

      const rawSlideshow = readStoredPreference(COOKIE_SLIDESHOW_ENABLED);
      if (rawSlideshow === "1" || rawSlideshow === "0") {
        const enabled = rawSlideshow === "1";
        setSlideshowEnabledState(enabled);
        if (!getClientCookie(COOKIE_SLIDESHOW_ENABLED)) {
          persistSlideshowEnabled(enabled);
        }
      }

      const rawInterval = readStoredPreference(COOKIE_SLIDESHOW_INTERVAL);
      if (rawInterval) {
        const resolvedInterval = resolveSlideshowInterval(rawInterval);
        setSlideshowIntervalState(resolvedInterval);
        if (!getClientCookie(COOKIE_SLIDESHOW_INTERVAL)) {
          persistSlideshowInterval(resolvedInterval);
        }
      }

      document.documentElement.classList.toggle("dark", nextTheme === "dark");
      document.documentElement.style.colorScheme = nextTheme;
      document.documentElement.dataset.wallpaperIntensity = nextIntensity;
    } catch {
      // Storage access is optional.
    } finally {
      hydratedPrefsRef.current = true;
    }
  }, []);

  // Keep <html> attributes synchronized with live theme and wallpaper intensity.
  useEffect(() => {
    if (!hydratedPrefsRef.current) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    if (!hydratedPrefsRef.current) return;
    document.documentElement.dataset.wallpaperIntensity = wallpaperIntensity;
  }, [wallpaperIntensity]);

  // Preload the next wallpaper whenever slideshow is active so transitions never flash.
  useEffect(() => {
    if (!slideshowEnabled || typeof window === "undefined") return;
    const nextOption = getWallpaper(getNextWallpaperId(wallpaper));
    const preload = new window.Image();
    preload.src = nextOption.src;
  }, [slideshowEnabled, wallpaper]);

  // Wallpaper slideshow engine (pauses automatically while tab is hidden).
  useEffect(() => {
    if (!slideshowEnabled || typeof window === "undefined") return;

    let timerId: number | null = null;

    const tick = () => {
      if (document.hidden) return;
      setWallpaperState((current) => {
        const next = getNextWallpaperId(current);
        persistWallpaper(next);
        return next;
      });
    };

    const start = () => {
      if (timerId !== null) window.clearInterval(timerId);
      timerId = null;
      if (document.hidden) return;
      timerId = window.setInterval(tick, slideshowInterval * 1000);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        if (timerId !== null) {
          window.clearInterval(timerId);
          timerId = null;
        }
      } else {
        start();
      }
    };

    start();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (timerId !== null) window.clearInterval(timerId);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [slideshowEnabled, slideshowInterval]);

  const setTheme = useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme);
    persistTheme(nextTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next = current === "dark" ? "light" : "dark";
      persistTheme(next);
      return next;
    });
  }, []);

  const setWallpaper = useCallback((nextWallpaper: string) => {
    const resolved = resolveWallpaperId(nextWallpaper);
    setWallpaperState(resolved);
    persistWallpaper(resolved);
  }, []);

  const nextWallpaper = useCallback(() => {
    setWallpaperState((current) => {
      const next = getNextWallpaperId(current);
      persistWallpaper(next);
      return next;
    });
  }, []);

  const setWallpaperIntensity = useCallback(
    (nextIntensity: WallpaperIntensity) => {
      const resolved = resolveWallpaperIntensity(nextIntensity);
      setWallpaperIntensityState(resolved);
      persistIntensity(resolved);
    },
    [],
  );

  const setSlideshowEnabled = useCallback((enabled: boolean) => {
    setSlideshowEnabledState(enabled);
    persistSlideshowEnabled(enabled);
  }, []);

  const setSlideshowInterval = useCallback((interval: SlideshowIntervalSec) => {
    const resolved = resolveSlideshowInterval(interval);
    setSlideshowIntervalState(resolved);
    persistSlideshowInterval(resolved);
  }, []);

  const value = useMemo<AppearanceValue>(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      wallpaper,
      setWallpaper,
      nextWallpaper,
      wallpaperIntensity,
      setWallpaperIntensity,
      slideshowEnabled,
      setSlideshowEnabled,
      slideshowInterval,
      setSlideshowInterval,
    }),
    [
      nextWallpaper,
      setSlideshowEnabled,
      setSlideshowInterval,
      setTheme,
      setWallpaper,
      setWallpaperIntensity,
      slideshowEnabled,
      slideshowInterval,
      theme,
      toggleTheme,
      wallpaper,
      wallpaperIntensity,
    ],
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
