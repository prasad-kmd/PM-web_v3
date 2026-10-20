"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { APP_REGISTRY, type AppId } from "@/lib/registry";
import {
  clampRect,
  snapRect,
  type Area,
  type ExitKind,
  type Rect,
  type SnapLayout,
  type SpawnKind,
} from "@/lib/windows";

/* =========================================================
   Window manager
   Single source of truth for every open window: geometry,
   z-order, minimize/maximize state, and exit choreography.
   ========================================================= */

export type WindowState = {
  id: string;
  appId: AppId;
  title: string;
  z: number;
  rect: Rect;
  restRect: Rect;
  maximized: boolean;
  exiting: ExitKind | null;
  spawn: SpawnKind;
  /** Centre of the taskbar button this window animates to/from. */
  anchor: { cx: number; cy: number };
};

const OPEN_SIZE: Record<AppId, { w: number; h: number }> = {
  settings: { w: 780, h: 580 },
  notepad: { w: 720, h: 540 },
};

function cascade(area: Area, index: number, size: { w: number; h: number }): Rect {
  const w = Math.min(size.w, Math.max(420, area.w - 48));
  const h = Math.min(size.h, Math.max(300, area.h - 48));
  const step = 34;
  const offset = (index % 5) * step;
  const x = Math.max(12, Math.round((area.w - w) / 2 - 120 + offset));
  const y = Math.max(12, Math.round((area.h - h) / 2 - 24 + offset));
  return { x, y, w, h };
}

export type AnchorGetter = (appId: AppId) => { cx: number; cy: number };

export function useWindowManager(area: Area, getAnchor: AnchorGetter) {
  const [windows, setWindows] = useState<WindowState[]>([]);
  const zRef = useRef(10);
  const indexRef = useRef(0);
  /** Remembers how each app last left the screen so it can re-enter the same way. */
  const spawnRef = useRef<Partial<Record<AppId, SpawnKind>>>({});

  const nextZ = useCallback(() => (zRef.current += 1), []);

  const focus = useCallback((id: string) => {
    zRef.current += 1;
    const z = zRef.current;
    setWindows((list) => list.map((w) => (w.id === id ? { ...w, z } : w)));
  }, []);

  const finishExit = useCallback((id: string) => {
    setWindows((list) => {
      const target = list.find((w) => w.id === id);
      if (target) spawnRef.current[target.appId] = "taskbar";
      return list.filter((w) => w.id !== id);
    });
  }, []);

  const open = useCallback(
    (appId: AppId) => {
      setWindows((list) => {
        const existing = list.find((w) => w.appId === appId && !w.exiting);

        // Already open → Win11 behaviour: focused ⇒ minimize, unfocused ⇒ focus.
        if (existing) {
          const isTop = list.every((w) => w.z <= existing.z);
          if (isTop) {
            return list.map((w) =>
              w.id === existing.id ? { ...w, exiting: "minimize" as ExitKind } : w,
            );
          }
          zRef.current += 1;
          return list.map((w) => (w.id === existing.id ? { ...w, z: zRef.current } : w));
        }

        const meta = APP_REGISTRY[appId];
        const size = OPEN_SIZE[appId];
        const rect = cascade(area, indexRef.current++, size);
        zRef.current += 1;
        const win: WindowState = {
          id: `${appId}-${Date.now()}`,
          appId,
          title: meta.title,
          z: zRef.current,
          rect,
          restRect: rect,
          maximized: false,
          exiting: null,
          spawn: spawnRef.current[appId] ?? "fresh",
          anchor: getAnchor(appId),
        };
        spawnRef.current[appId] = "fresh";
        return [...list, win];
      });
    },
    [area, getAnchor],
  );

  const minimize = useCallback((id: string) => {
    setWindows((list) =>
      list.map((w) => (w.id === id ? { ...w, exiting: "minimize" as ExitKind } : w)),
    );
  }, []);

  const close = useCallback((id: string) => {
    setWindows((list) =>
      list.map((w) => (w.id === id ? { ...w, exiting: "close" as ExitKind } : w)),
    );
  }, []);

  const toggleMaximize = useCallback(
    (id: string) => {
      setWindows((list) =>
        list.map((w) => {
          if (w.id !== id || w.exiting) return w;
          zRef.current += 1;
          const z = zRef.current;
          if (w.maximized) {
            return {
              ...w,
              maximized: false,
              rect: clampRect(w.restRect, area),
              z,
            };
          }
          return {
            ...w,
            maximized: true,
            restRect: w.rect,
            rect: { x: 0, y: 0, w: area.w, h: area.h },
            z,
          };
        }),
      );
    },
    [area],
  );

  const snap = useCallback(
    (id: string, layout: SnapLayout) => {
      setWindows((list) =>
        list.map((w) => {
          if (w.id !== id || w.exiting) return w;
          zRef.current += 1;
          return {
            ...w,
            maximized: false,
            restRect: w.maximized ? w.restRect : w.rect,
            rect: snapRect(layout, area),
            z: zRef.current,
          };
        }),
      );
    },
    [area],
  );

  const move = useCallback((id: string, rect: Rect) => {
    setWindows((list) =>
      list.map((w) =>
        w.id === id ? { ...w, rect: { ...rect }, restRect: { ...rect }, maximized: false } : w,
      ),
    );
  }, []);

  const resize = useCallback((id: string, rect: Rect) => {
    setWindows((list) =>
      list.map((w) =>
        w.id === id ? { ...w, rect: { ...rect }, restRect: { ...rect }, maximized: false } : w,
      ),
    );
  }, []);

  const closeAll = useCallback(() => {
    setWindows((list) => list.map((w) => ({ ...w, exiting: "close" as ExitKind })));
  }, []);

  const openIds = useMemo(() => new Set(windows.map((w) => w.appId)), [windows]);
  const topId = useMemo(
    () => (windows.length ? windows.reduce((a, b) => (a.z >= b.z ? a : b)).id : null),
    [windows],
  );

  return {
    windows,
    open,
    focus,
    minimize,
    close,
    toggleMaximize,
    snap,
    move,
    resize,
    finishExit,
    closeAll,
    openIds,
    topId,
  };
}

export type WindowManager = ReturnType<typeof useWindowManager>;
