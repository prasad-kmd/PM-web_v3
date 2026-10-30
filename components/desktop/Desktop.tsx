"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useShouldReduceMotion } from "@animate-ui/react/utils/motion";
import { Toaster } from "sonner";
import {
  AdminAuthProvider,
  useAdminAuth,
} from "@/components/admin/AdminAuthProvider";
import { WorkstationLockCurtain } from "@/components/admin/WorkstationLockCurtain";
import { CommandPalette } from "@/components/command/CommandPalette";
import { CookieNotice } from "@/components/legal/CookieNotice";
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";
import { WindowsLayer } from "@/components/window/WindowsLayer";
import { useWindowManager, type WindowState } from "@/hooks/useWindowManager";
import { useAppearance } from "@/lib/appearance";
import {
  APP_REGISTRY,
  getAppIdFromPathname,
  getDocumentTitleForApp,
  getPathnameForApp,
  isAdminOnlyApp,
  usesRouteContent,
  type AppId,
} from "@/lib/registry";
import { requestSettingsSection } from "@/lib/settings-navigation";
import { getWallpaper } from "@/lib/wallpapers";
import { CONTENT_TYPES } from "@/lib/content-types";
import { BootSequence } from "@/components/system/BootSequence";
import { LoadingView } from "@/components/system/states/LoadingView";
import type { Area } from "@/lib/windows";
import { DesktopContextMenuContent } from "./ContextMenu";
import { DesktopIcons } from "./DesktopIcons";
import { MenuBar } from "./MenuBar";
import { ProfileWidget } from "./ProfileWidget";

const MOBILE_WINDOW_MEDIA =
  "(max-width: 768px), (hover: none) and (pointer: coarse)";

const WALLPAPER_CROSSFADE = {
  duration: 0.65,
  ease: [0.23, 1, 0.32, 1] as const,
};

function useMobileWindowMode() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(MOBILE_WINDOW_MEDIA);
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isMobile;
}

/**
 * Handles owner studio hotkeys (`⌘⇧L`, `⌘⇧G`, `⌘⇧I`) and protects direct URL
 * visits or Back/Forward entries to `/og-studio` and `/invoices` when signed out:
 * closes the restricted window, prompts sign-in on the lock curtain, and
 * reopens the requested studio automatically upon unlock.
 */
function AdminWorkspaceBridge({
  windows,
  onOpenApp,
  onCloseAdminWindows,
}: {
  windows: WindowState[];
  onOpenApp: (appId: AppId) => void;
  onCloseAdminWindows: () => void;
}) {
  const { authenticated, ready, lockOpen, openLockCurtain, closeLockCurtain } =
    useAdminAuth();
  const pendingProtectedAppRef = useRef<AppId | null>(null);

  useEffect(() => {
    if (!ready) return;

    if (!authenticated) {
      const activeProtected = windows
        .filter((w) => !w.exiting && isAdminOnlyApp(w.appId))
        .sort((a, b) => b.z - a.z)[0];

      if (activeProtected) {
        pendingProtectedAppRef.current = activeProtected.appId;
        onCloseAdminWindows();
        openLockCurtain();
      }
      return;
    }

    if (pendingProtectedAppRef.current) {
      const target = pendingProtectedAppRef.current;
      pendingProtectedAppRef.current = null;
      onOpenApp(target);
    }
  }, [
    authenticated,
    onCloseAdminWindows,
    onOpenApp,
    openLockCurtain,
    ready,
    windows,
  ]);

  useEffect(() => {
    if (!lockOpen && !authenticated) {
      pendingProtectedAppRef.current = null;
    }
  }, [authenticated, lockOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || !event.shiftKey) return;
      const key = event.key.toLowerCase();
      if (key === "l") {
        event.preventDefault();
        if (!authenticated) {
          if (lockOpen) closeLockCurtain();
          else openLockCurtain();
        }
      } else if (authenticated && key === "g") {
        event.preventDefault();
        onOpenApp("og-studio");
      } else if (authenticated && key === "i") {
        event.preventDefault();
        onOpenApp("invoices");
      } else if (authenticated && key === "a") {
        event.preventDefault();
        onOpenApp("insights");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [authenticated, closeLockCurtain, lockOpen, onOpenApp, openLockCurtain]);

  return null;
}

export function Desktop({ children }: { children?: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [area, setArea] = useState<Area>({ w: 1280, h: 720, left: 0, top: 40 });
  const [contextTarget, setContextTarget] = useState<{
    link: string | null;
    image: string | null;
  }>({ link: null, image: null });
  const workRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const search = useSearchParams().toString();
  const routeApp = getAppIdFromPathname(pathname);
  const [snapshots, setSnapshots] = useState<
    Partial<Record<AppId, HTMLElement>>
  >({});
  const captureSnapshot = useCallback(
    (appId: AppId, node: HTMLElement) =>
      setSnapshots((current) => ({ ...current, [appId]: node })),
    [],
  );
  const routePaths = useRef<Partial<Record<AppId, string>>>({});
  const [launchingCollection, setLaunchingCollection] = useState<AppId | null>(
    null,
  );
  const shouldReduceMotion = useShouldReduceMotion();
  const { wallpaper, wallpaperIntensity } = useAppearance();
  const currentWallpaper = getWallpaper(wallpaper);

  const isMobileWindowMode = useMobileWindowMode();
  const manager = useWindowManager(area, isMobileWindowMode);
  const { open, closeApp, syncToRoute, topAppId } = manager;

  const initializedRef = useRef(false);
  const handlingRouteChangeRef = useRef(false);
  const expectedRouteAppRef = useRef<AppId | null>(null);
  const lastSyncedAppRef = useRef<AppId | null>(null);
  const currentTopAppRef = useRef<AppId | null>(topAppId);
  currentTopAppRef.current = topAppId;

  const openApp = useCallback(
    (appId: AppId) => {
      const isCollection = CONTENT_TYPES.some((type) => type === appId);
      const isAlreadyOpen = manager.windows.some(
        (windowState) => windowState.appId === appId && !windowState.exiting,
      );

      if (isCollection && !isAlreadyOpen) {
        // Route memory belongs to a live window, not its desktop shortcut. A
        // closed (or closing) collection always launches at its canonical index.
        const listingPath = getPathnameForApp(appId);
        routePaths.current[appId] = listingPath;
        setSnapshots((current) => {
          if (!current[appId]) return current;
          const next = { ...current };
          delete next[appId];
          return next;
        });
        setLaunchingCollection(appId);
        expectedRouteAppRef.current = appId;
        handlingRouteChangeRef.current = true;
        lastSyncedAppRef.current = appId;
        open(appId);
        // Navigate explicitly: app identity may be unchanged when reopening
        // during the exit animation, so the focus-sync effect may not run.
        router.push(listingPath, { scroll: false });
        return;
      }

      open(appId);
    },
    [manager.windows, open, router],
  );

  useEffect(() => {
    if (
      launchingCollection &&
      (topAppId !== launchingCollection ||
        (pathname === getPathnameForApp(launchingCollection) && !search))
    ) {
      setLaunchingCollection(null);
    }
  }, [launchingCollection, pathname, search, topAppId]);

  const closeAdminWindows = useCallback(() => {
    closeApp("og-studio");
    closeApp("invoices");
    closeApp("insights");
  }, [closeApp]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      if (!event.shiftKey && key === "k") {
        event.preventDefault();
        setPaletteOpen((current) => !current);
      } else if (!event.shiftKey && key === ",") {
        event.preventDefault();
        openApp("settings");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openApp]);

  const captureContextTarget = useCallback((event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    const link = target.closest("a[href]") as HTMLAnchorElement | null;
    const image = target.closest("img") as HTMLImageElement | null;
    setContextTarget({
      link: link?.href ?? null,
      image: image?.src ?? null,
    });
  }, []);

  // Measure workspace geometry and open any direct-URL app (e.g. /resume, /settings,
  // /og-studio, /invoices) inside the DesktopOS shell before first paint.
  useLayoutEffect(() => {
    const element = workRef.current;
    if (!element) return;

    const readRect = (): Area => {
      const rect = element.getBoundingClientRect();
      return {
        w: rect.width,
        h: rect.height,
        left: rect.left,
        top: rect.top,
      };
    };

    const initialArea = readRect();
    const updateArea = (nextArea: Area) => {
      setArea((current) => {
        if (
          current.w === nextArea.w &&
          current.h === nextArea.h &&
          current.left === nextArea.left &&
          current.top === nextArea.top
        ) {
          return current;
        }
        return nextArea;
      });
    };
    updateArea(initialArea);

    if (!initializedRef.current) {
      const initialApp = getAppIdFromPathname(window.location.pathname);
      lastSyncedAppRef.current = initialApp;
      if (initialApp) {
        routePaths.current[initialApp] =
          window.location.pathname + window.location.search;
        expectedRouteAppRef.current = initialApp;
        handlingRouteChangeRef.current = true;
        open(initialApp, initialArea);
      }
      initializedRef.current = true;
    }

    const measure = () => {
      updateArea(readRect());
    };

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [open]);

  // Keep a real server-rendered route surface until the window manager hydrates.
  useEffect(() => {
    setHydrated(true);
  }, []);

  // Remember the path and query for each routed window.
  useEffect(() => {
    if (routeApp && usesRouteContent(routeApp)) {
      routePaths.current[routeApp] =
        window.location.pathname + window.location.search;
    }
  }, [pathname, routeApp, search]);

  // Window focus changes use the App Router, not just pushState: server content
  // and generateMetadata must refresh as well as the URL.
  useEffect(() => {
    if (!initializedRef.current) return;
    if (!usesRouteContent(topAppId)) {
      document.title = getDocumentTitleForApp(topAppId);
    }
    if (handlingRouteChangeRef.current) {
      if (topAppId === expectedRouteAppRef.current) {
        handlingRouteChangeRef.current = false;
        lastSyncedAppRef.current = topAppId;
      }
      return;
    }
    const currentApp = getAppIdFromPathname(window.location.pathname);
    if (currentApp === topAppId) return;
    const desired = topAppId
      ? routePaths.current[topAppId] || getPathnameForApp(topAppId)
      : "/";
    lastSyncedAppRef.current = topAppId;
    router.push(desired, { scroll: false });
  }, [router, topAppId]);

  // Browser Back/Forward must focus the correct existing window.
  useEffect(() => {
    const handlePopState = () => {
      const nextApp = getAppIdFromPathname(window.location.pathname);
      if (nextApp)
        routePaths.current[nextApp] =
          window.location.pathname + window.location.search;
      lastSyncedAppRef.current = nextApp;
      if (nextApp !== currentTopAppRef.current) {
        expectedRouteAppRef.current = nextApp;
        handlingRouteChangeRef.current = true;
        syncToRoute(nextApp);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [syncToRoute]);

  // Also respond to Next Link/navigation, including nested content routes.
  useEffect(() => {
    if (!initializedRef.current || handlingRouteChangeRef.current) return;
    const nextApp = getAppIdFromPathname(pathname);
    if (nextApp)
      routePaths.current[nextApp] =
        window.location.pathname + window.location.search;
    if (nextApp !== lastSyncedAppRef.current) {
      lastSyncedAppRef.current = nextApp;
      if (nextApp !== currentTopAppRef.current) {
        expectedRouteAppRef.current = nextApp;
        handlingRouteChangeRef.current = true;
        syncToRoute(nextApp);
      }
    }
  }, [pathname, syncToRoute]);

  return (
    <AdminAuthProvider onSignedOut={closeAdminWindows}>
      <AdminWorkspaceBridge
        windows={manager.windows}
        onOpenApp={openApp}
        onCloseAdminWindows={closeAdminWindows}
      />
      <div
        className="desktop-root"
        data-wallpaper-intensity={wallpaperIntensity}
      >
        <div className="desktop-background-layer" aria-hidden>
          <AnimatePresence initial={false}>
            <motion.img
              key={currentWallpaper.id}
              className="desktop-background"
              src={currentWallpaper.src}
              alt=""
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={
                shouldReduceMotion ? { duration: 0 } : WALLPAPER_CROSSFADE
              }
            />
          </AnimatePresence>
        </div>
        <div className="desktop-background-scrim" aria-hidden />

        <MenuBar
          onOpenApp={openApp}
          onCloseAll={manager.closeAll}
          onOpenCommandPalette={() => setPaletteOpen(true)}
        />

        <ContextMenu>
          <ContextMenuTrigger
            className="work-area"
            ref={workRef}
            onContextMenu={(event) => {
              event.preventDefault();
              captureContextTarget(event);
            }}
          >
            <ProfileWidget />
            <DesktopIcons onOpen={openApp} />
            {usesRouteContent(routeApp) && !hydrated ? (
              <section
                className="route-server-window"
                aria-label={`${APP_REGISTRY[routeApp].title} window`}
              >
                <div className="window route-server-surface">
                  <div className="window-titlebar">
                    <span className="window-title">
                      {APP_REGISTRY[routeApp].title}
                    </span>
                  </div>
                  <div className="window-body">{children}</div>
                </div>
              </section>
            ) : null}
            {!routeApp && pathname && pathname !== "/" ? (
              <div className="route-unknown">{children}</div>
            ) : null}
            <WindowsLayer
              windows={manager.windows}
              area={area}
              manager={manager}
              isMobile={isMobileWindowMode}
              routeApp={routeApp}
              routeContent={
                launchingCollection &&
                launchingCollection === routeApp &&
                (pathname !== getPathnameForApp(launchingCollection) ||
                  search) ? (
                  <LoadingView
                    label={APP_REGISTRY[launchingCollection].title}
                    layout="listing"
                  />
                ) : (
                  children
                )
              }
              snapshots={snapshots}
              captureSnapshot={captureSnapshot}
              hydrated={hydrated}
            />
          </ContextMenuTrigger>
          <DesktopContextMenuContent
            onOpenSettings={() => openApp("settings")}
            onOpenResume={() => openApp("resume")}
            onOpenCommandPalette={() => setPaletteOpen(true)}
            targetLink={contextTarget.link}
            targetImage={contextTarget.image}
          />
        </ContextMenu>
      </div>
      {/* Outside `.desktop-root` so portalled windows and the workstation lock
          curtain share the root stacking context cleanly beneath the 40px bar. */}
      <BootSequence ready={hydrated} />
      <CookieNotice
        onOpenSettings={() => {
          requestSettingsSection("privacy-storage");
          openApp("settings");
        }}
      />
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onOpenApp={openApp}
        onCloseAll={manager.closeAll}
      />
      <WorkstationLockCurtain />
      <Toaster position="bottom-right" closeButton />
    </AdminAuthProvider>
  );
}
