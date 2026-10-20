"use client";

import { motion } from "framer-motion";
import { FLYOUT_IN } from "@/lib/windows";

export type CtxItem = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  disabled?: boolean;
  separator?: boolean;
  onSelect?: () => void;
};

/* Acrylic context menu (desktop + icons + taskbar). */
export function ContextMenu({
  x,
  y,
  items,
  onClose,
}: {
  x: number;
  y: number;
  items: CtxItem[];
  onClose: () => void;
}) {
  // Flip when close to the viewport edge so the menu never clips.
  const width = 232;
  const left = Math.min(x, window.innerWidth - width - 8);
  const top = Math.min(y, window.innerHeight - items.length * 30 - 16);

  return (
    <motion.div
      className="ctx-menu"
      style={{ left, top }}
      role="menu"
      initial={{ opacity: 0, scale: 0.96, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, y: -2 }}
      transition={FLYOUT_IN}
    >
      {items.map((item) =>
        item.separator ? (
          <div key={item.id} className="ctx-separator" />
        ) : (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            className={`ctx-item${item.disabled ? " is-disabled" : ""}`}
            onClick={() => {
              item.onSelect?.();
              onClose();
            }}
          >
            {item.icon}
            <span className="flex-1">{item.label}</span>
            {item.shortcut && <kbd>{item.shortcut}</kbd>}
          </button>
        ),
      )}
    </motion.div>
  );
}
