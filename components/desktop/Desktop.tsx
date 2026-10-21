"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Toaster } from "sonner";
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";
import { WindowsLayer } from "@/components/window/WindowsLayer";
import { useWindowManager } from "@/hooks/useWindowManager";
import type { AppId } from "@/lib/registry";
import type { Area } from "@/lib/windows";
import { DesktopContextMenuContent } from "./ContextMenu";
import { DesktopIcons } from "./DesktopIcons";
import { MenuBar } from "./MenuBar";

export function Desktop() {
  const [area, setArea] = useState<Area>({ w: 1280, h: 720, left: 0, top: 40 });
  const workRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = workRef.current;
    if (!element) return;

    const measure = () => {
      const rect = element.getBoundingClientRect();
      setArea({
        w: rect.width,
        h: rect.height,
        left: rect.left,
        top: rect.top,
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const manager = useWindowManager(area);
  const openApp = useCallback((appId: AppId) => manager.open(appId), [manager]);

  return (
    <div className="desktop-root">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="desktop-background"
        src="/images/desktop-bloom-wallpaper.webp"
        alt=""
        aria-hidden
      />
      <div className="desktop-background-scrim" aria-hidden />

      <MenuBar onOpenApp={openApp} onCloseAll={manager.closeAll} />

      <ContextMenu>
        <ContextMenuTrigger className="work-area" ref={workRef}>
          <DesktopIcons onOpen={openApp} />
          <WindowsLayer
            windows={manager.windows}
            area={area}
            manager={manager}
          />
        </ContextMenuTrigger>
        <DesktopContextMenuContent onOpenSettings={() => openApp("settings")} />
      </ContextMenu>

      <Toaster position="bottom-right" closeButton />
    </div>
  );
}
