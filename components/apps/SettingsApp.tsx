"use client";

import { useState } from "react";
import { Info, Moon, Palette, Sun, Sparkles, Monitor, Laptop } from "lucide-react";
import { ACCENTS, useAppearance } from "@/lib/appearance";
import { WALLPAPERS, type Theme, type Wallpaper } from "@/lib/registry";

type Tab = "appearance" | "wallpaper" | "about";

export function SettingsApp() {
  const [tab, setTab] = useState<Tab>("appearance");
  const { theme, setTheme, wallpaper, setWallpaper, accent, setAccent } = useAppearance();

  return (
    <div className="settings-layout">
      {/* Left Sidebar */}
      <aside className="settings-sidebar">
        <div className="px-2 py-1 mb-3 text-[11px] font-semibold text-[var(--muted-ink)] uppercase tracking-wider">
          System Settings
        </div>
        <nav className="space-y-1">
          <button
            type="button"
            className={`settings-nav-item${tab === "appearance" ? " is-active" : ""}`}
            onClick={() => setTab("appearance")}
          >
            <Palette size={15} />
            <span>Appearance</span>
          </button>

          <button
            type="button"
            className={`settings-nav-item${tab === "wallpaper" ? " is-active" : ""}`}
            onClick={() => setTab("wallpaper")}
          >
            <Monitor size={15} />
            <span>Wallpaper</span>
          </button>

          <button
            type="button"
            className={`settings-nav-item${tab === "about" ? " is-active" : ""}`}
            onClick={() => setTab("about")}
          >
            <Info size={15} />
            <span>About</span>
          </button>
        </nav>
      </aside>

      {/* Right Content Pane */}
      <main className="settings-content">
        {tab === "appearance" && (
          <div className="max-w-[560px] space-y-6">
            <div>
              <h2 className="text-base font-semibold">Appearance</h2>
              <p className="text-xs text-[var(--muted-ink)] mt-0.5">
                Customize system appearance and interface accent colors.
              </p>
            </div>

            <div className="settings-group">
              <div className="settings-group-title">Theme</div>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    {
                      id: "light" as Theme,
                      label: "Light",
                      desc: "Clean studio glass",
                      icon: Sun,
                    },
                    {
                      id: "dark" as Theme,
                      label: "Dark",
                      desc: "Spatial space gray",
                      icon: Moon,
                    },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTheme(t.id)}
                    className={`p-3.5 rounded-xl border text-left flex gap-3 items-center transition-all ${
                      theme === t.id
                        ? "bg-[var(--sys-accent-soft)] border-[var(--sys-accent)] shadow-sm"
                        : "bg-[var(--glass-card)] border-[var(--border-subtle)] hover:bg-[var(--surface-hover)]"
                    }`}
                  >
                    <div
                      className={`grid place-items-center size-9 rounded-lg shrink-0 ${
                        theme === t.id
                          ? "bg-[var(--sys-accent)] text-white"
                          : "bg-[var(--surface-hover)]"
                      }`}
                    >
                      <t.icon size={17} />
                    </div>
                    <div>
                      <span className="block text-xs font-semibold">{t.label}</span>
                      <span className="block text-[11px] text-[var(--muted-ink)]">{t.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-group">
              <div className="settings-group-title">Accent Color</div>
              <div className="settings-card flex flex-wrap gap-2.5 items-center">
                {ACCENTS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAccent(a.color)}
                    className={`size-7 rounded-full transition-transform hover:scale-110 flex items-center justify-center ${
                      accent === a.color ? "ring-2 ring-offset-2 ring-[var(--on-surface)]" : ""
                    }`}
                    style={{ background: a.color }}
                    title={a.label}
                    aria-label={`Accent ${a.label}`}
                  >
                    {accent === a.color && <span className="text-white text-[10px] font-bold">✓</span>}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-[var(--muted-ink)] mt-2">
                Accents tint focus rings, running dock dots, and active selections.
              </p>
            </div>
          </div>
        )}

        {tab === "wallpaper" && (
          <div className="max-w-[560px] space-y-6">
            <div>
              <h2 className="text-base font-semibold">Wallpaper</h2>
              <p className="text-xs text-[var(--muted-ink)] mt-0.5">
                Select your preferred spatial background.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(Object.keys(WALLPAPERS) as Wallpaper[]).map((key) => {
                const wp = WALLPAPERS[key];
                const active = wallpaper === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setWallpaper(key)}
                    className={`group relative overflow-hidden rounded-xl border-2 aspect-[16/10] transition-all text-left ${
                      active
                        ? "border-[var(--sys-accent)] ring-2 ring-[var(--sys-accent-soft)] shadow-md"
                        : "border-[var(--border-subtle)] hover:border-[var(--border-strong)]"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={wp.src} alt={wp.label} className="w-full h-full object-cover" />
                    <div
                      className={`absolute inset-x-0 bottom-0 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur-md transition-colors ${
                        active ? "bg-[var(--sys-accent)]/85" : "bg-black/50 group-hover:bg-black/60"
                      }`}
                    >
                      {wp.label}
                    </div>
                    {active && (
                      <span className="absolute top-2 right-2 size-5 rounded-full bg-[var(--sys-accent)] text-white grid place-items-center text-[10px] shadow-sm">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {tab === "about" && (
          <div className="max-w-[560px] space-y-6">
            <div>
              <h2 className="text-base font-semibold">About This Workspace</h2>
              <p className="text-xs text-[var(--muted-ink)] mt-0.5">
                System specification and engineering profile.
              </p>
            </div>

            <div className="settings-card flex items-center gap-4">
              <div className="size-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 text-white font-bold text-xl grid place-items-center shadow-lg">
                PM
              </div>
              <div>
                <h3 className="text-sm font-semibold">Prasad M.</h3>
                <p className="text-xs text-[var(--muted-ink)]">
                  Civil Engineer &amp; Full-Stack Web Developer
                </p>
                <p className="text-[11px] text-[var(--muted-ink)] mt-0.5">
                  Location: Kandy, Central Province, LK
                </p>
              </div>
            </div>

            <div className="settings-group">
              <div className="settings-group-title">Software Specifications</div>
              <div className="settings-card space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                  <span className="text-[var(--muted-ink)]">Environment</span>
                  <span className="font-medium">Spatial Glass OS v3.3.0</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                  <span className="text-[var(--muted-ink)]">Framework</span>
                  <span className="font-medium">Next.js 16.3.5 (Turbopack)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                  <span className="text-[var(--muted-ink)]">Styling Engine</span>
                  <span className="font-medium">Tailwind CSS v4 + Radix Nova</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                  <span className="text-[var(--muted-ink)]">Physics &amp; Motion</span>
                  <span className="font-medium">Framer Motion + Animate UI</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
