"use client";

import {
  FileTextIcon,
  Settings02Icon,
  Folder01Icon,
  Notebook01Icon,
  News01Icon,
  BookOpen01Icon,
  Book02Icon,
  Bookmark01Icon,
  Mail01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { APP_REGISTRY, DESKTOP_APPS, type AppId } from "@/lib/registry";
import { ShortcutContextMenu } from "./ContextMenu";

type Marquee = { x1: number; y1: number; x2: number; y2: number };

function ShortcutGlyph({ appId }: { appId: AppId }) {
  return (
    <HugeiconsIcon
      icon={
        {
          settings: Settings02Icon,
          resume: FileTextIcon,
          projects: Folder01Icon,
          blog: Notebook01Icon,
          articles: News01Icon,
          tutorials: BookOpen01Icon,
          glossary: Book02Icon,
          bookmarks: Bookmark01Icon,
          contact: Mail01Icon,
        }[appId]
      }
      strokeWidth={2}
      size={19}
      aria-hidden
    />
  );
}

export function DesktopIcons({ onOpen }: { onOpen: (appId: AppId) => void }) {
  const [selected, setSelected] = useState<Set<AppId>>(new Set());
  const [marquee, setMarquee] = useState<Marquee | null>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Marquee | null>(null);

  const beginMarquee = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      if ((event.target as HTMLElement).closest(".desktop-shortcut")) return;

      const rect = layerRef.current!.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      dragRef.current = { x1: x, y1: y, x2: x, y2: y };
      setMarquee(dragRef.current);
      if (!event.ctrlKey && !event.metaKey) setSelected(new Set());

      const onMove = (moveEvent: PointerEvent) => {
        if (!dragRef.current) return;
        dragRef.current = {
          ...dragRef.current,
          x2: moveEvent.clientX - rect.left,
          y2: moveEvent.clientY - rect.top,
        };
        setMarquee({ ...dragRef.current });
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        dragRef.current = null;
        setMarquee(null);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      // Native shortcut buttons already handle Enter. Never intercept keyboard
      // input inside windows, links, form controls, menus or editable text.
      if (target.closest(".desktop-shortcut")) {
        if (event.key === "Escape") setSelected(new Set());
        return;
      }
      const onDesktop =
        layerRef.current?.contains(target) ||
        (target === document.body &&
          !document.querySelector(".window-geometry"));
      if (!onDesktop) return;
      const only = selected.size === 1 ? [...selected][0] : null;
      if (event.key === "Enter" && only) onOpen(only);
      if (event.key === "Escape") setSelected(new Set());
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, onOpen]);

  const box = marquee
    ? {
        left: Math.min(marquee.x1, marquee.x2),
        top: Math.min(marquee.y1, marquee.y2),
        width: Math.abs(marquee.x2 - marquee.x1),
        height: Math.abs(marquee.y2 - marquee.y1),
      }
    : null;

  return (
    <div className="desktop-grid" ref={layerRef} onPointerDown={beginMarquee}>
      {DESKTOP_APPS.map((appId) => {
        const meta = APP_REGISTRY[appId];
        const label = meta.title;
        const isSelected = selected.has(appId);

        return (
          <ShortcutContextMenu key={appId} appId={appId} onOpen={onOpen}>
            <button
              type="button"
              data-app={appId}
              className={`desktop-shortcut${isSelected ? " is-selected" : ""}`}
              onPointerDown={(event) => {
                event.stopPropagation();
                if (event.ctrlKey || event.metaKey) {
                  setSelected((current) => {
                    const next = new Set(current);
                    if (next.has(appId)) next.delete(appId);
                    else next.add(appId);
                    return next;
                  });
                } else {
                  setSelected(new Set([appId]));
                }
              }}
              onClick={() => onOpen(appId)}
              aria-label={label}
            >
              <span className="shortcut-icon">
                <ShortcutGlyph appId={appId} />
              </span>

              <span className="shortcut-label">{label}</span>
            </button>
          </ShortcutContextMenu>
        );
      })}

      {box && box.width > 2 && box.height > 2 && (
        <div className="marquee" style={box} aria-hidden />
      )}
    </div>
  );
}
