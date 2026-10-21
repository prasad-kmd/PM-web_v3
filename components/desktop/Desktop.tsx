"use client";

import { AnimatePresence } from "framer-motion";
import { Info, LayoutGrid, RefreshCw, Settings as SettingsIcon } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast, Toaster } from "sonner";
import { BottomNav } from "@/components/navbar/BottomNav";
import { WindowsLayer } from "@/components/window/WindowsLayer";
import { useWindowManager } from "@/hooks/useWindowManager";
import { useAppearance } from "@/lib/appearance";
import { APP_REGISTRY, WALLPAPERS, type AppId } from "@/lib/registry";
import type { Area } from "@/lib/windows";
import { ContextMenu, type CtxItem } from "./ContextMenu";
import { DesktopIcons } from "./DesktopIcons";
import { MenuBar } from "./MenuBar";

type Ctx = { x: number; y: number; items: CtxItem[] } | null;

export function Desktop() {
  const { theme, wallpaper } = useAppearance();
  const [area, setArea] = useState<Area>({ w: 1280, h: 720, left: 0, top: 28 });
  const [ctx, setCtx] = useState<Ctx>(null);

  const workRef = useRef<HTMLDivElement>(null);
  const anchors = useRef<Partial<Record<AppId, HTMLElement>>>({});

  /* Measure the working desktop area (between MenuBar and BottomNav) */
  useLayoutEffect(() => {
    const el = workRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setArea({ w: r.width, h: r.height, left: r.left, top: r.top });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const getAnchor = useCallback((appId: AppId) => {
    const el = anchors.current[appId];
    const work = workRef.current;
    if (!el || !work) return { cx: window.innerWidth / 2, cy: window.innerHeight - 36 };
    const r = el.getBoundingClientRect();
    const w = work.getBoundingClientRect();
    return { cx: r.left + r.width / 2 - w.left, cy: r.top + r.height / 2 - w.top };
  }, []);

  const manager = useWindowManager(area, getAnchor);

  const registerAnchor = useCallback((appId: AppId, el: HTMLElement | null) => {
    if (el) anchors.current[appId] = el;
    else delete anchors.current[appId];
  }, []);

  const openApp = useCallback(
    (appId: AppId) => {
      setCtx(null);
      manager.open(appId);
    },
    [manager],
  );

  /* Global Keyboard Esc to dismiss context menus */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && ctx) {
        setCtx(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ctx]);

  /* Context Menus */
  const desktopMenu = useCallback(
    (x: number, y: number) =>
      setCtx({
        x,
        y,
        items: [
          {
            id: "settings",
            label: "Open Settings",
            icon: <SettingsIcon size={14} />,
            onSelect: () => openApp("settings"),
          },
          {
            id: "refresh",
            label: "Clean Up Icons",
            icon: <RefreshCw size={14} />,
            onSelect: () => toast.success("Desktop organized"),
          },
          { id: "sep1", label: "", separator: true },
          {
            id: "wallpaper",
            label: "Change Wallpaper...",
            icon: <LayoutGrid size={14} />,
            onSelect: () => openApp("settings"),
          },
          { id: "sep2", label: "", separator: true },
          {
            id: "about",
            label: "About Prasad M. Workspace",
            icon: <Info size={14} />,
            onSelect: () => toast.info("Engineering Workspace · Powered by Next.js 16"),
          },
        ],
      }),
    [openApp],
  );

  const iconMenu = useCallback(
    (x: number, y: number, appId: AppId) =>
      setCtx({
        x,
        y,
        items: [
          {
            id: "open",
            label: "Open",
            icon: <SettingsIcon size={14} />,
            onSelect: () => openApp(appId),
          },
          { id: "sep1", label: "", separator: true },
          {
            id: "rename",
            label: "Rename",
            shortcut: "F2",
            onSelect: () => toast("Press F2 or click the label to rename."),
          },
          {
            id: "props",
            label: "Get Info",
            icon: <Info size={14} />,
            onSelect: () => toast.info(APP_REGISTRY[appId].description),
          },
        ],
      }),
    [openApp],
  );

  const topWindow = manager.windows.find((w) => w.id === manager.topId);

  return (
    <div className="desktop-root" data-theme={theme} data-wallpaper={wallpaper}>
      {/* Dynamic Wallpaper & Tint */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="desktop-wallpaper" src={WALLPAPERS[wallpaper].src} alt="" aria-hidden />
      <div className="wallpaper-tint" aria-hidden />

      {/* Top Menu Bar */}
      <MenuBar
        focusedTitle={topWindow ? topWindow.title : null}
        onOpenSettings={() => openApp("settings")}
      />

      {/* Working Desktop Canvas */}
      <div
        className="work-area"
        ref={workRef}
        onPointerDown={() => setCtx(null)}
        onContextMenu={(e) => {
          e.preventDefault();
          desktopMenu(e.clientX, e.clientY);
        }}
      >
        <DesktopIcons
          onOpen={openApp}
          onContextMenu={(x, y, appId) =>
            appId ? iconMenu(x, y, appId) : desktopMenu(x, y)
          }
        />

        <WindowsLayer windows={manager.windows} area={area} manager={manager} />
      </div>

      {/* Bottom Floating Mobile Navbar (v2 style with centered anchor button) */}
      <BottomNav
        openIds={manager.openIds}
        topAppId={topWindow ? topWindow.appId : null}
        onToggleWindow={manager.open}
        registerAnchor={registerAnchor}
      />

      {/* Context Menu */}
      <AnimatePresence>
        {ctx && <ContextMenu {...ctx} onClose={() => setCtx(null)} />}
      </AnimatePresence>

      <Toaster position="bottom-right" richColors closeButton />
    </div>
  );
}
