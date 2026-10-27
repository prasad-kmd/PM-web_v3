"use client";

import { AppBody } from "@/components/apps/AppBody";
import type { WindowManager } from "@/hooks/useWindowManager";
import type { Area } from "@/lib/windows";
import { usesRouteContent, type AppId } from "@/lib/registry";
import { FrozenRouteSurface, LiveRouteSurface } from "./RouteContentSurface";
import type { ReactNode } from "react";
import { Window } from "./Window";

export function WindowsLayer({
  windows,
  area,
  manager,
  isMobile,
  routeApp,
  routeContent,
  snapshots,
  captureSnapshot,
  hydrated,
}: {
  windows: WindowManager["windows"];
  area: Area;
  manager: WindowManager;
  isMobile: boolean;
  routeApp: AppId | null;
  routeContent: ReactNode;
  snapshots: Partial<Record<AppId, HTMLElement>>;
  captureSnapshot: (appId: AppId, node: HTMLElement) => void;
  hydrated: boolean;
}) {
  // Window z values grow on every focus; render their rank instead so windows
  // stay below portaled popovers/dialogs (z-50) and the menu bar (55).
  const stackRank = new Map(
    [...windows]
      .sort((a, b) => a.z - b.z)
      .map((windowState, index) => [windowState.id, 11 + index]),
  );
  return (
    <>
      {windows.map((windowState) => (
        <Window
          key={windowState.id}
          win={windowState}
          stackIndex={stackRank.get(windowState.id) ?? 11}
          area={area}
          isTop={windowState.id === manager.topId}
          isMobile={isMobile}
          onFocus={() => manager.focus(windowState.id)}
          onMove={(rect) => manager.move(windowState.id, rect)}
          onResize={(rect) => manager.resize(windowState.id, rect)}
          onToggleMaximize={() => manager.toggleMaximize(windowState.id)}
          onSnap={(layout) => manager.snap(windowState.id, layout)}
          onClose={() => manager.close(windowState.id)}
          onExitComplete={() => manager.finishExit(windowState.id)}
          onOpenApp={(appId) => manager.open(appId)}
        >
          {usesRouteContent(windowState.appId) ? (
            hydrated ? (
              windowState.appId === routeApp ? (
                <LiveRouteSurface
                  appId={windowState.appId}
                  capture={captureSnapshot}
                >
                  {routeContent}
                </LiveRouteSurface>
              ) : (
                <FrozenRouteSurface
                  appId={windowState.appId}
                  snapshot={snapshots[windowState.appId]}
                />
              )
            ) : null
          ) : (
            <AppBody
              appId={windowState.appId}
              onNavigateHome={manager.closeAll}
            />
          )}
        </Window>
      ))}
    </>
  );
}
