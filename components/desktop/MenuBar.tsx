"use client";

import { Moon02Icon, SunMediumIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useClock } from "@/hooks/useClock";
import { useAppearance } from "@/lib/appearance";
import type { AppId } from "@/lib/registry";
import { WorkspaceTooltip } from "@/components/ui/tooltip";
import {
  Menubar,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar";

export function MenuBar({
  onOpenApp,
  onCloseAll,
}: {
  onOpenApp: (appId: AppId) => void;
  onCloseAll: () => void;
}) {
  const { formatted } = useClock();
  const { theme, toggleTheme } = useAppearance();

  return (
    <header className="menu-bar" aria-label="Workspace menu bar">
      <div className="menu-bar-leading">
        <span className="workspace-mark" aria-label="Prasad M. workspace">
          PM
        </span>

        <Menubar
          className="workspace-menubar w-fit"
          aria-label="Application menus"
        >
          <MenubarMenu>
            <MenubarTrigger>File</MenubarTrigger>
            <MenubarContent>
              <MenubarGroup>
                <MenubarItem onClick={() => onOpenApp("notepad")}>
                  Open Read Me <MenubarShortcut>⌘O</MenubarShortcut>
                </MenubarItem>
                <MenubarItem onClick={() => onOpenApp("settings")}>
                  Open Settings <MenubarShortcut>⌘,</MenubarShortcut>
                </MenubarItem>
              </MenubarGroup>
              <MenubarSeparator />
              <MenubarGroup>
                <MenubarSub>
                  <MenubarSubTrigger>External links</MenubarSubTrigger>
                  <MenubarSubContent>
                    <MenubarGroup>
                      <MenubarItem
                        onClick={() =>
                          window.open(
                            "https://github.com/prasad-kmd",
                            "_blank",
                            "noopener,noreferrer",
                          )
                        }
                      >
                        GitHub profile
                      </MenubarItem>
                      <MenubarItem
                        onClick={() =>
                          window.open(
                            "https://www.pmengineer.lk",
                            "_blank",
                            "noopener,noreferrer",
                          )
                        }
                      >
                        PMEngineer.lk
                      </MenubarItem>
                    </MenubarGroup>
                  </MenubarSubContent>
                </MenubarSub>
              </MenubarGroup>
            </MenubarContent>
          </MenubarMenu>

          <MenubarMenu>
            <MenubarTrigger>View</MenubarTrigger>
            <MenubarContent>
              <MenubarGroup>
                <MenubarItem onClick={toggleTheme}>
                  Use {theme === "dark" ? "light" : "dark"} appearance
                </MenubarItem>
                <MenubarItem onClick={() => onOpenApp("settings")}>
                  Appearance settings
                </MenubarItem>
              </MenubarGroup>
            </MenubarContent>
          </MenubarMenu>

          <MenubarMenu>
            <MenubarTrigger>Window</MenubarTrigger>
            <MenubarContent>
              <MenubarGroup>
                <MenubarItem onClick={() => onOpenApp("settings")}>
                  Settings
                </MenubarItem>
                <MenubarItem onClick={() => onOpenApp("notepad")}>
                  Read Me.txt
                </MenubarItem>
              </MenubarGroup>
              <MenubarSeparator />
              <MenubarGroup>
                <MenubarItem variant="destructive" onClick={onCloseAll}>
                  Close all windows
                </MenubarItem>
              </MenubarGroup>
            </MenubarContent>
          </MenubarMenu>

          <MenubarMenu>
            <MenubarTrigger>Help</MenubarTrigger>
            <MenubarContent>
              <MenubarGroup>
                <MenubarItem onClick={() => onOpenApp("notepad")}>
                  About this workspace
                </MenubarItem>
              </MenubarGroup>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      </div>

      <div className="menu-bar-status">
        <WorkspaceTooltip
          label={
            theme === "dark"
              ? "Switch to light appearance"
              : "Switch to dark appearance"
          }
        >
          <button
            type="button"
            className="menu-bar-icon-btn"
            onClick={toggleTheme}
            aria-label="Toggle appearance"
          >
            <HugeiconsIcon
              icon={theme === "dark" ? SunMediumIcon : Moon02Icon}
              strokeWidth={2}
              size={16}
            />
          </button>
        </WorkspaceTooltip>
        <time className="menu-bar-clock">{formatted}</time>
      </div>
    </header>
  );
}
