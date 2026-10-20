import type { Transition } from "framer-motion";

/* =========================================================
   Window geometry + motion language
   Tuned to match win11React / Windows 11 shell motion:
   – geometry (move/maximize/snap) → critically damped spring, no overshoot
   – open/close → fast decelerate (expo-out), 160–220ms
   – minimize → accelerate into the taskbar
   ========================================================= */

export type Rect = { x: number; y: number; w: number; h: number };
/** Working area (between status bar and taskbar). `left`/`top` are the layer's
 *  viewport offsets, used to detect edge-snap gestures in screen coordinates. */
export type Area = { w: number; h: number; left: number; top: number };
export type SnapLayout = "left" | "right" | "tl" | "tr" | "bl" | "br";
export type ExitKind = "minimize" | "close";
export type SpawnKind = "fresh" | "taskbar";

export const MIN_W = 420;
export const MIN_H = 280;

/** Geometry changes (maximize, snap, restore) — spring, no bounce. */
export const GEO_TRANSITION: Transition = {
  type: "spring",
  stiffness: 520,
  damping: 42,
  mass: 0.9,
};

/** Window open — scale/opacity, expo-out. */
export const OPEN_TRANSITION: Transition = {
  duration: 0.2,
  ease: [0.16, 1, 0.3, 1],
};

/** Window close — quick shrink + fade. */
export const CLOSE_TRANSITION: Transition = {
  duration: 0.16,
  ease: [0.4, 0, 1, 1],
};

/** Minimize — flies into its taskbar button. */
export const MINIMIZE_TRANSITION: Transition = {
  duration: 0.22,
  ease: [0.4, 0, 1, 1],
};

/** Restore — grows back out of the taskbar button. */
export const RESTORE_TRANSITION: Transition = {
  duration: 0.24,
  ease: [0.16, 1, 0.3, 1],
};

/** Flyouts (Start menu, calendar, notifications, context menu). */
export const FLYOUT_IN: Transition = { duration: 0.2, ease: [0.16, 1, 0.3, 1] };
export const FLYOUT_OUT: Transition = { duration: 0.14, ease: [0.4, 0, 1, 1] };

export function clampRect(rect: Rect, area: Area): Rect {
  const w = Math.max(MIN_W, Math.min(rect.w, area.w));
  const h = Math.max(MIN_H, Math.min(rect.h, area.h));
  const x = Math.min(Math.max(rect.x, -w + 120), Math.max(area.w - 120, 0));
  const y = Math.min(Math.max(rect.y, 0), Math.max(area.h - 48, 0));
  return { x, y, w, h };
}

/** Snap a rect into one of the six Win11 layout zones. */
export function snapRect(layout: SnapLayout, area: Area): Rect {
  const w = area.w;
  const h = area.h;
  const half = w / 2;
  const halfH = h / 2;
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

/** Where a window should fly to when minimized, given its taskbar button centre. */
export function minimizeTarget(centre: { cx: number; cy: number }, rect: Rect) {
  return { x: centre.cx - rect.w / 2, y: centre.cy - rect.h / 2 };
}
