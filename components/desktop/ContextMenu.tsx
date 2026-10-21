"use client";

import {
  ArrowLeft02Icon,
  ArrowRight01Icon,
  Copy01Icon,
  InformationCircleIcon,
  Refresh01Icon,
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
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { APP_REGISTRY, type AppId } from "@/lib/registry";

function MenuIcon({ icon }: { icon: IconSvgElement }) {
  return <HugeiconsIcon icon={icon} strokeWidth={2} size={16} aria-hidden="true" />;
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
  targetLink,
  targetImage,
}: {
  onOpenSettings: () => void;
  onOpenResume: () => void;
  targetLink: string | null;
  targetImage: string | null;
}) {
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
            <ContextMenuItem onClick={() => void copyText(targetLink, "Link address copied")}>
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
            <ContextMenuItem onClick={() => void copyText(targetImage, "Image URL copied")}>
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
          <ContextMenuShortcut>Alt+←</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={() => window.history.forward()}>
          <MenuIcon icon={ArrowRight01Icon} />
          Forward
          <ContextMenuShortcut>Alt+→</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={() => window.location.reload()}>
          <MenuIcon icon={Refresh01Icon} />
          Reload workspace
          <ContextMenuShortcut>⌘R</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuGroup>

      <ContextMenuSeparator />
      <ContextMenuGroup>
        <ContextMenuLabel>Workspace</ContextMenuLabel>
        <ContextMenuItem onClick={() => void copyText(window.location.href, "Page URL copied")}>
          <MenuIcon icon={Copy01Icon} />
          Copy page URL
        </ContextMenuItem>
        <ContextMenuItem onClick={() => void sharePage()}>
          <MenuIcon icon={ArrowRight01Icon} />
          Share page
        </ContextMenuItem>
        <ContextMenuItem onClick={onOpenResume}>
          <MenuIcon icon={InformationCircleIcon} />
          Open Resume
        </ContextMenuItem>
        <ContextMenuItem onClick={onOpenSettings}>
          <MenuIcon icon={Settings02Icon} />
          Open Settings
        </ContextMenuItem>
      </ContextMenuGroup>
    </ContextMenuContent>
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
            <ContextMenuShortcut>↵</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => window.open(`/${appId}`, "_blank", "noopener,noreferrer")}
          >
            <MenuIcon icon={ArrowRight01Icon} />
            Open in new window
          </ContextMenuItem>
        </ContextMenuGroup>
      </ContextMenuContent>
    </ContextMenu>
  );
}
