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
import { CINEMA_PLAYBACK_PROVIDERS } from "@/lib/cinema/config";
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

/**
 * Preferences live in the same Notion database as the library (one `Prefs` row),
 * so there is no second environment variable and no second integration.
 */
export function SettingsView() {
  const { prefs, setPrefs, storageMode, entries, saving, reload } =
    useCinemaLibrary();

  return (
    <div className="cinema-scroll">
      <header className="cinema-library-head">
        <div>
          <h2 className="cinema-page-title">Settings</h2>
          <p className="cinema-page-sub">
            Stored in {storageMode === "cloud" ? "Notion" : "this session"} ·{" "}
            {entries.length} library rows
          </p>
        </div>
        <Button size="xs" variant="outline" onClick={reload} disabled={saving}>
          Reload library
        </Button>
      </header>

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

      <section className="cinema-settings-group" aria-label="Notion">
        <h3 className="cinema-rail-title">Notion library</h3>
        <div className="cinema-stage-facts">
          <div>
            <dt>Storage</dt>
            <dd>
              {storageMode === "cloud" ? "Notion database" : "Session only"}
            </dd>
          </div>
          <div>
            <dt>Integration</dt>
            <dd>Shared NOTION_API_KEY</dd>
          </div>
          <div>
            <dt>Data source</dt>
            <dd>NOTION_CINEMA_FAVORITES_ID</dd>
          </div>
        </div>
        <p className="cinema-panel-hint">
          Rows are written with a lossless JSON payload plus visible columns, so
          the database stays readable inside Notion without the app.
        </p>
      </section>
    </div>
  );
}
