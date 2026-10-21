"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, type MotionValue, type Transition } from "framer-motion";
import { APP_REGISTRY } from "@/lib/registry";
import {
  CLOSE_TRANSITION,
  GEO_TRANSITION,
  MIN_H,
  MIN_W,
  MINIMIZE_TRANSITION,
  OPEN_TRANSITION,
  RESTORE_TRANSITION,
  type Area,
  type Rect,
  type SnapLayout,
} from "@/lib/windows";
import type { WindowState } from "@/hooks/useWindowManager";
import { SnapOverlay } from "./SnapOverlay";

type Dir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

function setMV(mv: MotionValue<number>, value: number, transition: Transition = GEO_TRANSITION) {
  if (Math.abs(mv.get() - value) < 0.5) {
    mv.set(value);
    return;
  }
  animate(mv, value, transition);
}

export function Window({
  win,
  area,
  isTop,
  onFocus,
  onMove,
  onResize,
  onToggleMaximize,
  onSnap,
  onMinimize,
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
  onMinimize: () => void;
  onClose: () => void;
  onExitComplete: () => void;
  children: React.ReactNode;
}) {
  const x = useMotionValue(win.rect.x);
  const y = useMotionValue(win.rect.y);
  const w = useMotionValue(win.rect.w);
  const h = useMotionValue(win.rect.h);
  const scale = useMotionValue(1);
  const opacity = useMotionValue(1);

  const interacting = useRef(false);
  const exitingRef = useRef(false);
  const mountedRef = useRef(false);
  const [snapOpen, setSnapOpen] = useState(false);
  const snapTimer = useRef<number | null>(null);
  const meta = APP_REGISTRY[win.appId];

  /* ---- entry animation ---- */
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    if (win.spawn === "taskbar") {
      x.set(win.anchor.cx - win.rect.w / 2);
      y.set(win.anchor.cy - win.rect.h / 2);
      scale.set(0.12);
      opacity.set(0);
      animate(x, win.rect.x, RESTORE_TRANSITION);
      animate(y, win.rect.y, RESTORE_TRANSITION);
      animate(scale, 1, RESTORE_TRANSITION);
      animate(opacity, 1, { duration: 0.14, ease: [0.18, 1, 0.32, 1] });
    } else {
      scale.set(0.96);
      opacity.set(0);
      animate(scale, 1, OPEN_TRANSITION);
      animate(opacity, 1, { duration: 0.16, ease: [0.22, 1, 0.36, 1] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- geometry sync ---- */
  useEffect(() => {
    if (interacting.current || exitingRef.current) return;
    setMV(x, win.rect.x);
    setMV(y, win.rect.y);
    setMV(w, win.rect.w);
    setMV(h, win.rect.h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [win.rect.x, win.rect.y, win.rect.w, win.rect.h]);

  /* ---- exit animation ---- */
  useEffect(() => {
    if (!win.exiting || exitingRef.current) return;
    exitingRef.current = true;

    if (win.exiting === "minimize") {
      animate(x, win.anchor.cx - w.get() / 2, MINIMIZE_TRANSITION);
      animate(y, win.anchor.cy - h.get() / 2, MINIMIZE_TRANSITION);
      animate(scale, 0.1, MINIMIZE_TRANSITION);
      animate(opacity, 0, { duration: 0.2, ease: [0.38, 0, 0.9, 1] });
    } else {
      animate(scale, 0.94, CLOSE_TRANSITION);
      animate(opacity, 0, CLOSE_TRANSITION);
    }

    const total = win.exiting === "minimize" ? 250 : 170;
    const t = window.setTimeout(onExitComplete, total);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [win.exiting]);

  /* ---- drag by titlebar ---- */
  const startDrag = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (event.button !== 0 || win.maximized || win.exiting) return;
      if ((event.target as HTMLElement).closest(".traffic-btn")) return;
      event.preventDefault();
      onFocus();
      interacting.current = true;

      const startX = event.clientX;
      const startY = event.clientY;
      const originX = x.get();
      const originY = y.get();
      const curW = w.get();
      const curH = h.get();

      const onMove_ = (e: PointerEvent) => {
        const nx = originX + (e.clientX - startX);
        const ny = originY + (e.clientY - startY);
        x.set(Math.min(Math.max(nx, -curW + 120), Math.max(area.w - 120, 0)));
        y.set(Math.min(Math.max(ny, 0), Math.max(area.h - 48, 0)));
      };

      const onUp = (e: PointerEvent) => {
        window.removeEventListener("pointermove", onMove_);
        window.removeEventListener("pointerup", onUp);
        interacting.current = false;

        const relX = e.clientX - area.left;
        if (e.clientY - area.top <= 4) {
          onToggleMaximize();
          return;
        }
        if (relX <= 6) {
          onSnap("left");
          return;
        }
        if (area.w - relX <= 6) {
          onSnap("right");
          return;
        }
        onMove({ x: x.get(), y: y.get(), w: curW, h: curH });
      };

      window.addEventListener("pointermove", onMove_);
      window.addEventListener("pointerup", onUp);
    },
    [area, onFocus, onMove, onSnap, onToggleMaximize, x, y, w, h, win.maximized, win.exiting],
  );

  /* ---- resize by 8 handles ---- */
  const startResize = useCallback(
    (dir: Dir) => (event: React.PointerEvent<HTMLElement>) => {
      if (event.button !== 0 || win.exiting) return;
      event.preventDefault();
      event.stopPropagation();
      onFocus();
      interacting.current = true;

      const startX = event.clientX;
      const startY = event.clientY;
      const o = { x: x.get(), y: y.get(), w: w.get(), h: h.get() };

      const onMove_ = (e: PointerEvent) => {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        let next = { ...o };

        if (dir.includes("e")) next.w = Math.max(MIN_W, o.w + dx);
        if (dir.includes("s")) next.h = Math.max(MIN_H, o.h + dy);
        if (dir.includes("w")) {
          const nw = Math.max(MIN_W, o.w - dx);
          next.w = nw;
          next.x = o.x + (o.w - nw);
        }
        if (dir.includes("n")) {
          const nh = Math.max(MIN_H, o.h - dy);
          next.h = nh;
          next.y = Math.max(0, o.y + (o.h - nh));
        }

        next.w = Math.min(next.w, area.w);
        next.h = Math.min(next.h, area.h);
        x.set(next.x);
        y.set(next.y);
        w.set(next.w);
        h.set(next.h);
      };

      const onUp = () => {
        window.removeEventListener("pointermove", onMove_);
        window.removeEventListener("pointerup", onUp);
        interacting.current = false;
        onResize({ x: x.get(), y: y.get(), w: w.get(), h: h.get() });
      };

      window.addEventListener("pointermove", onMove_);
      window.addEventListener("pointerup", onUp);
    },
    [area, onFocus, onResize, x, y, w, h, win.exiting],
  );

  /* ---- snap layout flyout on green zoom button hover ---- */
  const showSnap = useCallback(() => {
    if (snapTimer.current) window.clearTimeout(snapTimer.current);
    snapTimer.current = window.setTimeout(() => setSnapOpen(true), 400);
  }, []);
  const hideSnap = useCallback(() => {
    if (snapTimer.current) window.clearTimeout(snapTimer.current);
    snapTimer.current = window.setTimeout(() => setSnapOpen(false), 120);
  }, []);
  useEffect(() => {
    return () => {
      if (snapTimer.current) window.clearTimeout(snapTimer.current);
    };
  }, []);

  const handles: Dir[] = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];

  return (
    <motion.section
      className={`window${win.maximized ? " is-maximized" : ""}${!isTop ? " is-inactive" : ""}`}
      style={{
        x,
        y,
        width: w,
        height: h,
        scale,
        opacity,
        zIndex: win.z,
        transformOrigin: "center",
      }}
      onPointerDown={onFocus}
      role="dialog"
      aria-label={meta.title}
    >
      <header
        className="window-titlebar"
        onPointerDown={startDrag}
        onDoubleClick={onToggleMaximize}
      >
        {/* macOS Traffic Lights */}
        <div className="traffic-lights" aria-label="Window controls">
          <button
            type="button"
            className="traffic-btn traffic-close"
            onClick={onClose}
            aria-label="Close"
            title="Close"
          >
            <span className="traffic-glyph">✕</span>
          </button>
          <button
            type="button"
            className="traffic-btn traffic-minimize"
            onClick={onMinimize}
            aria-label="Minimize"
            title="Minimize"
          >
            <span className="traffic-glyph">—</span>
          </button>
          <button
            type="button"
            className="traffic-btn traffic-zoom"
            onClick={onToggleMaximize}
            onMouseEnter={showSnap}
            onMouseLeave={hideSnap}
            aria-label={win.maximized ? "Restore" : "Zoom"}
            title={win.maximized ? "Restore" : "Zoom"}
          >
            <span className="traffic-glyph">⤢</span>
          </button>
        </div>

        {/* Centered Window Title */}
        <span className="window-title">{win.title}</span>

        {/* Empty placeholder on the right for symmetry */}
        <div style={{ width: 50 }} aria-hidden />
      </header>

      <div className="window-body">{children}</div>

      {!win.maximized &&
        !win.exiting &&
        handles.map((dir) => (
          <span
            key={dir}
            className={`resize-handle ${dir}`}
            onPointerDown={startResize(dir)}
            aria-hidden
          />
        ))}

      {snapOpen && !win.exiting && (
        <SnapOverlay
          onPick={(layout) => {
            setSnapOpen(false);
            onSnap(layout);
          }}
          onDismiss={() => setSnapOpen(false)}
        />
      )}
    </motion.section>
  );
}
