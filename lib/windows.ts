import type { Transition } from "motion/react";

export type Rect = { x: number; y: number; w: number; h: number };
export type Area = { w: number; h: number; left: number; top: number };
export type SnapLayout = "left" | "right" | "tl" | "tr" | "bl" | "br";

export const MIN_W = 460;
export const MIN_H = 320;

/** Animate UI's reflow spring: used for maximize, restore, and snap geometry. */
export const GEO_TRANSITION: Transition = {
  type: "spring",
  stiffness: 500,
  damping: 40,
};

export const FLYOUT_IN: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 34,
};
export const FLYOUT_OUT: Transition = {
  duration: 0.14,
  ease: [0.4, 0, 1, 1],
};
export const SPOTLIGHT_IN: Transition = {
  duration: 0.16,
  ease: [0.16, 1, 0.3, 1],
};
export const SPOTLIGHT_OUT: Transition = {
  duration: 0.12,
  ease: [0.4, 0, 1, 1],
};

export function sameRect(a: Rect, b: Rect) {
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}

/** Keep a restored window usable even after moving to a smaller display. */
export function clampRect(rect: Rect, area: Area): Rect {
  const minW = Math.min(MIN_W, area.w);
  const minH = Math.min(MIN_H, area.h);
  const w = Math.max(minW, Math.min(rect.w, area.w));
  const h = Math.max(minH, Math.min(rect.h, area.h));
  const x = Math.min(
    Math.max(rect.x, -w + Math.min(120, w)),
    Math.max(area.w - Math.min(120, w), 0),
  );
  const y = Math.min(
    Math.max(rect.y, 0),
    Math.max(area.h - Math.min(48, h), 0),
  );
  return { x, y, w, h };
}

export function snapRect(layout: SnapLayout, area: Area): Rect {
  const halfW = Math.round(area.w / 2);
  const halfH = Math.round(area.h / 2);

  switch (layout) {
    case "left":
      return { x: 0, y: 0, w: halfW, h: area.h };
    case "right":
      return { x: halfW, y: 0, w: area.w - halfW, h: area.h };
    case "tl":
      return { x: 0, y: 0, w: halfW, h: halfH };
    case "tr":
      return { x: halfW, y: 0, w: area.w - halfW, h: halfH };
    case "bl":
      return { x: 0, y: halfH, w: halfW, h: area.h - halfH };
    case "br":
      return { x: halfW, y: halfH, w: area.w - halfW, h: area.h - halfH };
  }
}
