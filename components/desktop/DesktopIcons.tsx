"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { APP_REGISTRY, DESKTOP_APPS, type AppId } from "@/lib/registry";

type Marquee = { x1: number; y1: number; x2: number; y2: number };

export function DesktopIcons({
  onOpen,
  onContextMenu,
}: {
  onOpen: (appId: AppId) => void;
  onContextMenu: (x: number, y: number, appId: AppId | null) => void;
}) {
  const [selected, setSelected] = useState<Set<AppId>>(new Set());
  const [renaming, setRenaming] = useState<AppId | null>(null);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [marquee, setMarquee] = useState<Marquee | null>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Marquee | null>(null);

  const commitRename = useCallback((appId: AppId, value: string) => {
    const clean = value.trim();
    if (clean) setLabels((l) => ({ ...l, [appId]: clean }));
    setRenaming(null);
  }, []);

  const beginMarquee = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest(".desktop-shortcut")) return;
    const rect = layerRef.current!.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    dragRef.current = { x1: x, y1: y, x2: x, y2: y };
    setMarquee(dragRef.current);
    if (!event.ctrlKey && !event.metaKey) setSelected(new Set());

    const onMove = (e: PointerEvent) => {
      if (!dragRef.current) return;
      dragRef.current = {
        ...dragRef.current,
        x2: e.clientX - rect.left,
        y2: e.clientY - rect.top,
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
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      const only = selected.size === 1 ? [...selected][0] : null;
      if (e.key === "Enter" && only) onOpen(only);
      if (e.key === "F2" && only) {
        e.preventDefault();
        setRenaming(only);
      }
      if (e.key === "Escape") setSelected(new Set());
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
    <div
      className="desktop-grid"
      ref={layerRef}
      onPointerDown={beginMarquee}
      onContextMenu={(e) => {
        e.preventDefault();
        const target = (e.target as HTMLElement).closest(".desktop-shortcut");
        const appId = target?.getAttribute("data-app") as AppId | null;
        if (appId) setSelected(new Set([appId]));
        onContextMenu(e.clientX, e.clientY, appId ?? null);
      }}
    >
      {DESKTOP_APPS.map((appId: AppId) => {
        const meta = APP_REGISTRY[appId];
        const label = labels[appId] ?? meta.title;
        const isSelected = selected.has(appId);

        return (
          <button
            key={appId}
            type="button"
            data-app={appId}
            className={`desktop-shortcut${isSelected ? " is-selected" : ""}`}
            onPointerDown={(e) => {
              e.stopPropagation();
              if (e.ctrlKey || e.metaKey) {
                setSelected((s) => {
                  const next = new Set(s);
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={meta.icon} alt="" aria-hidden />
            </span>

            {renaming === appId ? (
              <input
                className="shortcut-rename"
                defaultValue={label}
                autoFocus
                onFocus={(e) => e.currentTarget.select()}
                onBlur={(e) => commitRename(appId, e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename(appId, e.currentTarget.value);
                  if (e.key === "Escape") setRenaming(null);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                aria-label="Rename"
              />
            ) : (
              <span className="shortcut-label">{label}</span>
            )}
          </button>
        );
      })}

      {box && box.width > 2 && box.height > 2 && (
        <div className="marquee" style={box} aria-hidden />
      )}
    </div>
  );
}
