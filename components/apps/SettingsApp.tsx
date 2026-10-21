"use client";

import Image from "next/image";
import {
  InformationCircleIcon,
  Moon02Icon,
  PaintBoardIcon,
  SunMediumIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Tabs,
  TabsContent,
  TabsContents,
  TabsHighlight,
  TabsHighlightItem,
  TabsList,
  TabsTrigger,
} from "@animate-ui/react/primitives/tabs";
import { useAppearance } from "@/lib/appearance";
import type { Theme } from "@/lib/registry";
import { WALLPAPERS } from "@/lib/wallpapers";

const SETTINGS_TABS = [
  { value: "appearance", label: "Appearance", icon: PaintBoardIcon },
  { value: "about", label: "About", icon: InformationCircleIcon },
] as const;

const THEME_OPTIONS = [
  {
    id: "light" as Theme,
    label: "Light",
    description: "Bright neutral workspace",
    icon: SunMediumIcon,
  },
  {
    id: "dark" as Theme,
    label: "Dark",
    description: "Near-black neutral workspace",
    icon: Moon02Icon,
  },
] as const;

export function SettingsApp() {
  const { theme, setTheme, wallpaper, setWallpaper } = useAppearance();

  return (
    <Tabs
      defaultValue="appearance"
      orientation="vertical"
      className="settings-layout"
    >
      <aside className="settings-sidebar">
        <p className="settings-sidebar-label">Workspace settings</p>
        <TabsHighlight className="settings-tab-highlight">
          <TabsList className="settings-tabs-list" aria-label="Settings sections">
            {SETTINGS_TABS.map((tab) => (
              <TabsHighlightItem
                key={tab.value}
                value={tab.value}
                className="settings-tab-item"
              >
                <TabsTrigger value={tab.value} className="settings-nav-item">
                  <HugeiconsIcon icon={tab.icon} strokeWidth={2} size={16} />
                  <span>{tab.label}</span>
                </TabsTrigger>
              </TabsHighlightItem>
            ))}
          </TabsList>
        </TabsHighlight>
      </aside>

      <TabsContents className="settings-tabs-contents">
        <TabsContent value="appearance" className="settings-tab-content">
          <section className="settings-section" aria-labelledby="appearance-heading">
            <h2 id="appearance-heading" className="settings-heading">Appearance</h2>
            <p className="settings-description">
              Set the workspace theme and choose a desktop wallpaper. Both preferences are saved on this device.
            </p>

            <div className="settings-group">
              <p className="settings-group-title">Theme</p>
              <div className="settings-card">
                {THEME_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setTheme(option.id)}
                    className={`settings-option${theme === option.id ? " is-active" : ""}`}
                    aria-pressed={theme === option.id}
                  >
                    <span className="settings-option-mark">
                      <HugeiconsIcon icon={option.icon} strokeWidth={2} size={16} />
                    </span>
                    <span className="settings-option-copy">
                      <span className="settings-option-title">{option.label}</span>
                      <span className="settings-option-description">{option.description}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-group">
              <p className="settings-group-title">Desktop wallpaper</p>
              <div className="wallpaper-options">
                {WALLPAPERS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`wallpaper-option${wallpaper === option.id ? " is-active" : ""}`}
                    onClick={() => setWallpaper(option.id)}
                    aria-pressed={wallpaper === option.id}
                    aria-label={`${option.label}: ${option.description}`}
                  >
                    <span className="wallpaper-preview" aria-hidden="true">
                      <Image
                        src={option.src}
                        alt=""
                        fill
                        sizes="(max-width: 768px) 40vw, 160px"
                        className="wallpaper-preview-image"
                      />
                      <span className="wallpaper-preview-window" />
                      <span className="wallpaper-check" aria-hidden="true">✓</span>
                    </span>
                    <span className="wallpaper-option-name">{option.label}</span>
                    <span className="wallpaper-option-description">{option.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="about" className="settings-tab-content">
          <section className="settings-section" aria-labelledby="about-heading">
            <h2 id="about-heading" className="settings-heading">About this workspace</h2>
            <p className="settings-description">
              A personal portfolio presented as a persistent desktop workspace.
            </p>

            <div className="settings-card settings-about">
              <div className="settings-about-mark">PM</div>
              <div>
                <strong className="settings-option-title">Prasad Madhuranga</strong>
                <span className="settings-option-description">Mechanical + Mechatronics Engineer</span>
                <span className="settings-option-description">Kandy, Sri Lanka · UTC +05:30</span>
              </div>
            </div>

            <div className="settings-group">
              <p className="settings-group-title">System details</p>
              <div className="settings-card">
                <div className="settings-spec-row"><span className="settings-spec-label">Environment</span><span>PM Web v3 · Desktop Workspace</span></div>
                <div className="settings-spec-row"><span className="settings-spec-label">Framework</span><span>Next.js 16</span></div>
                <div className="settings-spec-row"><span className="settings-spec-label">Interface</span><span>Animate UI + Base UI</span></div>
                <div className="settings-spec-row"><span className="settings-spec-label">Preferences</span><span>Saved in browser storage</span></div>
              </div>
            </div>
          </section>
        </TabsContent>
      </TabsContents>
    </Tabs>
  );
}
