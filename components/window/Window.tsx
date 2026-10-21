"use client";

import {
  Copy01Icon,
  Maximize02Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useEffect, useRef } from "react";
import {
  animate,
  motion,
  useMotionValue,
  type MotionValue,
  type Transition,
} from "motion/react";
import { Dialog } from "@animate-ui/react/primitives/base-ui/dialog";
import { WorkspaceTooltip } from "@/components/ui/tooltip";
import { APP_REGISTRY } from "@/lib/registry";
import {
  GEO_TRANSITION,
  MIN_H,
  MIN_W,
  type Area,
  type Rect,
  type SnapLayout,
} from "@/lib/windows";
import type { WindowState } from "@/hooks/useWindowManager";

type ResizeDirection = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

function setMotionValue(
  motionValue: MotionValue<number>,
  value: number,
  motionTransition: Transition = GEO_TRANSITION,
) {
  if (Math.abs(motionValue.get() - value) < 0.5) {
    motionValue.set(value);
    return;
  }
  animate(motionValue, value, motionTransition);
}

/**
 * A desktop window deliberately uses the real Animate UI Dialog popup for its
 * lifecycle. `modal={false}` preserves the multi-window desktop interaction
 * model while Popup owns the reference dialog's entry, exit, and reduced-motion
 * behavior without a hand-authored replacement animation.
 */
export function Window({
  win,
  area,
  isTop,
  onFocus,
  onMove,
  onResize,
  onToggleMaximize,
  onSnap,
  onClose,
  onExitComplete,
  children,
}: {
  win: WindowState;
  area: Area;
  isTop: boolean;
  onFocus: () => void;
  onMove: (rect: Rect) => void;
  onResize: (rect: Rect) => void;
  onToggleMaximize: () => void;
  onSnap: (layout: SnapLayout) => void;
  onClose: () => void;
  onExitComplete: () => void;
  children: React.ReactNode;
}) {
  const x = useMotionValue(win.rect.x + area.left);
  const y = useMotionValue(win.rect.y + area.top);
  const w = useMotionValue(win.rect.w);
  const h = useMotionValue(win.rect.h);
  const interacting = useRef(false);
  const meta = APP_REGISTRY[win.appId];

  useEffect(() => {
    if (interacting.current || win.exiting) return;
    setMotionValue(x, win.rect.x + area.left);
    setMotionValue(y, win.rect.y + area.top);
    setMotionValue(w, win.rect.w);
    setMotionValue(h, win.rect.h);
  }, [
    area.left,
    area.top,
    h,
    w,
    win.exiting,
    win.rect.h,
    win.rect.w,
    win.rect.x,
    win.rect.y,
    x,
    y,
  ]);

  // Animate UI Dialog uses its 0.2s dismiss transition for a closing popup.
  // Keep the manager record for that exact visual lifetime, then remove it.
  useEffect(() => {
    if (!win.exiting) return;
    const timer = window.setTimeout(onExitComplete, 220);
    return () => window.clearTimeout(timer);
  }, [onExitComplete, win.exiting]);

  const startDrag = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (event.button !== 0 || win.maximized || win.exiting) return;
      if ((event.target as HTMLElement).closest(".window-control")) return;

      event.preventDefault();
      onFocus();
      interacting.current = true;

      const startX = event.clientX;
      const startY = event.clientY;
      const originX = x.get();
      const originY = y.get();
      const currentW = w.get();
      const currentH = h.get();

      const onMoveEvent = (moveEvent: PointerEvent) => {
        const nextX = originX + (moveEvent.clientX - startX);
        const nextY = originY + (moveEvent.clientY - startY);
        x.set(
          Math.min(
            Math.max(nextX, area.left - currentW + 120),
            Math.max(area.left + area.w - 120, area.left),
          ),
        );
        y.set(
          Math.min(
            Math.max(nextY, area.top),
            Math.max(area.top + area.h - 48, area.top),
          ),
        );
      };

      const onUp = (upEvent: PointerEvent) => {
        window.removeEventListener("pointermove", onMoveEvent);
        window.removeEventListener("pointerup", onUp);
        interacting.current = false;

        const relativeX = upEvent.clientX - area.left;
        if (upEvent.clientY - area.top <= 4) {
          onToggleMaximize();
          return;
        }
        if (relativeX <= 6) {
          onSnap("left");
          return;
        }
        if (area.w - relativeX <= 6) {
          onSnap("right");
          return;
        }
        onMove({
          x: x.get() - area.left,
          y: y.get() - area.top,
          w: currentW,
          h: currentH,
        });
      };

      window.addEventListener("pointermove", onMoveEvent);
      window.addEventListener("pointerup", onUp);
    },
    [
      area,
      h,
      onFocus,
      onMove,
      onSnap,
      onToggleMaximize,
      w,
      win.exiting,
      win.maximized,
      x,
      y,
    ],
  );

  const startResize = useCallback(
    (direction: ResizeDirection) =>
      (event: React.PointerEvent<HTMLElement>) => {
        if (event.button !== 0 || win.exiting) return;
        event.preventDefault();
        event.stopPropagation();
        onFocus();
        interacting.current = true;

        const startX = event.clientX;
        const startY = event.clientY;
        const origin = { x: x.get(), y: y.get(), w: w.get(), h: h.get() };

        const onMoveEvent = (moveEvent: PointerEvent) => {
          const dx = moveEvent.clientX - startX;
          const dy = moveEvent.clientY - startY;
          const next = { ...origin };

          if (direction.includes("e")) next.w = Math.max(MIN_W, origin.w + dx);
          if (direction.includes("s")) next.h = Math.max(MIN_H, origin.h + dy);
          if (direction.includes("w")) {
            const nextWidth = Math.max(MIN_W, origin.w - dx);
            next.w = nextWidth;
            next.x = origin.x + (origin.w - nextWidth);
          }
          if (direction.includes("n")) {
            const nextHeight = Math.max(MIN_H, origin.h - dy);
            next.h = nextHeight;
            next.y = Math.max(area.top, origin.y + (origin.h - nextHeight));
          }

          next.w = Math.min(next.w, area.w);
          next.h = Math.min(next.h, area.h);
          x.set(next.x);
          y.set(next.y);
          w.set(next.w);
          h.set(next.h);
        };

        const onUp = () => {
          window.removeEventListener("pointermove", onMoveEvent);
          window.removeEventListener("pointerup", onUp);
          interacting.current = false;
          onResize({
            x: x.get() - area.left,
            y: y.get() - area.top,
            w: w.get(),
            h: h.get(),
          });
        };

        window.addEventListener("pointermove", onMoveEvent);
        window.addEventListener("pointerup", onUp);
      },
    [area, h, onFocus, onResize, w, win.exiting, x, y],
  );

  const handles: ResizeDirection[] = [
    "n",
    "s",
    "e",
    "w",
    "ne",
    "nw",
    "se",
    "sw",
  ];

  return (
    <Dialog.Root
      open={!win.exiting}
      modal={false}
      disablePointerDismissal
      onOpenChange={(open) => {
        if (!open && !win.exiting) onClose();
      }}
    >
      <Dialog.Portal>
        <motion.div
          className="window-geometry"
          style={{ x, y, width: w, height: h, zIndex: win.z }}
          onPointerDown={onFocus}
        >
          <Dialog.Popup
            from="top"
            className={`window${win.maximized ? " is-maximized" : ""}${!isTop ? " is-inactive" : ""}`}
            initialFocus={false}
            finalFocus={false}
            aria-label={meta.title}
          >
            <header
              className="window-titlebar"
              onPointerDown={startDrag}
              onDoubleClick={onToggleMaximize}
            >
              <span className="window-title">{win.title}</span>

              <div
                className="window-title-actions"
                aria-label="Window controls"
              >
                <WorkspaceTooltip
                  label={win.maximized ? "Restore window" : "Maximize window"}
                >
                  <button
                    type="button"
                    className="window-control"
                    onClick={onToggleMaximize}
                    aria-label={
                      win.maximized ? "Restore window" : "Maximize window"
                    }
                  >
                    <HugeiconsIcon
                      icon={win.maximized ? Copy01Icon : Maximize02Icon}
                      strokeWidth={2}
                      size={15}
                    />
                  </button>
                </WorkspaceTooltip>
                <WorkspaceTooltip label="Close window">
                  <button
                    type="button"
                    className="window-control window-control-close"
                    onClick={onClose}
                    aria-label="Close window"
                  >
                    <HugeiconsIcon
                      icon={Cancel01Icon}
                      strokeWidth={2}
                      size={16}
                    />
                  </button>
                </WorkspaceTooltip>
              </div>
            </header>

            <div className="window-body">{children}</div>

            {!win.maximized &&
              !win.exiting &&
              handles.map((direction) => (
                <span
                  key={direction}
                  className={`resize-handle ${direction}`}
                  onPointerDown={startResize(direction)}
                  aria-hidden
                />
              ))}
          </Dialog.Popup>
        </motion.div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
