"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import type { AppId } from "@/lib/registry";

/** Next's layout router is live context, not a cacheable React element. Keep a
 * visual, inert snapshot for unfocused windows; remount the real route when the
 * window regains focus so links, metadata and browser history stay correct. */
export function LiveRouteSurface({
  appId,
  children,
  capture,
}: {
  appId: AppId;
  children: ReactNode;
  capture: (appId: AppId, node: HTMLElement) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(
    () => () => {
      if (ref.current)
        capture(appId, ref.current.cloneNode(true) as HTMLElement);
    },
    [appId, capture],
  );
  return (
    <div ref={ref} className="route-content-surface">
      {children}
    </div>
  );
}
export function FrozenRouteSurface({
  snapshot,
  title,
}: {
  snapshot?: HTMLElement;
  title: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!ref.current || !snapshot) return;
    const clone = snapshot.cloneNode(true) as HTMLElement;
    clone.removeAttribute("id");
    clone
      .querySelectorAll("[id]")
      .forEach((element) => element.removeAttribute("id"));
    ref.current.replaceChildren(clone);
  }, [snapshot]);
  return (
    <div className="route-frozen-surface" inert aria-hidden="true">
      {snapshot ? (
        <div ref={ref} />
      ) : (
        <p className="cms-route-wait">Opening {title}…</p>
      )}
    </div>
  );
}
