"use client";

import { Moon02Icon, SunMediumIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useAppearance } from "@/lib/appearance";
import { APP_REGISTRY, DESKTOP_APPS, type AppId } from "@/lib/registry";
import { WorkspaceTooltip } from "@/components/ui/tooltip";
import {
  Menubar,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { ClockPopover } from "./ClockPopover";

export function MenuBar({
  onOpenApp,
  onCloseAll,
}: {
  onOpenApp: (appId: AppId) => void;
  onCloseAll: () => void;
}) {
  const { theme, toggleTheme, nextWallpaper } = useAppearance();

  const openResumeSection = (section?: string) => {
    onOpenApp("resume");
    if (!section) return;
    window.setTimeout(() => {
      document.getElementById(`resume-${section}`)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 140);
  };

  return (
    <header className="menu-bar" aria-label="Workspace menu bar">
      <div className="menu-bar-leading">
        {/* Replace this shared portrait file when the final photo is ready. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="workspace-profile-photo"
          src="/images/profile-placeholder.jpg"
          alt="Prasad Madhuranga"
        />

        <Menubar
          className="workspace-menubar w-fit"
          aria-label="Application menus"
        >
          <MenubarMenu>
            <MenubarTrigger>File</MenubarTrigger>
            <MenubarContent>
              <MenubarGroup>
                <MenubarItem onClick={() => onOpenApp("resume")}>
                  Open Resume <MenubarShortcut>⌘O</MenubarShortcut>
                </MenubarItem>
                <MenubarItem onClick={() => onOpenApp("settings")}>
                  Open Settings <MenubarShortcut>⌘,</MenubarShortcut>
                </MenubarItem>
              </MenubarGroup>
              <MenubarSeparator />
              <MenubarItem variant="destructive" onClick={onCloseAll}>
                Close all windows
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          <MenubarMenu>
            <MenubarTrigger className="menu-bar-optional-trigger">
              Explore
            </MenubarTrigger>
            <MenubarContent>
              <MenubarGroup>
                <MenubarItem onClick={() => openResumeSection()}>
                  Portfolio / Resume
                </MenubarItem>
                {(
                  [
                    "projects",
                    "blog",
                    "articles",
                    "tutorials",
                    "glossary",
                    "bookmarks",
                  ] as AppId[]
                ).map((id) => (
                  <MenubarItem key={id} onClick={() => onOpenApp(id)}>
                    {APP_REGISTRY[id].title}
                  </MenubarItem>
                ))}
                <MenubarItem onClick={() => openResumeSection("experience")}>
                  Experience
                </MenubarItem>
                <MenubarItem onClick={() => openResumeSection("education")}>
                  Education
                </MenubarItem>
                <MenubarItem onClick={() => openResumeSection("interests")}>
                  Interests
                </MenubarItem>
                <MenubarItem onClick={() => openResumeSection("languages")}>
                  Languages
                </MenubarItem>
              </MenubarGroup>
            </MenubarContent>
          </MenubarMenu>

          <MenubarMenu>
            <MenubarTrigger className="menu-bar-optional-trigger">
              View
            </MenubarTrigger>
            <MenubarContent>
              <MenubarGroup>
                <MenubarItem onClick={toggleTheme}>
                  Use {theme === "dark" ? "light" : "dark"} appearance
                </MenubarItem>
                <MenubarItem onClick={nextWallpaper}>
                  Next wallpaper
                </MenubarItem>
                <MenubarItem onClick={() => onOpenApp("settings")}>
                  Appearance settings
                </MenubarItem>
              </MenubarGroup>
            </MenubarContent>
          </MenubarMenu>

          <MenubarMenu>
            <MenubarTrigger className="menu-bar-optional-trigger">
              Window
            </MenubarTrigger>
            <MenubarContent>
              <MenubarGroup>
                {DESKTOP_APPS.map((id) => (
                  <MenubarItem key={id} onClick={() => onOpenApp(id)}>
                    {APP_REGISTRY[id].title}
                  </MenubarItem>
                ))}
              </MenubarGroup>
              <MenubarSeparator />
              <MenubarItem variant="destructive" onClick={onCloseAll}>
                Close all windows
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          <MenubarMenu>
            <MenubarTrigger className="menu-bar-optional-trigger">
              Help
            </MenubarTrigger>
            <MenubarContent>
              <MenubarItem onClick={() => openResumeSection()}>
                About this workspace
              </MenubarItem>
              <MenubarItem onClick={() => onOpenApp("contact")}>
                Contact
              </MenubarItem>
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
            className="menu-bar-icon-btn menu-bar-theme-toggle"
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

        <ClockPopover />
      </div>
    </header>
  );
}
