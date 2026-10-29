"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, Maximize02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { WorkspaceTooltip } from "@/components/ui/tooltip";

/**
 * In-window media overlay scoped to the enclosing DesktopOS `.window`
 * (falling back to the viewport if rendered outside a window).
 */
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
  const anchor = useRef<HTMLSpanElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const [hostWindow, setHostWindow] = useState<HTMLElement | null>(null);
  const [fullscreenError, setFullscreenError] = useState("");

  useLayoutEffect(() => {
    const resolved = anchor.current?.closest<HTMLElement>(".window") ?? null;
    setHostWindow((current) => (current === resolved ? current : resolved));
  }, [open]);

  async function fullscreen() {
    try {
      if (document.fullscreenElement === popup.current) {
        await document.exitFullscreen();
      } else {
        if (!popup.current?.requestFullscreen) {
          throw new Error("Fullscreen unsupported");
        }
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
    if (!next && document.fullscreenElement === popup.current) {
      void document.exitFullscreen().catch(() => {});
    }
    setFullscreenError("");
    onOpenChange(next);
  }

  function handleBodyBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement | null;
    if (!target) return;
    if (
      target.closest(
        "img, svg, .diagram-stage, figcaption, button, a, input, [role='status']",
      )
    ) {
      return;
    }
    // Ignore clicks on native scrollbars when zoomed in.
    if (
      event.nativeEvent.offsetX > target.clientWidth ||
      event.nativeEvent.offsetY > target.clientHeight
    ) {
      return;
    }
    changeOpen(false);
  }

  const inWindow = Boolean(hostWindow);

  return (
    <>
      <span ref={anchor} className="hidden" aria-hidden="true" />
      <DialogPrimitive.Root
        open={open}
        onOpenChange={changeOpen}
        modal="trap-focus"
      >
        <DialogPrimitive.Portal container={hostWindow ?? undefined}>
          <DialogPrimitive.Backdrop
            forceRender
            data-in-window={inWindow ? "" : undefined}
            className="media-viewer-backdrop"
          />
          <DialogPrimitive.Popup
            ref={popup}
            finalFocus={finalFocus}
            data-in-window={inWindow ? "" : undefined}
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
              <DialogPrimitive.Title className="min-w-0 flex-1 truncate text-sm font-medium">
                {title}
              </DialogPrimitive.Title>
              <div className="flex flex-wrap items-center justify-end gap-1">
                {actions}
                <WorkspaceTooltip label="Browser fullscreen">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Toggle browser fullscreen"
                    onClick={fullscreen}
                  >
                    <HugeiconsIcon
                      icon={Maximize02Icon}
                      size={18}
                      aria-hidden
                    />
                  </Button>
                </WorkspaceTooltip>
                <DialogPrimitive.Close
                  render={<Button variant="ghost" size="icon" />}
                  aria-label="Close viewer"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={18} aria-hidden />
                </DialogPrimitive.Close>
              </div>
            </div>
            <DialogPrimitive.Description className="sr-only">
              Expanded media viewer. Use Escape or the close button to return to
              the page.
            </DialogPrimitive.Description>
            {fullscreenError ? (
              <p
                role="status"
                className="media-viewer-notice px-4 py-1.5 text-xs text-muted-foreground"
              >
                {fullscreenError}
              </p>
            ) : null}
            <div
              className="media-viewer-body"
              onClick={handleBodyBackdropClick}
            >
              {children}
            </div>
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
