"use client";

import { AppBody } from "@/components/apps/AppBody";
import type { WindowManager } from "@/hooks/useWindowManager";
import type { Area } from "@/lib/windows";
import { APP_REGISTRY, usesRouteContent, type AppId } from "@/lib/registry";
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
  return (
    <>
      {windows.map((windowState) => (
        <Window
          key={windowState.id}
          win={windowState}
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
                  snapshot={snapshots[windowState.appId]}
                  title={APP_REGISTRY[windowState.appId].title}
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
