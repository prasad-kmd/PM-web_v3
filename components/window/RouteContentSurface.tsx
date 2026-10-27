"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { LoadingView } from "@/components/system/states/LoadingView";
import { describeRoute } from "@/components/system/states/route-state";
import { APP_REGISTRY, type AppId } from "@/lib/registry";

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
/** Inert copy of a route window. Before its first visit there is nothing to
 * copy, so it shows the same skeleton as `app/loading.tsx` — opening a window
 * and refreshing the page now look identical while the route streams in. */
export function FrozenRouteSurface({
  appId,
  snapshot,
}: {
  appId: AppId;
  snapshot?: HTMLElement;
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
  if (!snapshot) {
    const { label, layout } = describeRoute(APP_REGISTRY[appId].route);
    return (
      <div className="route-frozen-surface is-loading">
        <LoadingView label={label} layout={layout} />
      </div>
    );
  }
  return (
    <div className="route-frozen-surface" inert aria-hidden="true">
      <div ref={ref} className="route-frozen-clone" />
    </div>
  );
}
