"use client";

import { AnimatePresence, motion } from "motion/react";
import type { SnapLayout } from "@/lib/windows";
import { FLYOUT_IN, FLYOUT_OUT } from "@/lib/windows";

/* Snap Layouts — appears when the maximize button is hovered. */
const ZONES: { layout: SnapLayout; label: string; style: React.CSSProperties }[] = [
  { layout: "left", label: "Left half", style: { gridColumn: "1", gridRow: "1 / span 2" } },
  { layout: "tr", label: "Top right", style: { gridColumn: "2", gridRow: "1" } },
  { layout: "br", label: "Bottom right", style: { gridColumn: "2", gridRow: "2" } },
];

export function SnapOverlay({
  onPick,
  onDismiss,
}: {
  onPick: (layout: SnapLayout) => void;
  onDismiss: () => void;
}) {
  return (
    <AnimatePresence>
      <motion.div
        className="snap-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={FLYOUT_OUT}
        onPointerLeave={onDismiss}
        role="menu"
        aria-label="Snap layouts"
      >
        {ZONES.map((zone, i) => (
          <motion.button
            key={zone.layout}
            type="button"
            className="snap-zone"
            style={zone.style}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...FLYOUT_IN, delay: 0.02 * i }}
            onClick={() => onPick(zone.layout)}
            title={zone.label}
          >
            {zone.label}
          </motion.button>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
