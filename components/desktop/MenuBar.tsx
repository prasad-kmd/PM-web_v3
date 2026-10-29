"use client";

import {
  Copy01Icon,
  Image02Icon,
  Invoice02Icon,
  Login01Icon,
  Logout01Icon,
  Mail01Icon,
  Moon02Icon,
  RefreshIcon,
  Settings02Icon,
  Shield01Icon,
  SunMediumIcon,
  UserCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";
import { useAdminAuth } from "@/components/admin/AdminAuthProvider";
import {
  Menubar,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { WorkspaceTooltip } from "@/components/ui/tooltip";
import { useAppearance } from "@/lib/appearance";
import { APP_REGISTRY, DESKTOP_APPS, type AppId } from "@/lib/registry";
import { ClockPopover } from "./ClockPopover";

export function MenuBar({
  onOpenApp,
  onCloseAll,
}: {
  onOpenApp: (appId: AppId) => void;
  onCloseAll: () => void;
}) {
  const { theme, toggleTheme, nextWallpaper } = useAppearance();
  const {
    authenticated,
    deviceTrusted,
    openLockCurtain,
    signOut,
    forgetTrustedDevice,
    refreshContentCache,
  } = useAdminAuth();

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

  const handleCopyWorkspaceLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      toast.success("Workspace link copied.");
    } catch {
      toast.error("Could not copy link.");
    }
  };

  return (
    <header className="menu-bar" aria-label="Workspace menu bar">
      <div className="menu-bar-leading">
        <Menubar
          className="workspace-menubar w-fit"
          aria-label="Application menus"
        >
          {/* Profile photo dropdown (quiet owner sign-in & studio launcher) */}
          <MenubarMenu>
            <MenubarTrigger
              className="workspace-profile-trigger"
              aria-label="Workspace profile menu"
            >
              <span className="workspace-profile-avatar-box">
                {/* Replace this shared portrait file when the final photo is ready. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="workspace-profile-photo"
                  src="/images/profile-placeholder.jpg"
                  alt="Prasad Madhuranga"
                />
                {authenticated && (
                  <span className="workspace-profile-status-dot" aria-hidden />
                )}
              </span>
            </MenubarTrigger>

            <MenubarContent className="min-w-56">
              <div className="menubar-profile-header">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/profile-placeholder.jpg"
                  alt=""
                  className="menubar-profile-header-img"
                />
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold leading-tight text-foreground">
                    Prasad Madhuranga
                  </p>
                  <p className="truncate text-[11px] leading-tight text-muted-foreground">
                    {authenticated
                      ? "Signed in · Owner"
                      : "Mechanical + Mechatronics"}
                  </p>
                </div>
              </div>

              <MenubarSeparator />

              {authenticated ? (
                <>
                  <MenubarGroup>
                    <MenubarLabel>Studio</MenubarLabel>
                    <MenubarItem onClick={() => onOpenApp("og-studio")}>
                      <HugeiconsIcon
                        icon={Image02Icon}
                        strokeWidth={1.9}
                        size={15}
                      />
                      <span>OG Image Studio</span>
                      <MenubarShortcut>⌘⇧G</MenubarShortcut>
                    </MenubarItem>
                    <MenubarItem onClick={() => onOpenApp("invoices")}>
                      <HugeiconsIcon
                        icon={Invoice02Icon}
                        strokeWidth={1.9}
                        size={15}
                      />
                      <span>Invoice Studio</span>
                      <MenubarShortcut>⌘⇧I</MenubarShortcut>
                    </MenubarItem>
                  </MenubarGroup>

                  <MenubarSeparator />

                  <MenubarGroup>
                    <MenubarLabel>Workspace</MenubarLabel>
                    <MenubarItem onClick={() => void refreshContentCache()}>
                      <HugeiconsIcon
                        icon={RefreshIcon}
                        strokeWidth={1.9}
                        size={15}
                      />
                      <span>Refresh content</span>
                    </MenubarItem>
                    <MenubarItem onClick={() => onOpenApp("settings")}>
                      <HugeiconsIcon
                        icon={Settings02Icon}
                        strokeWidth={1.9}
                        size={15}
                      />
                      <span>Settings…</span>
                      <MenubarShortcut>⌘,</MenubarShortcut>
                    </MenubarItem>
                    {deviceTrusted && (
                      <MenubarItem onClick={() => void forgetTrustedDevice()}>
                        <HugeiconsIcon
                          icon={Shield01Icon}
                          strokeWidth={1.9}
                          size={15}
                        />
                        <span>Forget trusted browser</span>
                      </MenubarItem>
                    )}
                  </MenubarGroup>

                  <MenubarSeparator />

                  <MenubarItem
                    variant="destructive"
                    onClick={() => void signOut()}
                  >
                    <HugeiconsIcon
                      icon={Logout01Icon}
                      strokeWidth={1.9}
                      size={15}
                    />
                    <span>Sign out</span>
                  </MenubarItem>
                </>
              ) : (
                <>
                  <MenubarGroup>
                    <MenubarItem onClick={() => openResumeSection()}>
                      <HugeiconsIcon
                        icon={UserCircleIcon}
                        strokeWidth={1.9}
                        size={15}
                      />
                      <span>About Prasad</span>
                      <MenubarShortcut>⌘O</MenubarShortcut>
                    </MenubarItem>
                    <MenubarItem onClick={() => onOpenApp("contact")}>
                      <HugeiconsIcon
                        icon={Mail01Icon}
                        strokeWidth={1.9}
                        size={15}
                      />
                      <span>Get in touch…</span>
                    </MenubarItem>
                    <MenubarItem onClick={() => void handleCopyWorkspaceLink()}>
                      <HugeiconsIcon
                        icon={Copy01Icon}
                        strokeWidth={1.9}
                        size={15}
                      />
                      <span>Copy workspace link</span>
                    </MenubarItem>
                  </MenubarGroup>

                  <MenubarSeparator />

                  <MenubarItem onClick={openLockCurtain}>
                    <HugeiconsIcon
                      icon={Login01Icon}
                      strokeWidth={1.9}
                      size={15}
                    />
                    <span>Sign in…</span>
                    <MenubarShortcut>⌘⇧L</MenubarShortcut>
                  </MenubarItem>
                </>
              )}
            </MenubarContent>
          </MenubarMenu>

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
                    "news",
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
