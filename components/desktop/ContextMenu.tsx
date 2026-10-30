"use client";

import { useState, type MouseEvent as ReactMouseEvent } from "react";
import {
  ArrowLeft02Icon,
  ArrowRight01Icon,
  Copy01Icon,
  Image01Icon,
  InformationCircleIcon,
  Refresh01Icon,
  Search01Icon,
  Settings02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { toast } from "sonner";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useAppearance } from "@/lib/appearance";
import { APP_REGISTRY, type AppId } from "@/lib/registry";

function MenuIcon({ icon }: { icon: IconSvgElement }) {
  return (
    <HugeiconsIcon icon={icon} strokeWidth={2} size={16} aria-hidden="true" />
  );
}

async function copyText(value: string, successMessage: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(successMessage);
  } catch {
    toast.error("Could not copy to clipboard");
  }
}

function openInNewTab(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

function linkLabel(url: string) {
  try {
    return new URL(url).hostname || "Link";
  } catch {
    return "Link";
  }
}

async function sharePage() {
  const shareData = { title: document.title, url: window.location.href };
  if (!navigator.share) {
    await copyText(shareData.url, "Page URL copied for sharing");
    return;
  }

  try {
    await navigator.share(shareData);
  } catch {
    // Dismissing the native share sheet is expected.
  }
}

export function DesktopContextMenuContent({
  onOpenSettings,
  onOpenResume,
  onOpenCommandPalette,
  targetLink,
  targetImage,
  locked = false,
}: {
  onOpenSettings?: () => void;
  onOpenResume?: () => void;
  onOpenCommandPalette?: () => void;
  targetLink: string | null;
  targetImage: string | null;
  /** Locked surfaces keep navigation/share actions but cannot open apps. */
  locked?: boolean;
}) {
  const { nextWallpaper } = useAppearance();

  return (
    <ContextMenuContent className="w-64">
      {targetLink && (
        <>
          <ContextMenuGroup>
            <ContextMenuLabel>Link · {linkLabel(targetLink)}</ContextMenuLabel>
            <ContextMenuItem onClick={() => openInNewTab(targetLink)}>
              <MenuIcon icon={ArrowRight01Icon} />
              Open link in new tab
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => void copyText(targetLink, "Link address copied")}
            >
              <MenuIcon icon={Copy01Icon} />
              Copy link address
            </ContextMenuItem>
          </ContextMenuGroup>
          <ContextMenuSeparator />
        </>
      )}

      {targetImage && (
        <>
          <ContextMenuGroup>
            <ContextMenuLabel>Image</ContextMenuLabel>
            <ContextMenuItem onClick={() => openInNewTab(targetImage)}>
              <MenuIcon icon={ArrowRight01Icon} />
              Open image in new tab
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => void copyText(targetImage, "Image URL copied")}
            >
              <MenuIcon icon={Copy01Icon} />
              Copy image URL
            </ContextMenuItem>
          </ContextMenuGroup>
          <ContextMenuSeparator />
        </>
      )}

      <ContextMenuGroup>
        <ContextMenuLabel>Browser navigation</ContextMenuLabel>
        <ContextMenuItem onClick={() => window.history.back()}>
          <MenuIcon icon={ArrowLeft02Icon} />
          Back
        </ContextMenuItem>
        <ContextMenuItem onClick={() => window.history.forward()}>
          <MenuIcon icon={ArrowRight01Icon} />
          Forward
        </ContextMenuItem>
        <ContextMenuItem onClick={() => window.location.reload()}>
          <MenuIcon icon={Refresh01Icon} />
          Reload workspace
        </ContextMenuItem>
      </ContextMenuGroup>

      <ContextMenuSeparator />
      <ContextMenuGroup>
        <ContextMenuLabel>
          {locked ? "Locked workspace" : "Workspace"}
        </ContextMenuLabel>
        {!locked && onOpenCommandPalette ? (
          <ContextMenuItem onClick={onOpenCommandPalette}>
            <MenuIcon icon={Search01Icon} />
            Find in workspace…
          </ContextMenuItem>
        ) : null}
        <ContextMenuItem onClick={nextWallpaper}>
          <MenuIcon icon={Image01Icon} />
          Next wallpaper
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => void copyText(window.location.href, "Page URL copied")}
        >
          <MenuIcon icon={Copy01Icon} />
          Copy page URL
        </ContextMenuItem>
        <ContextMenuItem onClick={() => void sharePage()}>
          <MenuIcon icon={ArrowRight01Icon} />
          Share page
        </ContextMenuItem>
        {!locked && onOpenResume ? (
          <ContextMenuItem onClick={onOpenResume}>
            <MenuIcon icon={InformationCircleIcon} />
            Open Resume
          </ContextMenuItem>
        ) : null}
        {!locked && onOpenSettings ? (
          <ContextMenuItem onClick={onOpenSettings}>
            <MenuIcon icon={Settings02Icon} />
            Open Settings
          </ContextMenuItem>
        ) : null}
      </ContextMenuGroup>
    </ContextMenuContent>
  );
}

/**
 * Reusable Desktop context-menu surface for shell areas that live outside
 * the work area—notably the fixed menubar and the workstation lock curtain.
 * The trigger uses `display: contents`, so wrapping those fixed/full-screen
 * surfaces does not change their layout.
 */
export function DesktopContextMenu({
  children,
  className = "desktop-context-trigger",
  locked = false,
  onOpenSettings,
  onOpenResume,
  onOpenCommandPalette,
}: {
  children: React.ReactNode;
  className?: string;
  locked?: boolean;
  onOpenSettings?: () => void;
  onOpenResume?: () => void;
  onOpenCommandPalette?: () => void;
}) {
  const [contextTarget, setContextTarget] = useState<{
    link: string | null;
    image: string | null;
  }>({ link: null, image: null });

  const captureContextTarget = (event: ReactMouseEvent) => {
    const target = event.target as HTMLElement;
    const link = target.closest("a[href]") as HTMLAnchorElement | null;
    const image = target.closest("img") as HTMLImageElement | null;
    setContextTarget({
      link: link?.href ?? null,
      image: image?.src ?? null,
    });
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger
        className={className}
        onContextMenu={(event) => {
          event.preventDefault();
          captureContextTarget(event);
        }}
      >
        {children}
      </ContextMenuTrigger>
      <DesktopContextMenuContent
        locked={locked}
        onOpenSettings={onOpenSettings}
        onOpenResume={onOpenResume}
        onOpenCommandPalette={onOpenCommandPalette}
        targetLink={contextTarget.link}
        targetImage={contextTarget.image}
      />
    </ContextMenu>
  );
}

export function ShortcutContextMenu({
  appId,
  children,
  onOpen,
}: {
  appId: AppId;
  children: React.ReactNode;
  onOpen: (appId: AppId) => void;
}) {
  const meta = APP_REGISTRY[appId];

  return (
    <ContextMenu>
      <ContextMenuTrigger
        className="desktop-context-trigger"
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuGroup>
          <ContextMenuLabel>{meta.title}</ContextMenuLabel>
          <ContextMenuItem onClick={() => onOpen(appId)}>
            <MenuIcon icon={ArrowRight01Icon} />
            Open
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() =>
              window.open(meta.route, "_blank", "noopener,noreferrer")
            }
          >
            <MenuIcon icon={ArrowRight01Icon} />
            Open in new tab
          </ContextMenuItem>
        </ContextMenuGroup>
      </ContextMenuContent>
    </ContextMenu>
  );
}
