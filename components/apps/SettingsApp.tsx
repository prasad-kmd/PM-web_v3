"use client";

import Image from "next/image";
import { useId } from "react";
import {
  ArrowRight01Icon,
  InformationCircleIcon,
  Moon02Icon,
  PaintBoardIcon,
  RepeatIcon,
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
import {
  SegmentedRadioGroup,
  SegmentedRadioItem,
} from "@/components/ui/radio-group";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAppearance } from "@/lib/appearance";
import type { Theme } from "@/lib/registry";
import {
  SLIDESHOW_INTERVAL_OPTIONS,
  WALLPAPER_INTENSITY_OPTIONS,
  WALLPAPERS,
  type SlideshowIntervalSec,
  type WallpaperIntensity,
} from "@/lib/wallpapers";

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

const SLIDESHOW_SELECT_ITEMS = SLIDESHOW_INTERVAL_OPTIONS.map((option) => ({
  value: String(option.value),
  label: option.label,
}));

export function SettingsApp() {
  const {
    theme,
    setTheme,
    wallpaper,
    setWallpaper,
    nextWallpaper,
    wallpaperIntensity,
    setWallpaperIntensity,
    slideshowEnabled,
    setSlideshowEnabled,
    slideshowInterval,
    setSlideshowInterval,
  } = useAppearance();
  const slideshowSwitchId = useId();

  const activeIntensityMeta =
    WALLPAPER_INTENSITY_OPTIONS.find(
      (option) => option.id === wallpaperIntensity,
    ) ?? WALLPAPER_INTENSITY_OPTIONS[1];

  return (
    <Tabs
      defaultValue="appearance"
      orientation="vertical"
      className="settings-layout"
    >
      <aside className="settings-sidebar">
        <p className="settings-sidebar-label">Workspace settings</p>
        <TabsHighlight className="settings-tab-highlight">
          <TabsList
            className="settings-tabs-list"
            aria-label="Settings sections"
          >
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
          <section
            className="settings-section"
            aria-labelledby="appearance-heading"
          >
            <h2 id="appearance-heading" className="settings-heading">
              Appearance
            </h2>
            <p className="settings-description">
              Set the workspace theme, adjust wallpaper prominence, or run an
              automatic slideshow. Preferences are saved in browser cookies so
              they persist across refreshes.
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
                      <HugeiconsIcon
                        icon={option.icon}
                        strokeWidth={2}
                        size={16}
                      />
                    </span>
                    <span className="settings-option-copy">
                      <span className="settings-option-title">
                        {option.label}
                      </span>
                      <span className="settings-option-description">
                        {option.description}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-group">
              <div className="settings-group-header">
                <p className="settings-group-title">Desktop wallpaper</p>
                <span className="settings-group-count">
                  {WALLPAPERS.length} available
                </span>
              </div>
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
                      <span className="wallpaper-check" aria-hidden="true">
                        ✓
                      </span>
                    </span>
                    <span className="wallpaper-option-name">
                      {option.label}
                    </span>
                    <span className="wallpaper-option-description">
                      {option.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-group">
              <p className="settings-group-title">Wallpaper visibility</p>
              <div className="settings-card settings-control-card">
                <div className="settings-control-row">
                  <div className="settings-option-copy">
                    <span className="settings-option-title">
                      Backdrop intensity
                    </span>
                    <span className="settings-option-description">
                      {activeIntensityMeta.description}
                    </span>
                  </div>

                  <SegmentedRadioGroup
                    aria-label="Wallpaper visibility"
                    value={wallpaperIntensity}
                    onValueChange={(value) =>
                      setWallpaperIntensity(value as WallpaperIntensity)
                    }
                  >
                    {WALLPAPER_INTENSITY_OPTIONS.map((option) => (
                      <SegmentedRadioItem key={option.id} value={option.id}>
                        {option.label}
                      </SegmentedRadioItem>
                    ))}
                  </SegmentedRadioGroup>
                </div>
              </div>
            </div>

            <div className="settings-group">
              <p className="settings-group-title">Wallpaper slideshow</p>
              <div className="settings-card">
                <div className="settings-control-row settings-control-row-bordered">
                  <span className="settings-option-mark" aria-hidden="true">
                    <HugeiconsIcon
                      icon={RepeatIcon}
                      strokeWidth={2}
                      size={16}
                    />
                  </span>
                  <label
                    htmlFor={slideshowSwitchId}
                    className="settings-option-copy settings-switch-label"
                  >
                    <span className="settings-option-title">
                      Automatic slideshow
                    </span>
                    <span className="settings-option-description">
                      Smoothly crossfade through all {WALLPAPERS.length}{" "}
                      wallpapers
                    </span>
                  </label>
                  <Switch
                    id={slideshowSwitchId}
                    checked={slideshowEnabled}
                    onCheckedChange={(checked) => setSlideshowEnabled(checked)}
                    aria-label="Enable automatic wallpaper slideshow"
                  />
                </div>

                <div className="settings-control-row">
                  <div className="settings-option-copy">
                    <span className="settings-option-title">
                      Change wallpaper
                    </span>
                    <span className="settings-option-description">
                      {slideshowEnabled
                        ? "Active — pauses automatically in background tabs"
                        : "Select timing for when slideshow is enabled"}
                    </span>
                  </div>

                  <div className="settings-slideshow-actions">
                    <Select
                      items={SLIDESHOW_SELECT_ITEMS}
                      value={String(slideshowInterval)}
                      onValueChange={(nextValue) => {
                        if (nextValue !== null) {
                          setSlideshowInterval(
                            Number(nextValue) as SlideshowIntervalSec,
                          );
                        }
                      }}
                    >
                      <SelectTrigger aria-label="Slideshow timing interval">
                        <SelectValue placeholder="Choose timing" />
                      </SelectTrigger>
                      <SelectPopup>
                        {SLIDESHOW_SELECT_ITEMS.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectPopup>
                    </Select>

                    <button
                      type="button"
                      className="settings-action-btn"
                      onClick={nextWallpaper}
                      aria-label="Switch to next wallpaper now"
                    >
                      Next
                      <HugeiconsIcon
                        icon={ArrowRight01Icon}
                        strokeWidth={2}
                        size={13}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="about" className="settings-tab-content">
          <section className="settings-section" aria-labelledby="about-heading">
            <h2 id="about-heading" className="settings-heading">
              About this workspace
            </h2>
            <p className="settings-description">
              A personal portfolio presented as a persistent desktop workspace.
            </p>

            <div className="settings-card settings-about">
              <div className="settings-about-mark">PM</div>
              <div>
                <strong className="settings-option-title">
                  Prasad Madhuranga
                </strong>
                <span className="settings-option-description">
                  Mechanical + Mechatronics Engineer
                </span>
                <span className="settings-option-description">
                  Kandy, Sri Lanka · UTC +05:30
                </span>
              </div>
            </div>

            <div className="settings-group">
              <p className="settings-group-title">System details</p>
              <div className="settings-card">
                <div className="settings-spec-row">
                  <span className="settings-spec-label">Environment</span>
                  <span>PM Web v3 · Desktop Workspace</span>
                </div>
                <div className="settings-spec-row">
                  <span className="settings-spec-label">Framework</span>
                  <span>Next.js 16</span>
                </div>
                <div className="settings-spec-row">
                  <span className="settings-spec-label">Interface</span>
                  <span>Animate UI + Coss UI + Base UI</span>
                </div>
                <div className="settings-spec-row">
                  <span className="settings-spec-label">Preferences</span>
                  <span>Saved in browser cookies</span>
                </div>
              </div>
            </div>
          </section>
        </TabsContent>
      </TabsContents>
    </Tabs>
  );
}
