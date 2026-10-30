"use client";

import {
  FileTextIcon,
  Settings02Icon,
  Shield01Icon,
  Folder01Icon,
  Notebook01Icon,
  News01Icon,
  NewspaperIcon,
  BookOpen01Icon,
  Book02Icon,
  Bookmark01Icon,
  Mail01Icon,
  Image02Icon,
  Invoice02Icon,
  ChartLineData02Icon,
  Tag01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef, useState } from "react";
import { APP_REGISTRY, DESKTOP_APPS, type AppId } from "@/lib/registry";
import { ShortcutContextMenu } from "./ContextMenu";
import {
  DesktopInstallShortcut,
  PWA_INSTALL_SHORTCUT_ID,
} from "./DesktopInstallShortcut";

type Direction = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight";

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
          news: NewspaperIcon,
          categories: Folder01Icon,
          tags: Tag01Icon,
          bookmarks: Bookmark01Icon,
          contact: Mail01Icon,
          legal: Shield01Icon,
          "og-studio": Image02Icon,
          invoices: Invoice02Icon,
          insights: ChartLineData02Icon,
        }[appId]
      }
      strokeWidth={2}
      size={19}
      aria-hidden
    />
  );
}

function findSpatialNeighbor(
  buttons: HTMLButtonElement[],
  current: HTMLButtonElement,
  direction: Direction,
): HTMLButtonElement | null {
  const originRect = current.getBoundingClientRect();
  const ax = originRect.left + originRect.width / 2;
  const ay = originRect.top + originRect.height / 2;

  let best: HTMLButtonElement | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const candidate of buttons) {
    if (candidate === current) continue;
    const rect = candidate.getBoundingClientRect();
    const bx = rect.left + rect.width / 2;
    const by = rect.top + rect.height / 2;
    const dx = bx - ax;
    const dy = by - ay;

    let primary = 0;
    let cross = 0;

    if (direction === "ArrowDown") {
      if (dy <= 8) continue;
      primary = dy;
      cross = Math.abs(dx);
    } else if (direction === "ArrowUp") {
      if (dy >= -8) continue;
      primary = -dy;
      cross = Math.abs(dx);
    } else if (direction === "ArrowRight") {
      if (dx <= 8) continue;
      primary = dx;
      cross = Math.abs(dy);
    } else {
      if (dx >= -8) continue;
      primary = -dx;
      cross = Math.abs(dy);
    }

    const score = primary + cross * 2.5;
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return best;
}

export function DesktopIcons({ onOpen }: { onOpen: (appId: AppId) => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const layerRef = useRef<HTMLDivElement>(null);

  // Clicking empty desktop canvas clears any active single-icon selection.
  useEffect(() => {
    if (!selectedId) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const target = event.target as HTMLElement | null;
      if (
        target?.closest(
          ".desktop-shortcut, [role=menu], [data-slot=context-menu-content]",
        )
      ) {
        return;
      }
      setSelectedId(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [selectedId]);

  // Once a desktop icon is selected, arrow keys navigate single selection
  // spatially across the rendered shortcut grid; Enter opens; Escape clears.
  useEffect(() => {
    if (!selectedId) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      if (
        target?.closest(
          "input, textarea, select, [contenteditable=true], [role=menu], [role=listbox], [role=dialog], [role=alertdialog], .workstation-lock-curtain",
        )
      ) {
        return;
      }

      if (
        document.querySelector(".window-geometry, .workstation-lock-curtain")
      ) {
        return;
      }

      const container = layerRef.current;
      if (!container) return;

      if (event.key === "Escape") {
        event.preventDefault();
        setSelectedId(null);
        if (
          document.activeElement instanceof HTMLElement &&
          container.contains(document.activeElement)
        ) {
          document.activeElement.blur();
        }
        return;
      }

      const buttons = Array.from(
        container.querySelectorAll<HTMLButtonElement>(
          ".desktop-shortcut[data-shortcut-id]:not(:disabled)",
        ),
      );
      if (!buttons.length) return;

      const currentButton = buttons.find(
        (btn) => btn.dataset.shortcutId === selectedId,
      );
      if (!currentButton) return;

      if (event.key === "Enter") {
        // Native button focus already fires `onClick` on Enter; only trigger
        // manually when selection is active while focus sits on document/body.
        if (document.activeElement !== currentButton) {
          event.preventDefault();
          currentButton.click();
        }
        return;
      }

      let nextButton: HTMLButtonElement | null = null;
      if (
        event.key === "ArrowUp" ||
        event.key === "ArrowDown" ||
        event.key === "ArrowLeft" ||
        event.key === "ArrowRight"
      ) {
        nextButton = findSpatialNeighbor(buttons, currentButton, event.key);
      } else if (event.key === "Home") {
        nextButton = buttons[0] ?? null;
      } else if (event.key === "End") {
        nextButton = buttons[buttons.length - 1] ?? null;
      } else {
        return;
      }

      event.preventDefault();
      if (nextButton && nextButton.dataset.shortcutId) {
        setSelectedId(nextButton.dataset.shortcutId);
        nextButton.focus({ preventScroll: false });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId]);

  return (
    <div
      className="desktop-grid"
      ref={layerRef}
      onPointerDown={(event) => {
        if (
          event.button === 0 &&
          !(event.target as HTMLElement).closest(".desktop-shortcut")
        ) {
          setSelectedId(null);
        }
      }}
    >
      <DesktopInstallShortcut
        selected={selectedId === PWA_INSTALL_SHORTCUT_ID}
        onSelect={() => setSelectedId(PWA_INSTALL_SHORTCUT_ID)}
      />
      {DESKTOP_APPS.map((appId, index) => {
        const meta = APP_REGISTRY[appId];
        const label = meta.title;
        const isSelected = selectedId === appId;
        const tabStop = isSelected || (selectedId === null && index === 0);

        return (
          <ShortcutContextMenu key={appId} appId={appId} onOpen={onOpen}>
            <button
              type="button"
              data-app={appId}
              data-shortcut-id={appId}
              tabIndex={tabStop ? 0 : -1}
              className={`desktop-shortcut${isSelected ? " is-selected" : ""}`}
              onPointerDown={(event) => {
                event.stopPropagation();
                setSelectedId(appId);
              }}
              onContextMenu={() => setSelectedId(appId)}
              onFocus={() => setSelectedId(appId)}
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
    </div>
  );
}
