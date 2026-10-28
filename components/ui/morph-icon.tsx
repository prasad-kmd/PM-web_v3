"use client";

import { HugeiconsIcon, type HugeiconsIconProps } from "@hugeicons/react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
} from "motion/react";

const MORPH: Transition = { type: "spring", duration: 0.32, bounce: 0.18 };
const FADE: Transition = { duration: 0.12 };

/**
 * Icon that morphs when it changes: the outgoing glyph shrinks, blurs and
 * fades while the incoming one grows into place in the same grid cell. With
 * reduced motion it's a plain cross-fade. Change `iconKey` to trigger it.
 */
export function MorphIcon({
  icon,
  iconKey,
  size,
  strokeWidth = 1.8,
}: {
  icon: HugeiconsIconProps["icon"];
  iconKey: string;
  size?: number;
  strokeWidth?: number;
}) {
  const reduce = useReducedMotion();
  const hidden = reduce
    ? { opacity: 0 }
    : { opacity: 0, scale: 0.55, filter: "blur(2px)" };
  return (
    <span className="morph-icon" aria-hidden>
      <AnimatePresence initial={false}>
        <motion.span
          key={iconKey}
          initial={hidden}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={hidden}
          transition={reduce ? FADE : MORPH}
        >
          <HugeiconsIcon icon={icon} size={size} strokeWidth={strokeWidth} />
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/**
 * Outline toggle glyph: a window with a side panel. Closing slides the panel
 * divider to the edge and fades the outline lines; opening reverses it.
 */
export function OutlineGlyph({ open }: { open: boolean }) {
  const reduce = useReducedMotion();
  const transition = reduce ? { duration: 0 } : MORPH;
  return (
    <svg
      className="outline-glyph"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      aria-hidden
    >
      <rect x="2.5" y="3.5" width="19" height="17" rx="4" />
      <motion.line
        y1="4"
        y2="20"
        initial={false}
        animate={{
          x1: open ? 14.5 : 21,
          x2: open ? 14.5 : 21,
          opacity: open ? 1 : 0,
        }}
        transition={transition}
      />
      <motion.g
        initial={false}
        animate={{ opacity: open ? 1 : 0, x: open ? 0 : 3 }}
        transition={transition}
      >
        <line x1="17" y1="8.5" x2="19" y2="8.5" />
        <line x1="17" y1="12" x2="19" y2="12" />
        <line x1="17" y1="15.5" x2="18.2" y2="15.5" />
      </motion.g>
    </svg>
  );
}
