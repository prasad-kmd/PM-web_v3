"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type CSSProperties,
  type HTMLAttributes,
  type PointerEvent,
  type ReactNode,
} from "react";
import { useShouldReduceMotion } from "@animate-ui/react/utils/motion";

/**
 * React Bits' `BorderGlow`, ported to this repo.
 *
 * The original component (and v2's `PointerGradientBorder`, which was built
 * from it) writes exactly two numbers onto the card as the pointer moves:
 *
 * · `--cursor-angle`   — `atan2(dy, dx) * 180 / PI + 90`, normalised to
 *   0–360: the bearing from the centre of the card to the pointer.
 * · `--edge-proximity` — 0–100: `1 / min(cx / |dx|, cy / |dy|)`, i.e. how
 *   close the pointer is to the nearest edge.
 *
 * Everything else — which half of the rim lights up, the cone mask on the
 * bloom, the sensitivity thresholds — is CSS in globals.css. Keeping the two
 * halves apart is what makes this the same component rather than a lookalike.
 *
 * `intro` replays BorderGlow's arrival sweep with the original's timings
 * (500ms / 1500ms / 2250ms / 1500ms, angles 110° → 465°).
 */

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);
const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
const easeInCubic = (x: number) => x * x * x;

/** BorderGlow's `getEdgeProximity`, 0 in the middle of the card, 1 on an edge. */
function edgeProximity(
  width: number,
  height: number,
  x: number,
  y: number,
): number {
  const cx = width / 2;
  const cy = height / 2;
  const dx = x - cx;
  const dy = y - cy;
  let kx = Infinity;
  let ky = Infinity;
  if (dx !== 0) kx = cx / Math.abs(dx);
  if (dy !== 0) ky = cy / Math.abs(dy);
  return clamp01(1 / Math.min(kx, ky));
}

/** BorderGlow's `getCursorAngle`, in degrees, 0 at 12 o'clock, clockwise. */
function cursorAngle(
  width: number,
  height: number,
  x: number,
  y: number,
): number {
  const dx = x - width / 2;
  const dy = y - height / 2;
  if (dx === 0 && dy === 0) return 0;
  let degrees = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
  if (degrees < 0) degrees += 360;
  return degrees;
}

type AnimateOptions = {
  start?: number;
  end?: number;
  duration?: number;
  delay?: number;
  ease?: (t: number) => number;
  onUpdate: (value: number) => void;
  onEnd?: () => void;
};

/** BorderGlow's `animateValue`, with a cancel handle for unmount. */
function animateValue({
  start = 0,
  end = 100,
  duration = 1000,
  delay = 0,
  ease = easeOutCubic,
  onUpdate,
  onEnd,
}: AnimateOptions): () => void {
  let frame = 0;
  let timer = 0;
  let done = false;

  const tick = () => {
    if (done) return;
    const elapsed = performance.now() - (t0 + delay);
    const t = Math.min(elapsed / duration, 1);
    onUpdate(start + (end - start) * ease(t));
    if (t < 1) {
      frame = requestAnimationFrame(tick);
    } else if (onEnd) {
      onEnd();
    }
  };

  const t0 = performance.now();
  timer = window.setTimeout(() => {
    if (!done) frame = requestAnimationFrame(tick);
  }, delay);

  return () => {
    done = true;
    window.clearTimeout(timer);
    cancelAnimationFrame(frame);
  };
}

export function BeamCard({
  children,
  className = "",
  style,
  intro = false,
  tone = "mono",
  as: Tag = "article",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Play BorderGlow's one-off arrival sweep the first time the card paints. */
  intro?: boolean;
  /**
   * `mono` keeps DESIGN.md's monochrome foreground band. `spectrum` swaps in
   * v2's seven-colour conic, as used on the portfolio header.
   */
  tone?: "mono" | "spectrum";
  as?: "article" | "div" | "section" | "aside";
} & Omit<HTMLAttributes<HTMLElement>, "style" | "className" | "children">) {
  const ref = useRef<HTMLElement | null>(null);
  const reduceMotion = useShouldReduceMotion();

  const write = useCallback(
    (node: HTMLElement, clientX: number, clientY: number) => {
      const rect = node.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      node.style.setProperty(
        "--edge-proximity",
        (edgeProximity(rect.width, rect.height, x, y) * 100).toFixed(3),
      );
      node.style.setProperty(
        "--cursor-angle",
        `${cursorAngle(rect.width, rect.height, x, y).toFixed(3)}deg`,
      );
    },
    [],
  );

  const move = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const node = ref.current;
      if (!node || reduceMotion) return;
      write(node, event.clientX, event.clientY);
      node.dataset.hovered = "true";
    },
    [reduceMotion, write],
  );

  const leave = useCallback(() => {
    const node = ref.current;
    if (node) delete node.dataset.hovered;
  }, []);

  // BorderGlow's arrival sweep, timings included.
  useEffect(() => {
    const node = ref.current;
    if (!intro || !node || reduceMotion) return;

    const ANGLE_START = 110;
    const ANGLE_END = 465;
    const angleAt = (v: number) =>
      `${((ANGLE_END - ANGLE_START) * (v / 100) + ANGLE_START).toFixed(3)}deg`;

    node.dataset.sweep = "true";
    node.style.setProperty("--cursor-angle", `${ANGLE_START}deg`);

    const stops = [
      animateValue({
        duration: 500,
        onUpdate: (v) => node.style.setProperty("--edge-proximity", `${v}`),
      }),
      animateValue({
        ease: easeInCubic,
        duration: 1500,
        end: 50,
        onUpdate: (v) => node.style.setProperty("--cursor-angle", angleAt(v)),
      }),
      animateValue({
        ease: easeOutCubic,
        delay: 1500,
        duration: 2250,
        start: 50,
        end: 100,
        onUpdate: (v) => node.style.setProperty("--cursor-angle", angleAt(v)),
      }),
      animateValue({
        ease: easeInCubic,
        delay: 2500,
        duration: 1500,
        start: 100,
        end: 0,
        onUpdate: (v) => node.style.setProperty("--edge-proximity", `${v}`),
        onEnd: () => {
          delete node.dataset.sweep;
        },
      }),
    ];

    return () => {
      stops.forEach((stop) => stop());
      delete node.dataset.sweep;
    };
  }, [intro, reduceMotion]);

  return (
    <Tag
      ref={ref as never}
      className={`beam${tone === "spectrum" ? " beam-spectrum" : ""} ${className}`.trim()}
      style={style}
      data-beam
      onPointerMove={move}
      onPointerEnter={move}
      onPointerLeave={leave}
      onPointerDown={move}
      {...rest}
    >
      <span className="beam-edge" aria-hidden="true">
        <span className="beam-bloom" />
      </span>
      {children}
    </Tag>
  );
}
