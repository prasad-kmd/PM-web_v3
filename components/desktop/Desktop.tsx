"use client";

import { AnimatePresence } from "framer-motion";
import {
  Eye,
  Grid3X3,
  Info,
  LayoutGrid,
  RefreshCw,
  Settings as SettingsIcon,
} from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast, Toaster } from "sonner";
import { StartMenu } from "@/components/start-menu/StartMenu";
import { Taskbar } from "@/components/taskbar/Taskbar";
import { WindowsLayer } from "@/components/window/WindowsLayer";
import { useWindowManager } from "@/hooks/useWindowManager";
import { useAppearance } from "@/lib/appearance";
import { APP_REGISTRY, WALLPAPERS, type AppId } from "@/lib/registry";
import type { Area } from "@/lib/windows";
import { ContextMenu, type CtxItem } from "./ContextMenu";
import { DesktopIcons } from "./DesktopIcons";
import { StatusBar } from "./StatusBar";

/* =========================================================
   Desktop shell — wallpaper · status bar · icons · windows
   · taskbar · Start. Owns layout measurement and the
   single ESC/dismiss cascade.
   ========================================================= */

type Ctx = { x: number; y: number; items: CtxItem[] } | null;

export function Desktop() {
  const { theme, wallpaper } = useAppearance();
  const [area, setArea] = useState<Area>({ w: 1280, h: 720, left: 0, top: 0 });
  const [startOpen, setStartOpen] = useState(false);
  const [ctx, setCtx] = useState<Ctx>(null);

  const workRef = useRef<HTMLDivElement>(null);
  const anchors = useRef<Partial<Record<AppId, HTMLElement>>>({});

  /* ---- measure the working area (between status bar and taskbar) ---- */
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
    if (!el || !work) return { cx: window.innerWidth / 2, cy: window.innerHeight - 24 };
    const r = el.getBoundingClientRect();
    const w = work.getBoundingClientRect();
    return { cx: r.left + r.width / 2 - w.left, cy: r.top + r.height / 2 - w.top };
  }, []);

  const manager = useWindowManager(area, getAnchor);

  /* ---- register taskbar anchors ---- */
  const registerAnchor = useCallback((appId: AppId, el: HTMLElement | null) => {
    if (el) anchors.current[appId] = el;
    else delete anchors.current[appId];
  }, []);

  /* ---- open from anywhere: Start, taskbar, desktop icon ---- */
  const openApp = useCallback(
    (appId: AppId) => {
      setStartOpen(false);
      setCtx(null);
      manager.open(appId);
    },
    [manager],
  );

  /* ---- ESC + click-away cascade ---- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (ctx) {
        setCtx(null);
        return;
      }
      if (startOpen) setStartOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ctx, startOpen]);

  /* ---- context menus ---- */
  const desktopMenu = useCallback(
    (x: number, y: number) =>
      setCtx({
        x,
        y,
        items: [
          { id: "view", label: "View", icon: <Eye />, onSelect: () => toast("Icon view is fixed in this build.") },
          { id: "sort", label: "Sort by", icon: <Grid3X3 />, onSelect: () => toast("Sorting is fixed in this build.") },
          { id: "refresh", label: "Refresh", icon: <RefreshCw />, shortcut: "F5", onSelect: () => toast.success("Desktop refreshed") },
          { id: "sep1", label: "", separator: true },
          {
            id: "personalize",
            label: "Personalize",
            icon: <LayoutGrid />,
            onSelect: () => openApp("settings"),
          },
          {
            id: "about",
            label: "About this desktop",
            icon: <Info />,
            onSelect: () => toast.info("pm-web v3.2.0 — Fluent desktop shell"),
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
          { id: "open", label: "Open", icon: <SettingsIcon />, onSelect: () => openApp(appId) },
          { id: "sep1", label: "", separator: true },
          {
            id: "rename",
            label: "Rename",
            shortcut: "F2",
            onSelect: () => toast("Select the icon and press F2."),
          },
          {
            id: "props",
            label: "Properties",
            icon: <Info />,
            onSelect: () => toast.info(APP_REGISTRY[appId].description),
          },
        ],
      }),
    [openApp],
  );

  const topWindow = manager.windows.find((w) => w.id === manager.topId);

  return (
    <div className="desktop-root" data-theme={theme}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="desktop-wallpaper" src={WALLPAPERS[wallpaper].src} alt="" aria-hidden />
      <div className="wallpaper-tint" aria-hidden />

      <StatusBar focusedTitle={topWindow ? topWindow.title : null} />

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

      <Taskbar
        openIds={manager.openIds}
        topAppId={topWindow ? topWindow.appId : null}
        onOpen={openApp}
        startOpen={startOpen}
        onToggleStart={() => {
          setCtx(null);
          setStartOpen((v) => !v);
        }}
        registerAnchor={registerAnchor}
      />

      <StartMenu open={startOpen} onClose={() => setStartOpen(false)} onOpenApp={openApp} />

      <AnimatePresence>{ctx && <ContextMenu {...ctx} onClose={() => setCtx(null)} />}</AnimatePresence>

      <Toaster position="bottom-center" richColors closeButton />
    </div>
  );
}
