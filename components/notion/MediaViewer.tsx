"use client";

import { useRef, useState, type ReactNode, type RefObject } from "react";
import { Dialog } from "@animate-ui/react/primitives/base-ui/dialog";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, Maximize02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { WorkspaceTooltip } from "@/components/ui/tooltip";

/** Shared viewport-level modal. The primitive owns focus, Escape and motion. */
export function MediaViewer({
  open,
  onOpenChange,
  title,
  children,
  actions,
  finalFocus,
  onNavigate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  finalFocus?: RefObject<HTMLElement | null>;
  onNavigate?: (direction: number) => void;
}) {
  const popup = useRef<HTMLDivElement>(null);
  const [fullscreenError, setFullscreenError] = useState("");
  async function fullscreen() {
    try {
      if (document.fullscreenElement === popup.current)
        await document.exitFullscreen();
      else {
        if (!popup.current?.requestFullscreen)
          throw new Error("Fullscreen unsupported");
        await popup.current.requestFullscreen();
      }
      setFullscreenError("");
    } catch {
      setFullscreenError(
        "Browser fullscreen is unavailable. The wide viewer is still open.",
      );
    }
  }
  function changeOpen(next: boolean) {
    if (!next && document.fullscreenElement === popup.current)
      void document.exitFullscreen().catch(() => {});
    setFullscreenError("");
    onOpenChange(next);
  }
  return (
    <Dialog.Root open={open} onOpenChange={changeOpen}>
      <Dialog.Portal>
        <Dialog.Backdrop className="media-viewer-backdrop" />
        <Dialog.Popup
          ref={popup}
          finalFocus={finalFocus}
          className="media-viewer"
          onKeyDown={(event) => {
            if (!onNavigate || event.altKey || event.ctrlKey || event.metaKey)
              return;
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
              event.preventDefault();
              event.stopPropagation();
              onNavigate(event.key === "ArrowRight" ? 1 : -1);
            }
          }}
        >
          <div className="media-viewer-toolbar">
            <Dialog.Title className="min-w-0 flex-1 truncate text-sm font-medium">
              {title}
            </Dialog.Title>
            <div className="flex flex-wrap items-center justify-end gap-1">
              {actions}
              <WorkspaceTooltip label="Browser fullscreen">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Toggle browser fullscreen"
                  onClick={fullscreen}
                >
                  <HugeiconsIcon icon={Maximize02Icon} size={18} aria-hidden />
                </Button>
              </WorkspaceTooltip>
              <Dialog.Close
                render={<Button variant="ghost" size="icon" />}
                aria-label="Close viewer"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={18} aria-hidden />
              </Dialog.Close>
            </div>
          </div>
          <Dialog.Description className="sr-only">
            Expanded media viewer. Use Escape or the close button to return to
            the page.
          </Dialog.Description>
          {fullscreenError ? (
            <p role="status" className="px-4 text-xs text-muted-foreground">
              {fullscreenError}
            </p>
          ) : null}
          <div className="media-viewer-body">{children}</div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
