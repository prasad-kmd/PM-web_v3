"use client";

import Image from "next/image";
import {
  Battery,
  ChevronLeft,
  ChevronRight,
  Minus,
  Moon,
  Sun,
  Volume2,
  Wifi,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

type DesktopApp = "projects" | "readme";
type Theme = "light" | "dark";
type TheSvgIconName =
  | "windows11"
  | "azure-folder-blank"
  | "azure-file"
  | "files"
  | "notepadplusplus";

const appDetails: Record<DesktopApp, { title: string; location: string }> = {
  projects: { title: "Selected work", location: "Desktop / Selected work" },
  readme: { title: "Read Me.txt", location: "Desktop / Read Me.txt" },
};

function TheSvgIcon({
  name,
  size = 30,
  className,
}: {
  name: TheSvgIconName;
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src={`/icons/thesvg/${name}.svg`}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      unoptimized
      className={className}
    />
  );
}

function AppGlyph({ app, size = 24 }: { app: DesktopApp; size?: number }) {
  return app === "projects" ? (
    <TheSvgIcon name="files" size={size} />
  ) : (
    <TheSvgIcon name="notepadplusplus" size={size} />
  );
}

export default function Home() {
  const [activeApp, setActiveApp] = useState<DesktopApp | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [allAppsView, setAllAppsView] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");
  const [now, setNow] = useState<Date | null>(null);
  const launcherRef = useRef<HTMLElement>(null);
  const startButtonRef = useRef<HTMLButtonElement>(null);
  const windowTitleRef = useRef<HTMLHeadingElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const updateClock = () => setNow(new Date());
    updateClock();
    const timer = window.setInterval(updateClock, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!launcherOpen) return;

    launcherRef.current
      ?.querySelector<HTMLButtonElement>(".launcher-focus-target")
      ?.focus();

    const closeOnOutsidePress = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        !launcherRef.current?.contains(target) &&
        !startButtonRef.current?.contains(target)
      ) {
        setLauncherOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePress);
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsidePress);
  }, [launcherOpen, allAppsView]);

  useEffect(() => {
    if (activeApp && !minimized) windowTitleRef.current?.focus();
  }, [activeApp, minimized]);

  function openApp(app: DesktopApp, trigger?: HTMLElement | null) {
    if (trigger) {
      returnFocusRef.current = trigger.closest(".launcher-panel")
        ? startButtonRef.current
        : trigger;
    }
    setActiveApp(app);
    setMinimized(false);
    setLauncherOpen(false);
  }

  function closeApp() {
    setActiveApp(null);
    setMinimized(false);
    window.requestAnimationFrame(() => returnFocusRef.current?.focus());
  }

  function toggleTaskbarApp(app: DesktopApp, trigger: HTMLElement) {
    if (activeApp === app && !minimized) {
      setMinimized(true);
      return;
    }
    openApp(app, trigger);
  }

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (launcherOpen) {
        setLauncherOpen(false);
        setAllAppsView(false);
        startButtonRef.current?.focus();
      } else if (activeApp && !minimized) {
        setActiveApp(null);
        setMinimized(false);
        window.requestAnimationFrame(() => returnFocusRef.current?.focus());
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [activeApp, launcherOpen, minimized]);

  const timeLabel = now
    ? new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }).format(now)
    : "--:--";
  const dateLabel = now
    ? new Intl.DateTimeFormat(undefined, {
        month: "numeric",
        day: "numeric",
        year: "numeric",
      }).format(now)
    : "";

  return (
    <main
      className="desktop"
      data-theme={theme}
      aria-label="Personal desktop workspace"
    >
      <Image
        className="desktop-wallpaper"
        src="/images/desktop-bloom-wallpaper.webp"
        alt=""
        fill
        priority
        sizes="100vw"
      />
      <div className="wallpaper-tint" aria-hidden="true" />
      <h1 className="sr-only">Desktop</h1>

      <section className="desktop-items" aria-label="Desktop items">
        <button
          className={`desktop-shortcut${activeApp === "projects" && !minimized ? " is-selected" : ""}`}
          type="button"
          data-desktop-shortcut="folder"
          onClick={(event) => openApp("projects", event.currentTarget)}
          aria-label="Open Selected work folder"
        >
          <span className="shortcut-icon shortcut-icon-folder">
            <TheSvgIcon name="azure-folder-blank" size={40} />
          </span>
          <span className="shortcut-label">Selected work</span>
        </button>
        <button
          className={`desktop-shortcut${activeApp === "readme" && !minimized ? " is-selected" : ""}`}
          type="button"
          data-desktop-shortcut="file"
          onClick={(event) => openApp("readme", event.currentTarget)}
          aria-label="Open Read Me text file"
        >
          <span className="shortcut-icon shortcut-icon-file">
            <TheSvgIcon name="azure-file" size={37} />
          </span>
          <span className="shortcut-label">Read Me.txt</span>
        </button>
      </section>

      {activeApp && !minimized ? (
        <section
          className="desktop-window"
          role="dialog"
          aria-modal="false"
          aria-labelledby="window-heading"
        >
          <header className="window-titlebar">
            <span className="window-app-icon">
              <AppGlyph app={activeApp} size={21} />
            </span>
            <div className="window-location">
              <p>{appDetails[activeApp].location}</p>
              <h2 id="window-heading" ref={windowTitleRef} tabIndex={-1}>
                {appDetails[activeApp].title}
              </h2>
            </div>
            <div className="window-controls">
              <button
                type="button"
                className="window-control"
                aria-label="Minimize window"
                onClick={() => setMinimized(true)}
              >
                <Minus aria-hidden="true" />
              </button>
              <button
                type="button"
                className="window-control window-close"
                aria-label="Close window"
                onClick={closeApp}
              >
                <X aria-hidden="true" />
              </button>
            </div>
          </header>
          {activeApp === "projects" ? (
            <div className="window-content folder-content">
              <span className="folder-content-icon">
                <TheSvgIcon name="azure-folder-blank" size={31} />
              </span>
              <div>
                <p className="content-eyebrow">PROJECT DIRECTORY</p>
                <h3>A place for work in progress.</h3>
                <p className="content-copy">
                  Project stories and build notes will find a home here as this
                  portfolio takes shape.
                </p>
              </div>
            </div>
          ) : (
            <article className="window-content readme-content">
              <p className="content-eyebrow">WELCOME / START HERE</p>
              <h3>This desktop is the starting point.</h3>
              <p className="content-copy">
                The portfolio is being built as a small workspace. For now,
                explore the folder and file on the desktop. More will be added a
                little at a time.
              </p>
            </article>
          )}
          <footer className="window-status">
            <span>{activeApp === "projects" ? "Folder" : "Text document"}</span>
            <span>PM / DESKTOP</span>
          </footer>
        </section>
      ) : null}

      <aside
        id="workspace-launcher"
        className={`launcher-panel${allAppsView ? " is-all-apps" : ""}`}
        ref={launcherRef}
        aria-label="Start menu"
        aria-hidden={!launcherOpen}
        hidden={!launcherOpen}
      >
        <div className="launcher-content">
          <div className="launcher-heading">
            <h2>{allAppsView ? "All apps" : "Pinned"}</h2>
            {allAppsView ? (
              <button
                className="all-apps-toggle launcher-focus-target"
                type="button"
                onClick={() => setAllAppsView(false)}
              >
                <ChevronLeft aria-hidden="true" />
                Back
              </button>
            ) : (
              <button
                className="all-apps-toggle launcher-focus-target"
                type="button"
                onClick={() => setAllAppsView(true)}
              >
                All apps
                <ChevronRight aria-hidden="true" />
              </button>
            )}
          </div>

          {allAppsView ? (
            <div className="all-app-list" aria-label="All workspace apps">
              <button
                className="all-app-item"
                type="button"
                onClick={(event) => openApp("projects", event.currentTarget)}
              >
                <span className="all-app-icon">
                  <AppGlyph app="projects" size={24} />
                </span>
                <span>Selected work</span>
                <span className="all-app-kind">Folder</span>
              </button>
              <button
                className="all-app-item"
                type="button"
                onClick={(event) => openApp("readme", event.currentTarget)}
              >
                <span className="all-app-icon">
                  <AppGlyph app="readme" size={24} />
                </span>
                <span>Read Me.txt</span>
                <span className="all-app-kind">Text document</span>
              </button>
            </div>
          ) : (
            <>
              <div className="pinned-apps">
                <button
                  className="pinned-app launcher-focus-target"
                  type="button"
                  onClick={(event) => openApp("projects", event.currentTarget)}
                >
                  <span className="pinned-icon">
                    <AppGlyph app="projects" size={31} />
                  </span>
                  <span>Selected work</span>
                </button>
                <button
                  className="pinned-app"
                  type="button"
                  onClick={(event) => openApp("readme", event.currentTarget)}
                >
                  <span className="pinned-icon">
                    <AppGlyph app="readme" size={30} />
                  </span>
                  <span>Read Me.txt</span>
                </button>
              </div>
              <div className="recommended-heading">
                <h2>Recommended</h2>
                <button
                  className="recommended-more"
                  type="button"
                  onClick={() => setAllAppsView(true)}
                >
                  More
                  <ChevronRight aria-hidden="true" />
                </button>
              </div>
              <div className="recommended-list">
                <button
                  className="recommended-item"
                  type="button"
                  onClick={(event) => openApp("projects", event.currentTarget)}
                >
                  <span className="recommended-icon">
                    <AppGlyph app="projects" size={26} />
                  </span>
                  <span className="recommended-copy">
                    <strong>Selected work</strong>
                    <small>Project folder</small>
                  </span>
                </button>
                <button
                  className="recommended-item"
                  type="button"
                  onClick={(event) => openApp("readme", event.currentTarget)}
                >
                  <span className="recommended-icon">
                    <AppGlyph app="readme" size={25} />
                  </span>
                  <span className="recommended-copy">
                    <strong>Read Me.txt</strong>
                    <small>Text document</small>
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
        <footer className="launcher-footer">
          <div className="profile-chip" aria-label="Profile: Prasad M.">
            <span className="profile-avatar">PM</span>
            <span>Prasad M.</span>
          </div>
          <button
            className="theme-toggle"
            type="button"
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
            aria-pressed={theme === "dark"}
            onClick={() =>
              setTheme((current) => (current === "light" ? "dark" : "light"))
            }
          >
            {theme === "light" ? (
              <Moon aria-hidden="true" />
            ) : (
              <Sun aria-hidden="true" />
            )}
          </button>
        </footer>
      </aside>

      <nav className="taskbar" aria-label="Taskbar">
        <div className="taskbar-center">
          <button
            className={`taskbar-icon taskbar-start${launcherOpen ? " is-active" : ""}`}
            type="button"
            aria-label={launcherOpen ? "Close Start menu" : "Open Start menu"}
            aria-expanded={launcherOpen}
            aria-controls="workspace-launcher"
            ref={startButtonRef}
            onClick={() => {
              if (!launcherOpen) setAllAppsView(false);
              setLauncherOpen((isOpen) => !isOpen);
            }}
          >
            <TheSvgIcon name="windows11" size={22} />
          </button>
          <button
            className={`taskbar-icon${activeApp === "projects" ? " is-running" : ""}`}
            type="button"
            aria-label={
              activeApp === "projects" && !minimized
                ? "Minimize Selected work"
                : "Open Selected work"
            }
            onClick={(event) =>
              toggleTaskbarApp("projects", event.currentTarget)
            }
          >
            <AppGlyph app="projects" size={25} />
            <span className="taskbar-app-indicator" />
          </button>
          <button
            className={`taskbar-icon${activeApp === "readme" ? " is-running" : ""}`}
            type="button"
            aria-label={
              activeApp === "readme" && !minimized
                ? "Minimize Read Me"
                : "Open Read Me"
            }
            onClick={(event) => toggleTaskbarApp("readme", event.currentTarget)}
          >
            <AppGlyph app="readme" size={24} />
            <span className="taskbar-app-indicator" />
          </button>
        </div>
        <div className="taskbar-tray" role="group" aria-label="System status">
          <Wifi aria-hidden="true" />
          <Volume2 aria-hidden="true" />
          <Battery aria-hidden="true" />
          <div
            className="taskbar-clock"
            aria-label={now ? `${timeLabel}, ${dateLabel}` : "Local time"}
          >
            <time dateTime={now?.toISOString()}>{timeLabel}</time>
            <span>{dateLabel}</span>
          </div>
        </div>
      </nav>
    </main>
  );
}
