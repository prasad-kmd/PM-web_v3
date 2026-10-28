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
 * A card whose hairline border catches a narrow band of light as the pointer
 * moves around it.
 *
 * This is the v2 `PointerGradientBorder` idea, re-cut for DESIGN.md: no colour,
 * no rainbow, only the semantic foreground token at low alpha, so it works in
 * both themes. The angle is animated with a short requestAnimationFrame lerp
 * (0.22 per frame) instead of a CSS transition, because the target changes on
 * every pointer move. `@property --beam-angle` (declared in globals.css) makes
 * the angle itself interpolatable during the one-off arrival sweep.
 */
export function BeamCard({
  children,
  className = "",
  style,
  intro = false,
  as: Tag = "article",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Play the one-off arrival sweep the first time the card is painted. */
  intro?: boolean;
  as?: "article" | "div" | "section" | "aside";
} & Omit<HTMLAttributes<HTMLElement>, "style" | "className" | "children">) {
  const ref = useRef<HTMLElement | null>(null);
  const frame = useRef<number | null>(null);
  const angle = useRef(160);
  const target = useRef(160);
  const reduceMotion = useShouldReduceMotion();

  // The arrival sweep is one-shot: drop the attribute so hover control of the
  // ring is not held hostage by an animation's fill state afterwards.
  useEffect(() => {
    if (!intro) return;
    const timer = window.setTimeout(() => {
      ref.current?.removeAttribute("data-intro");
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [intro]);

  const stop = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  const move = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const node = ref.current;
      if (!node || reduceMotion) return;
      const rect = node.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;
      // Conic gradients start at 12 o'clock; the lit band sits opposite the
      // pointer, which is what makes the edge read as a reflection.
      const next = (Math.atan2(y, x) * 180) / Math.PI - 90;
      const current = angle.current;
      target.current =
        current + (((((next - current + 180) % 360) + 360) % 360) - 180);

      node.dataset.lit = "true";

      if (frame.current !== null) return;
      const tick = () => {
        angle.current += (target.current - angle.current) * 0.22;
        node.style.setProperty("--beam-angle", `${angle.current}deg`);
        if (Math.abs(target.current - angle.current) > 0.2) {
          frame.current = requestAnimationFrame(tick);
        } else {
          frame.current = null;
        }
      };
      frame.current = requestAnimationFrame(tick);
    },
    [reduceMotion],
  );

  const leave = useCallback(() => {
    if (ref.current) delete ref.current.dataset.lit;
    stop();
  }, [stop]);

  return (
    <Tag
      ref={ref as never}
      className={`beam ${className}`.trim()}
      style={style}
      data-beam
      {...(intro ? { "data-intro": "" } : {})}
      onPointerMove={move}
      onPointerEnter={move}
      onPointerLeave={leave}
      onPointerDown={move}
      {...rest}
    >
      {children}
    </Tag>
  );
}
