"use client";

import { FileTextIcon, Settings02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { APP_REGISTRY, DESKTOP_APPS, type AppId } from "@/lib/registry";
import { ShortcutContextMenu } from "./ContextMenu";

type Marquee = { x1: number; y1: number; x2: number; y2: number };

function ShortcutGlyph({ appId }: { appId: AppId }) {
  return (
    <HugeiconsIcon
      icon={appId === "settings" ? Settings02Icon : FileTextIcon}
      strokeWidth={2}
      size={19}
      aria-hidden
    />
  );
}

export function DesktopIcons({ onOpen }: { onOpen: (appId: AppId) => void }) {
  const [selected, setSelected] = useState<Set<AppId>>(new Set());
  const [renaming, setRenaming] = useState<AppId | null>(null);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [marquee, setMarquee] = useState<Marquee | null>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Marquee | null>(null);

  const commitRename = useCallback((appId: AppId, value: string) => {
    const clean = value.trim();
    if (clean) setLabels((current) => ({ ...current, [appId]: clean }));
    setRenaming(null);
  }, []);

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
      if ((event.target as HTMLElement)?.tagName === "INPUT") return;
      const only = selected.size === 1 ? [...selected][0] : null;
      if (event.key === "Enter" && only) onOpen(only);
      if (event.key === "F2" && only) {
        event.preventDefault();
        setRenaming(only);
      }
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
        const label = labels[appId] ?? meta.title;
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
              onDoubleClick={() => onOpen(appId)}
              aria-label={label}
            >
              <span className="shortcut-icon">
                <ShortcutGlyph appId={appId} />
              </span>

              {renaming === appId ? (
                <input
                  className="shortcut-rename"
                  defaultValue={label}
                  autoFocus
                  onFocus={(event) => event.currentTarget.select()}
                  onBlur={(event) =>
                    commitRename(appId, event.currentTarget.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter")
                      commitRename(appId, event.currentTarget.value);
                    if (event.key === "Escape") setRenaming(null);
                  }}
                  onPointerDown={(event) => event.stopPropagation()}
                  aria-label="Rename"
                />
              ) : (
                <span className="shortcut-label">{label}</span>
              )}
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
