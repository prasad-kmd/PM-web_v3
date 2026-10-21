"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { APP_REGISTRY, type AppId } from "@/lib/registry";
import {
  clampRect,
  sameRect,
  snapRect,
  type Area,
  type Rect,
  type SnapLayout,
} from "@/lib/windows";

export type WindowState = {
  id: string;
  appId: AppId;
  title: string;
  z: number;
  rect: Rect;
  restRect: Rect;
  maximized: boolean;
  /** The window remains mounted until its Animate UI-style close exit completes. */
  exiting: boolean;
};

type StoredWindowLayout = Pick<WindowState, "rect" | "restRect" | "maximized">;
type StoredWindowLayouts = Partial<Record<AppId, StoredWindowLayout>>;

const STORAGE_KEY = "pm-window-layout-v1";

const OPEN_SIZE: Record<AppId, { w: number; h: number }> = {
  settings: { w: 780, h: 580 },
  notepad: { w: 720, h: 540 },
};

function cascade(
  area: Area,
  index: number,
  size: { w: number; h: number },
): Rect {
  const w = Math.min(size.w, Math.max(320, area.w - 48));
  const h = Math.min(size.h, Math.max(240, area.h - 48));
  const offset = (index % 5) * 28;
  return {
    x: Math.max(12, Math.round((area.w - w) / 2 - 80 + offset)),
    y: Math.max(12, Math.round((area.h - h) / 2 - 16 + offset)),
    w,
    h,
  };
}

function isRect(value: unknown): value is Rect {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return [candidate.x, candidate.y, candidate.w, candidate.h].every(
    (entry) => typeof entry === "number" && Number.isFinite(entry),
  );
}

function readStoredLayouts(): StoredWindowLayouts {
  if (typeof window === "undefined") return {};

  try {
    const value: unknown = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? "{}",
    );
    if (!value || typeof value !== "object") return {};

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).flatMap(
        ([appId, layout]) => {
          if (!(appId in APP_REGISTRY) || !layout || typeof layout !== "object")
            return [];
          const candidate = layout as Record<string, unknown>;
          if (
            !isRect(candidate.rect) ||
            !isRect(candidate.restRect) ||
            typeof candidate.maximized !== "boolean"
          ) {
            return [];
          }
          return [
            [
              appId,
              {
                rect: candidate.rect,
                restRect: candidate.restRect,
                maximized: candidate.maximized,
              },
            ],
          ];
        },
      ),
    ) as StoredWindowLayouts;
  } catch {
    return {};
  }
}

function serializeLayout(windowState: WindowState): StoredWindowLayout {
  return {
    rect: { ...windowState.rect },
    restRect: { ...windowState.restRect },
    maximized: windowState.maximized,
  };
}

export function useWindowManager(area: Area) {
  const [windows, setWindows] = useState<WindowState[]>([]);
  const zRef = useRef(10);
  const indexRef = useRef(0);
  const layoutsRef = useRef<StoredWindowLayouts>(readStoredLayouts());

  const persistLayout = useCallback((windowState: WindowState) => {
    const next = {
      ...layoutsRef.current,
      [windowState.appId]: serializeLayout(windowState),
    };
    layoutsRef.current = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Private mode or storage limits should never block window interaction.
    }
  }, []);

  const focus = useCallback((id: string) => {
    zRef.current += 1;
    const z = zRef.current;
    setWindows((current) =>
      current.map((windowState) =>
        windowState.id === id ? { ...windowState, z } : windowState,
      ),
    );
  }, []);

  const finishExit = useCallback((id: string) => {
    setWindows((current) =>
      current.filter((windowState) => windowState.id !== id),
    );
  }, []);

  const open = useCallback(
    (appId: AppId) => {
      setWindows((current) => {
        const existing = current.find(
          (windowState) => windowState.appId === appId,
        );
        zRef.current += 1;
        const z = zRef.current;

        // Reopening during a close retargets its exit into the normal dialog-style state.
        if (existing) {
          return current.map((windowState) =>
            windowState.id === existing.id
              ? { ...windowState, exiting: false, z }
              : windowState,
          );
        }

        const stored = layoutsRef.current[appId];
        const freshRect = cascade(area, indexRef.current++, OPEN_SIZE[appId]);
        const restRect = stored ? clampRect(stored.restRect, area) : freshRect;
        const maximized = stored?.maximized ?? false;
        const rect = maximized
          ? { x: 0, y: 0, w: area.w, h: area.h }
          : stored
            ? clampRect(stored.rect, area)
            : freshRect;
        const windowState: WindowState = {
          id: `${appId}-${Date.now()}`,
          appId,
          title: APP_REGISTRY[appId].title,
          z,
          rect,
          restRect,
          maximized,
          exiting: false,
        };

        return [...current, windowState];
      });
    },
    [area],
  );

  const close = useCallback(
    (id: string) => {
      setWindows((current) =>
        current.map((windowState) => {
          if (windowState.id !== id || windowState.exiting) return windowState;
          persistLayout(windowState);
          return { ...windowState, exiting: true };
        }),
      );
    },
    [persistLayout],
  );

  const toggleMaximize = useCallback(
    (id: string) => {
      setWindows((current) =>
        current.map((windowState) => {
          if (windowState.id !== id || windowState.exiting) return windowState;
          zRef.current += 1;
          const next = windowState.maximized
            ? {
                ...windowState,
                maximized: false,
                rect: clampRect(windowState.restRect, area),
                z: zRef.current,
              }
            : {
                ...windowState,
                maximized: true,
                restRect: windowState.rect,
                rect: { x: 0, y: 0, w: area.w, h: area.h },
                z: zRef.current,
              };
          persistLayout(next);
          return next;
        }),
      );
    },
    [area, persistLayout],
  );

  const snap = useCallback(
    (id: string, layout: SnapLayout) => {
      setWindows((current) =>
        current.map((windowState) => {
          if (windowState.id !== id || windowState.exiting) return windowState;
          zRef.current += 1;
          const next = {
            ...windowState,
            maximized: false,
            restRect: windowState.maximized
              ? windowState.restRect
              : windowState.rect,
            rect: snapRect(layout, area),
            z: zRef.current,
          };
          persistLayout(next);
          return next;
        }),
      );
    },
    [area, persistLayout],
  );

  const updateRect = useCallback(
    (id: string, rect: Rect) => {
      setWindows((current) =>
        current.map((windowState) => {
          if (windowState.id !== id) return windowState;
          const next = {
            ...windowState,
            rect: { ...rect },
            restRect: { ...rect },
            maximized: false,
          };
          persistLayout(next);
          return next;
        }),
      );
    },
    [persistLayout],
  );

  const closeAll = useCallback(() => {
    setWindows((current) =>
      current.map((windowState) => {
        if (windowState.exiting) return windowState;
        persistLayout(windowState);
        return { ...windowState, exiting: true };
      }),
    );
  }, [persistLayout]);

  // A display resize can invalidate stored/open geometry. Clamp and retain the corrected layout.
  useEffect(() => {
    setWindows((current) =>
      current.map((windowState) => {
        const restRect = clampRect(windowState.restRect, area);
        const rect = windowState.maximized
          ? { x: 0, y: 0, w: area.w, h: area.h }
          : clampRect(windowState.rect, area);
        if (
          sameRect(restRect, windowState.restRect) &&
          sameRect(rect, windowState.rect)
        )
          return windowState;
        const next = { ...windowState, rect, restRect };
        persistLayout(next);
        return next;
      }),
    );
  }, [area, persistLayout]);

  const topId = useMemo(() => {
    const active = windows.filter((windowState) => !windowState.exiting);
    return active.length
      ? active.reduce((a, b) => (a.z >= b.z ? a : b)).id
      : null;
  }, [windows]);

  return {
    windows,
    open,
    focus,
    close,
    toggleMaximize,
    snap,
    move: updateRect,
    resize: updateRect,
    finishExit,
    closeAll,
    topId,
  };
}

export type WindowManager = ReturnType<typeof useWindowManager>;
