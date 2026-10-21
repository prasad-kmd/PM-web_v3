"use client";

import { AppBody } from "@/components/apps/AppBody";
import type { WindowManager } from "@/hooks/useWindowManager";
import type { Area } from "@/lib/windows";
import { Window } from "./Window";

export function WindowsLayer({
  windows,
  area,
  manager,
}: {
  windows: WindowManager["windows"];
  area: Area;
  manager: WindowManager;
}) {
  return (
    <>
      {windows.map((win) => (
        <Window
          key={win.id}
          win={win}
          area={area}
          isTop={win.id === manager.topId}
          onFocus={() => manager.focus(win.id)}
          onMove={(rect) => manager.move(win.id, rect)}
          onResize={(rect) => manager.resize(win.id, rect)}
          onToggleMaximize={() => manager.toggleMaximize(win.id)}
          onSnap={(layout) => manager.snap(win.id, layout)}
          onMinimize={() => manager.minimize(win.id)}
          onClose={() => manager.close(win.id)}
          onExitComplete={() => manager.finishExit(win.id)}
        >
          <AppBody appId={win.appId} />
        </Window>
      ))}
    </>
  );
}
