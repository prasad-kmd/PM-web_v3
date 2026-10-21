"use client";

import {
  InformationCircleIcon,
  LayoutGridIcon,
  PencilEditIcon,
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
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { APP_REGISTRY, type AppId } from "@/lib/registry";

function MenuIcon({ icon }: { icon: IconSvgElement }) {
  return <HugeiconsIcon icon={icon} strokeWidth={2} size={16} />;
}

export function DesktopContextMenuContent({
  onOpenSettings,
}: {
  onOpenSettings: () => void;
}) {
  return (
    <ContextMenuContent className="w-56">
      <ContextMenuGroup>
        <ContextMenuItem onClick={onOpenSettings}>
          <MenuIcon icon={Settings02Icon} />
          Open Settings
        </ContextMenuItem>
        <ContextMenuItem onClick={() => toast.success("Desktop organized")}>
          <MenuIcon icon={Refresh01Icon} />
          Clean up icons
        </ContextMenuItem>
      </ContextMenuGroup>
      <ContextMenuSeparator />
      <ContextMenuGroup>
        <ContextMenuItem onClick={onOpenSettings}>
          <MenuIcon icon={LayoutGridIcon} />
          Appearance settings
        </ContextMenuItem>
      </ContextMenuGroup>
      <ContextMenuSeparator />
      <ContextMenuGroup>
        <ContextMenuItem
          onClick={() => toast.info("Engineering Workspace · Next.js 16")}
        >
          <MenuIcon icon={InformationCircleIcon} />
          About Prasad M. Workspace
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
      <ContextMenuTrigger className="desktop-context-trigger">
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuGroup>
          <ContextMenuItem onClick={() => onOpen(appId)}>
            <MenuIcon icon={Settings02Icon} />
            Open
            <ContextMenuShortcut>↵</ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuGroup>
        <ContextMenuSeparator />
        <ContextMenuGroup>
          <ContextMenuItem
            onClick={() =>
              toast("Select the shortcut and press F2 to rename it.")
            }
          >
            <MenuIcon icon={PencilEditIcon} />
            Rename
            <ContextMenuShortcut>F2</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem onClick={() => toast.info(meta.description)}>
            <MenuIcon icon={InformationCircleIcon} />
            Get info
          </ContextMenuItem>
        </ContextMenuGroup>
      </ContextMenuContent>
    </ContextMenu>
  );
}
