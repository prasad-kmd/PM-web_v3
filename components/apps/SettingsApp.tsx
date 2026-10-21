"use client";

import {
  InformationCircleIcon,
  Moon02Icon,
  PaintBoardIcon,
  SunMediumIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { useAppearance } from "@/lib/appearance";
import type { Theme } from "@/lib/registry";

type Tab = "appearance" | "about";

export function SettingsApp() {
  const [tab, setTab] = useState<Tab>("appearance");
  const { theme, setTheme } = useAppearance();

  return (
    <div className="settings-layout">
      <aside className="settings-sidebar">
        <p className="settings-sidebar-label">Workspace settings</p>
        <nav aria-label="Settings sections">
          <button
            type="button"
            className={`settings-nav-item${tab === "appearance" ? " is-active" : ""}`}
            onClick={() => setTab("appearance")}
          >
            <HugeiconsIcon icon={PaintBoardIcon} strokeWidth={2} size={16} />
            <span>Appearance</span>
          </button>
          <button
            type="button"
            className={`settings-nav-item${tab === "about" ? " is-active" : ""}`}
            onClick={() => setTab("about")}
          >
            <HugeiconsIcon
              icon={InformationCircleIcon}
              strokeWidth={2}
              size={16}
            />
            <span>About</span>
          </button>
        </nav>
      </aside>

      <main className="settings-content">
        {tab === "appearance" && (
          <section
            className="settings-section"
            aria-labelledby="appearance-heading"
          >
            <h2 id="appearance-heading" className="settings-heading">
              Appearance
            </h2>
            <p className="settings-description">
              Use the Animate UI reference palette in the workspace mode that
              suits your environment.
            </p>

            <div className="settings-group">
              <p className="settings-group-title">Theme</p>
              <div className="settings-card">
                {(
                  [
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
                  ] as const
                ).map((option) => (
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
          </section>
        )}

        {tab === "about" && (
          <section className="settings-section" aria-labelledby="about-heading">
            <h2 id="about-heading" className="settings-heading">
              About this workspace
            </h2>
            <p className="settings-description">
              A personal engineering portfolio presented as a persistent desktop
              workspace.
            </p>

            <div className="settings-card settings-about">
              <div className="settings-about-mark">PM</div>
              <div>
                <strong className="settings-option-title">Prasad M.</strong>
                <span className="settings-option-description">
                  Civil Engineer &amp; Full-Stack Web Developer
                </span>
                <span className="settings-option-description">
                  Kandy, Central Province, Sri Lanka
                </span>
              </div>
            </div>

            <div className="settings-group">
              <p className="settings-group-title">System details</p>
              <div className="settings-card">
                <div className="settings-spec-row">
                  <span className="settings-spec-label">Environment</span>
                  <span>Desktop Workspace v3.3.0</span>
                </div>
                <div className="settings-spec-row">
                  <span className="settings-spec-label">Framework</span>
                  <span>Next.js 16.3.5</span>
                </div>
                <div className="settings-spec-row">
                  <span className="settings-spec-label">Interface</span>
                  <span>Animate UI + Base UI</span>
                </div>
                <div className="settings-spec-row">
                  <span className="settings-spec-label">Layout memory</span>
                  <span>Browser local storage</span>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
