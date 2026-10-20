"use client";

import { Monitor, Moon, Palette, Sun } from "lucide-react";
import { ACCENTS, useAppearance } from "@/lib/appearance";
import { WALLPAPERS, type Theme, type Wallpaper } from "@/lib/registry";

/* Settings — appearance only (theme, accent, wallpaper). */
export function SettingsApp() {
  const { theme, setTheme, wallpaper, setWallpaper, accent, setAccent } = useAppearance();

  return (
    <div className="app-scroll max-w-[760px] mx-auto space-y-6">
      <div>
        <h2 className="text-[17px] font-semibold flex items-center gap-2">
          <span className="grid place-items-center size-7 rounded-lg bg-[var(--flu-accent)] text-white">
            <Palette size={14} />
          </span>
          Settings
        </h2>
        <p className="text-sm text-[var(--muted-ink)] mt-1">
          Personalize your desktop — theme, accent, and wallpaper.
        </p>
      </div>

      <section className="settings-card">
        <div className="settings-card-head">
          <Palette size={14} className="text-[var(--flu-accent)]" />
          <h3>Appearance</h3>
        </div>

        <div className="settings-card-body space-y-6">
          <div>
            <p className="settings-label">Theme</p>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  { id: "light" as Theme, label: "Light", desc: "Bright surfaces, soft shadows", icon: Sun },
                  { id: "dark" as Theme, label: "Dark", desc: "Obsidian slate, vibrant accent", icon: Moon },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id)}
                  className={`theme-card${theme === t.id ? " is-on" : ""}`}
                  aria-pressed={theme === t.id}
                >
                  <span className="theme-card-icon">
                    <t.icon size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold">{t.label}</span>
                    <span className="block text-[11px] text-[var(--muted-ink)]">{t.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="settings-label">Accent colour</p>
            <div className="flex flex-wrap gap-2">
              {ACCENTS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setAccent(c)}
                  className={`accent-dot${accent === c ? " is-on" : ""}`}
                  style={{ background: c }}
                  aria-label={`Accent ${c}`}
                  aria-pressed={accent === c}
                />
              ))}
            </div>
            <p className="settings-hint">
              Accent tints selection, the taskbar indicator, and window chrome.
            </p>
          </div>

          <div>
            <p className="settings-label">Wallpaper</p>
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(WALLPAPERS) as Wallpaper[]).map((key) => {
                const wp = WALLPAPERS[key];
                const active = wallpaper === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setWallpaper(key)}
                    className={`wall-thumb${active ? " is-on" : ""}`}
                    aria-pressed={active}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={wp.src} alt={wp.label} />
                    <span className="wall-thumb-label">{wp.label}</span>
                    {active && <span className="wall-thumb-check">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-card-body space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Monitor size={14} className="text-[var(--flu-accent)]" /> About this desktop
          </h3>
          <p className="text-xs text-[var(--muted-ink)] leading-5">
            Windows 11-inspired portfolio shell — Mica titlebars, Acrylic taskbar and Start, Fluent
            motion. Built with Next.js 16, Tailwind v4, Base UI and Framer Motion.
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            <span className="badge">v3.2.0</span>
            <span className="badge">Fluent</span>
            <span className="badge">Mica / Acrylic</span>
          </div>
        </div>
      </section>
    </div>
  );
}
