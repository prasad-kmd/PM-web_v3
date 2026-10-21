import type { Transition } from "framer-motion";

/* =========================================================
   Window Geometry & Motion Tokens — Spatial Glass OS
   Tuned with animate-ui spring physics & transitions-polish
   ========================================================= */

export type Rect = { x: number; y: number; w: number; h: number };
export type Area = { w: number; h: number; left: number; top: number };
export type SnapLayout = "left" | "right" | "tl" | "tr" | "bl" | "br";
export type ExitKind = "minimize" | "close";
export type SpawnKind = "fresh" | "taskbar";

export const MIN_W = 460;
export const MIN_H = 320;

/** Geometry changes (maximize, snap, restore) — smooth macOS-like spring */
export const GEO_TRANSITION: Transition = {
  type: "spring",
  stiffness: 440,
  damping: 36,
  mass: 0.85,
};

/** Window open — 250ms with --ease-smooth-out */
export const OPEN_TRANSITION: Transition = {
  duration: 0.25,
  ease: [0.22, 1, 0.36, 1],
};

/** Window close — 160ms asymmetrical exit */
export const CLOSE_TRANSITION: Transition = {
  duration: 0.16,
  ease: [0.4, 0, 1, 1],
};

/** Minimize — suction into the dock icon */
export const MINIMIZE_TRANSITION: Transition = {
  duration: 0.24,
  ease: [0.38, 0, 0.9, 1],
};

/** Restore — expands out from the dock icon */
export const RESTORE_TRANSITION: Transition = {
  duration: 0.26,
  ease: [0.18, 1, 0.32, 1],
};

/** Flyouts (Calendar, Notifications, Context menu) */
export const FLYOUT_IN: Transition = { duration: 0.2, ease: [0.22, 1, 0.36, 1] };
export const FLYOUT_OUT: Transition = { duration: 0.14, ease: [0.4, 0, 1, 1] };

/** Spotlight (fast blur bridge per animate-ui recipes) */
export const SPOTLIGHT_IN: Transition = { duration: 0.18, ease: [0.16, 1, 0.3, 1] };
export const SPOTLIGHT_OUT: Transition = { duration: 0.12, ease: [0.4, 0, 1, 1] };

export function clampRect(rect: Rect, area: Area): Rect {
  const w = Math.max(MIN_W, Math.min(rect.w, area.w));
  const h = Math.max(MIN_H, Math.min(rect.h, area.h));
  const x = Math.min(Math.max(rect.x, -w + 120), Math.max(area.w - 120, 0));
  const y = Math.min(Math.max(rect.y, 0), Math.max(area.h - 48, 0));
  return { x, y, w, h };
}

export function snapRect(layout: SnapLayout, area: Area): Rect {
  const w = area.w;
  const h = area.h;
  const half = Math.round(w / 2);
  const halfH = Math.round(h / 2);
  switch (layout) {
    case "left":
      return { x: 0, y: 0, w: half, h };
    case "right":
      return { x: half, y: 0, w: half, h };
    case "tl":
      return { x: 0, y: 0, w: half, h: halfH };
    case "tr":
      return { x: half, y: 0, w: half, h: halfH };
    case "bl":
      return { x: 0, y: halfH, w: half, h: halfH };
    case "br":
      return { x: half, y: halfH, w: half, h: halfH };
  }
}
