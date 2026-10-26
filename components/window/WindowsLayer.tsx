"use client";

import { AppBody } from "@/components/apps/AppBody";
import type { WindowManager } from "@/hooks/useWindowManager";
import type { Area } from "@/lib/windows";
import { Window } from "./Window";

export function WindowsLayer({
  windows,
  area,
  manager,
  isMobile,
}: {
  windows: WindowManager["windows"];
  area: Area;
  manager: WindowManager;
  isMobile: boolean;
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
          <AppBody
            appId={windowState.appId}
            onNavigateHome={manager.closeAll}
          />
        </Window>
      ))}
    </>
  );
}
