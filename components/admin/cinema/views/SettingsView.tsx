"use client";

import { useCinemaLibrary } from "@/components/admin/cinema/store/LibraryProvider";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CINEMA_LANGUAGE_OPTIONS,
  CINEMA_PLAYBACK_PROVIDERS,
  CINEMA_REGION_OPTIONS,
  cinemaLanguageLabel,
  cinemaRegionLabel,
} from "@/lib/cinema/config";
import type { CinemaPrefs } from "@/lib/cinema/types";

const PROVIDER_ITEMS = CINEMA_PLAYBACK_PROVIDERS.map((provider) => ({
  value: provider.id,
  label: provider.label,
}));

const DENSITY_ITEMS: { value: CinemaPrefs["posterDensity"]; label: string }[] =
  [
    { value: "comfortable", label: "Comfortable" },
    { value: "compact", label: "Compact" },
  ];

const REGION_ITEMS = CINEMA_REGION_OPTIONS.map((option) => ({
  value: option.value,
  label: option.label,
}));

const LANGUAGE_ITEMS = CINEMA_LANGUAGE_OPTIONS.map((option) => ({
  value: option.value,
  label: option.label,
}));

const SETTINGS_MODE_COPY = {
  page: "Notion page",
  database: "Library database",
  session: "This session only",
} as const;

/**
 * Settings.
 *
 * Values are written to a Notion **page** (`NOTION_CINEMA_SETTINGS_PAGE_ID`) as
 * one JSON code block; if that page is not configured the studio falls back to
 * the `__cinema_prefs` row in the library database, then to this process. The
 * region and language below are not cosmetic — they change TMDB's language,
 * certification region and "where to watch" feed for every screen.
 */
export function SettingsView() {
  const {
    prefs,
    setPrefs,
    storageMode,
    settingsMode,
    settingsNotice,
    entries,
    saving,
    reload,
  } = useCinemaLibrary();

  return (
    <div className="cinema-scroll">
      <header className="cinema-library-head">
        <div>
          <h2 className="cinema-page-title">Settings</h2>
          <p className="cinema-page-sub">
            {entries.length} library rows · settings in{" "}
            {SETTINGS_MODE_COPY[settingsMode]}
          </p>
        </div>
        <Button size="xs" variant="outline" onClick={reload} disabled={saving}>
          Reload library
        </Button>
      </header>

      {settingsNotice ? (
        <p className="cinema-panel-hint">{settingsNotice}</p>
      ) : null}

      <section
        className="cinema-settings-group"
        aria-label="Region and language"
      >
        <h3 className="cinema-rail-title">Region &amp; language</h3>

        <div className="cinema-setting-row">
          <div className="cinema-setting-copy">
            <p className="cinema-setting-title">Region</p>
            <p className="cinema-setting-body">
              Sets the release-date region, the certificate (MPAA, BBFC, CBFC…)
              and the “where to watch” feed. Currently{" "}
              {cinemaRegionLabel(prefs.region)}.
            </p>
          </div>
          <Select
            items={REGION_ITEMS}
            value={prefs.region}
            onValueChange={(value) => {
              if (typeof value !== "string") return;
              void setPrefs({ ...prefs, region: value });
            }}
          >
            <SelectTrigger className="min-w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {REGION_ITEMS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </div>

        <div className="cinema-setting-row">
          <div className="cinema-setting-copy">
            <p className="cinema-setting-title">Language</p>
            <p className="cinema-setting-body">
              Passed to TMDB as the `language` parameter, so titles, synopses
              and posters come back translated when a translation exists.
              Currently {cinemaLanguageLabel(prefs.language)}.
            </p>
          </div>
          <Select
            items={LANGUAGE_ITEMS}
            value={prefs.language}
            onValueChange={(value) => {
              if (typeof value !== "string") return;
              void setPrefs({ ...prefs, language: value });
            }}
          >
            <SelectTrigger className="min-w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {LANGUAGE_ITEMS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </div>

        <p className="cinema-panel-hint">
          Changing either clears this tab&apos;s cached responses, so the next
          screen is fetched in the new locale.
        </p>
      </section>

      <section className="cinema-settings-group" aria-label="Playback">
        <h3 className="cinema-rail-title">Playback</h3>
        <div className="cinema-setting-row">
          <div className="cinema-setting-copy">
            <p className="cinema-setting-title">Starting provider</p>
            <p className="cinema-setting-body">
              The player always tries this one first. Reachability is probed
              server-side and cached for five minutes; the rest of the chain
              stays behind it.
            </p>
          </div>
          <Select
            items={PROVIDER_ITEMS}
            value={prefs.defaultProviderId}
            onValueChange={(value) => {
              if (typeof value !== "string") return;
              void setPrefs({ ...prefs, defaultProviderId: value });
            }}
          >
            <SelectTrigger className="min-w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {PROVIDER_ITEMS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </div>
      </section>

      <section className="cinema-settings-group" aria-label="Appearance">
        <h3 className="cinema-rail-title">Appearance</h3>
        <div className="cinema-setting-row">
          <div className="cinema-setting-copy">
            <p className="cinema-setting-title">Poster density</p>
            <p className="cinema-setting-body">
              Compact shrinks rail tiles so more of a shelf fits in one window.
            </p>
          </div>
          <div
            className="cinema-filter-chips"
            role="group"
            aria-label="Poster density"
          >
            {DENSITY_ITEMS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() =>
                  void setPrefs({ ...prefs, posterDensity: item.value })
                }
                className={`cinema-filter-chip${
                  prefs.posterDensity === item.value ? " is-active" : ""
                }`}
                aria-pressed={prefs.posterDensity === item.value}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="cinema-settings-group" aria-label="Storage">
        <h3 className="cinema-rail-title">Storage</h3>
        <div className="cinema-stage-facts">
          <div>
            <dt>Settings</dt>
            <dd>{SETTINGS_MODE_COPY[settingsMode]}</dd>
          </div>
          <div>
            <dt>Library</dt>
            <dd>
              {storageMode === "cloud" ? "Notion database" : "Session only"}
            </dd>
          </div>
          <div>
            <dt>Integration</dt>
            <dd>Shared NOTION_API_KEY</dd>
          </div>
          <div>
            <dt>Variables</dt>
            <dd>NOTION_CINEMA_SETTINGS_PAGE_ID · NOTION_CINEMA_FAVORITES_ID</dd>
          </div>
        </div>
        <p className="cinema-panel-hint">
          Settings are one JSON block on the settings page, rewritten in place.
          Library rows use a lossless JSON payload plus visible columns, so the
          databases stay readable inside Notion without the app.
        </p>
      </section>
    </div>
  );
}
