"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import {
  Alert02Icon,
  ArrowRight01Icon,
  ArrowUpRight01Icon,
  Delete02Icon,
  Download04Icon,
  Folder01Icon,
  InformationCircleIcon,
  Link01Icon,
  Moon02Icon,
  PaintBoardIcon,
  RepeatIcon,
  SunMediumIcon,
  UserAccountIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";
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
import { CookieNoticeButton } from "@/components/legal/CookieNotice";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import {
  PWA_CACHE_VERSION,
  PWA_IMAGES_CACHE,
  PWA_PAGES_CACHE,
  activateWaitingServiceWorker,
  clearPwaCaches,
  formatBytes,
  getPwaCacheSummary,
  isPwaDisabledByEnv,
  type PwaCacheSummary,
} from "@/lib/pwa";
import { useAppearance } from "@/lib/appearance";
import { requestBootPreview } from "@/lib/boot";
import { BUILD_INFO, STACK_INFO } from "@/lib/build-info";
import { COOKIE_COMMENTER, getClientCookie } from "@/lib/cookies";
import {
  LEGAL_DOCUMENTS,
  LEGAL_EFFECTIVE_DATE,
  LEGAL_VERSION,
  VISITOR_COOKIE_REGISTER,
} from "@/lib/legal";
import type { Theme } from "@/lib/registry";
import {
  SETTINGS_SECTION_EVENT,
  clearPendingSettingsSection,
  consumePendingSettingsSection,
  type SettingsSectionRequest,
} from "@/lib/settings-navigation";
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

const COLLECTION_LABELS: Record<string, string> = {
  projects: "Projects",
  blog: "Blog",
  articles: "Articles",
  tutorials: "Tutorials",
  glossary: "Glossary",
  news: "News",
};

type SystemInfo = {
  build: {
    version: string;
    commit: string;
    builtAt: string;
    environment: string;
  };
  collections: Array<{ type: string; configured: boolean }>;
  integrations: {
    notion: boolean;
    turnstile: boolean;
    telegram: boolean;
    readership?: boolean;
    canonicalUrl: boolean;
  };
};

const KEYBOARD_GROUPS = [
  {
    title: "Desktop",
    rows: [
      {
        keys: ["↑", "↓", "←", "→"],
        label: "Move between desktop shortcuts once selected",
      },
      { keys: ["Enter"], label: "Open the selected shortcut" },
      {
        keys: ["Esc"],
        label: "Clear the shortcut selection or close an overlay",
      },
      { keys: ["Right-click"], label: "Open the desktop or shortcut menu" },
    ],
  },
  {
    title: "Windows",
    rows: [
      {
        keys: ["Double-click"],
        label: "Restore or maximize from the titlebar",
      },
      {
        keys: ["Drag → edge"],
        label: "Snap a restored window to the left, right or a corner",
      },
      { keys: ["Esc"], label: "Close the focused menu, popover or flyout" },
    ],
  },
  {
    title: "Search",
    rows: [
      {
        keys: ["Enter"],
        label: "Submit search in collections or workspace search",
      },
    ],
  },
] as const;

/** Rendered from the same register published in the Privacy Policy. */
const COOKIE_TABLE = VISITOR_COOKIE_REGISTER;

function StatePill({ on, labels }: { on: boolean; labels: [string, string] }) {
  return (
    <span className={`settings-state ${on ? "is-on" : "is-off"}`}>
      {on ? labels[0] : labels[1]}
    </span>
  );
}

function AboutTab() {
  const {
    theme,
    wallpaper,
    wallpaperIntensity,
    slideshowEnabled,
    slideshowInterval,
  } = useAppearance();
  const [system, setSystem] = useState<SystemInfo | null>(null);
  const [failed, setFailed] = useState(false);
  const [commenter, setCommenter] = useState<string | null>(null);
  const pwaInstall = usePwaInstall();
  const [pwaCacheSummary, setPwaCacheSummary] =
    useState<PwaCacheSummary | null>(null);
  const [serviceWorkerStatus, setServiceWorkerStatus] = useState("Checking…");
  const [pwaUpdateReady, setPwaUpdateReady] = useState(false);
  const [clearingPwaCache, setClearingPwaCache] = useState(false);
  const [checkingPwaUpdate, setCheckingPwaUpdate] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/system", { signal: controller.signal, cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: SystemInfo) => setSystem(data))
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, []);

  const refreshPwaStatus = useCallback(async () => {
    setPwaCacheSummary(await getPwaCacheSummary());

    if (isPwaDisabledByEnv()) {
      setServiceWorkerStatus("Disabled by site setting");
      setPwaUpdateReady(false);
      return;
    }
    if (process.env.NODE_ENV !== "production") {
      setServiceWorkerStatus("Disabled in development");
      setPwaUpdateReady(false);
      return;
    }
    if (!("serviceWorker" in navigator)) {
      setServiceWorkerStatus("Unsupported in this browser");
      setPwaUpdateReady(false);
      return;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const updateReady = Boolean(
        registration?.waiting && navigator.serviceWorker.controller,
      );
      setPwaUpdateReady(updateReady);
      setServiceWorkerStatus(
        updateReady
          ? "Update ready"
          : registration?.active
            ? "Active"
            : registration?.installing
              ? "Installing…"
              : "Not registered yet",
      );
    } catch {
      setServiceWorkerStatus("Unavailable");
      setPwaUpdateReady(false);
    }
  }, []);

  useEffect(() => {
    void refreshPwaStatus();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void refreshPwaStatus();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [refreshPwaStatus]);

  useEffect(() => {
    const raw = getClientCookie(COOKIE_COMMENTER);
    if (!raw) return;
    try {
      const parsed = JSON.parse(decodeURIComponent(raw)) as { n?: string };
      if (parsed?.n) setCommenter(parsed.n);
    } catch {
      setCommenter(null);
    }
  }, []);

  const wallpaperMeta = useMemo(
    () => WALLPAPERS.find((option) => option.id === wallpaper),
    [wallpaper],
  );
  const intensityMeta = useMemo(
    () =>
      WALLPAPER_INTENSITY_OPTIONS.find(
        (option) => option.id === wallpaperIntensity,
      ) ?? WALLPAPER_INTENSITY_OPTIONS[1],
    [wallpaperIntensity],
  );

  const configuredCount =
    system?.collections.filter((entry) => entry.configured).length ?? 0;

  const version = system?.build.version || BUILD_INFO.version;
  const environment = system?.build.environment || BUILD_INFO.environment;
  const commit = system?.build.commit || BUILD_INFO.commit;

  async function handlePwaInstall() {
    if (pwaInstall.installed || pwaInstall.installing) return;
    const outcome = await pwaInstall.promptInstall();
    if (outcome === "ios") {
      toast("Install from Share", {
        description: "Tap Share, then choose Add to Home Screen.",
      });
    } else if (outcome === "unavailable") {
      toast("Install from your browser menu", {
        description:
          "If “Install app” or “Add to Home Screen” appears there, your browser can install this workspace.",
      });
    }
    void refreshPwaStatus();
  }

  async function handlePwaUpdate() {
    if (pwaUpdateReady) {
      const activated = await activateWaitingServiceWorker();
      if (!activated) await refreshPwaStatus();
      return;
    }

    if (isPwaDisabledByEnv() || process.env.NODE_ENV !== "production") {
      toast("Offline updates are disabled in this build.");
      return;
    }
    if (!("serviceWorker" in navigator)) {
      toast.error("Service workers are not supported in this browser.");
      return;
    }

    setCheckingPwaUpdate(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      if (!registration) {
        toast("The offline worker has not registered yet.");
        return;
      }
      await registration.update();
      await refreshPwaStatus();
      if (registration.waiting && navigator.serviceWorker.controller) {
        setPwaUpdateReady(true);
        setServiceWorkerStatus("Update ready");
        toast.success("Workspace update ready — reload when it suits you.");
      } else {
        toast.success("You're on the latest workspace version.");
      }
    } catch {
      toast.error("Could not check for a workspace update.");
    } finally {
      setCheckingPwaUpdate(false);
    }
  }

  async function handleClearPwaCache() {
    setClearingPwaCache(true);
    try {
      await clearPwaCaches();
      // Give the worker a moment to restore only its essential core files.
      await new Promise((resolve) => window.setTimeout(resolve, 400));
      await refreshPwaStatus();
      toast.success("Visited offline pages and images cleared.");
    } catch {
      toast.error("Could not clear the offline cache.");
    } finally {
      setClearingPwaCache(false);
    }
  }

  async function resetDevice() {
    if (typeof document === "undefined") return;
    for (const cookie of COOKIE_TABLE) {
      document.cookie = `${encodeURIComponent(cookie.name)}=; path=/; max-age=0; SameSite=Lax`;
    }
    try {
      window.localStorage.clear();
    } catch {
      // Optional mirror only.
    }
    try {
      await clearPwaCaches();
    } catch {
      // The reload below still resets cookies and local preferences.
    }
    window.location.reload();
  }

  const pwaInstallStatusLabel = pwaInstall.installed
    ? "Installed"
    : pwaInstall.installing
      ? "Installing…"
      : pwaInstall.canInstall
        ? "Ready to install"
        : pwaInstall.isIos
          ? "Add from Share"
          : pwaInstall.status === "checking"
            ? "Checking…"
            : "Browser managed";
  const cachedContentEntries = pwaCacheSummary
    ? (pwaCacheSummary.entriesByCache[PWA_PAGES_CACHE] ?? 0) +
      (pwaCacheSummary.entriesByCache[PWA_IMAGES_CACHE] ?? 0)
    : null;
  const pwaCacheStatusLabel = !pwaCacheSummary
    ? "Checking…"
    : !pwaCacheSummary.supported
      ? "Unsupported"
      : `${cachedContentEntries} page/image ${cachedContentEntries === 1 ? "entry" : "entries"}`;

  return (
    <>
      <section className="settings-section" aria-labelledby="about-heading">
        <h2 id="about-heading" className="settings-heading">
          About this workspace
        </h2>
        <p className="settings-description">
          A personal portfolio presented as a persistent desktop workspace. No
          advertising cookies or third-party analytics scripts are used;
          preferences live in this browser, while entry pages record aggregate
          read counts.
        </p>

        <div className="settings-card settings-about-hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="settings-about-mark"
            src="/images/profile-placeholder.jpg"
            alt="Portrait of Prasad Madhuranga"
            width={48}
            height={48}
          />
          <div>
            <div className="settings-about-name">Prasad Madhuranga</div>
            <div className="settings-about-line">
              Mechanical + Mechatronics Engineer
            </div>
            <div className="settings-about-line">Sri Lanka</div>
            <span className="settings-about-status">
              <span aria-hidden="true" />
              Open to collaboration
            </span>
          </div>
        </div>

        <div className="settings-group">
          <div className="settings-group-header">
            <p className="settings-group-title">Build</p>
            <span className="settings-group-count">{version}</span>
          </div>
          <div className="settings-card">
            <div className="settings-list-row">
              <span className="settings-list-key">Version</span>
              <span className="settings-list-value">PM Web v3 · {version}</span>
            </div>
            <div className="settings-list-row">
              <span className="settings-list-key">Revision</span>
              <span className="settings-list-value">
                {commit ? (
                  <span className="mono">{commit}</span>
                ) : (
                  "Not stamped in this build"
                )}
              </span>
            </div>
            <div className="settings-list-row">
              <span className="settings-list-key">Environment</span>
              <span className="settings-list-value">{environment}</span>
            </div>
            <div className="settings-list-row">
              <span className="settings-list-key">Interface</span>
              <span className="settings-list-value">
                Animate UI · Coss UI · Base UI
              </span>
            </div>
            <div className="settings-list-row">
              <span className="settings-list-key">Preferences</span>
              <span className="settings-list-value">
                Saved in browser cookies
              </span>
            </div>
          </div>
          <p className="settings-about-note">
            {STACK_INFO.map((entry) => `${entry.label} ${entry.value}`).join(
              " · ",
            )}
          </p>
        </div>

        <div className="settings-group">
          <div className="settings-group-header">
            <p className="settings-group-title">Data sources</p>
            <span className="settings-group-count">
              {system
                ? `${configuredCount} of ${system.collections.length} connected`
                : failed
                  ? "unavailable"
                  : "checking…"}
            </span>
          </div>
          <div className="settings-card">
            {(system?.collections ?? []).map((collection) => (
              <div className="settings-list-row" key={collection.type}>
                <span className="settings-list-key">
                  <HugeiconsIcon
                    icon={Folder01Icon}
                    strokeWidth={2}
                    size={13}
                    aria-hidden
                  />{" "}
                  {COLLECTION_LABELS[collection.type] ?? collection.type}
                </span>
                <span className="settings-list-value">
                  <StatePill
                    on={collection.configured}
                    labels={["Published", "Not connected"]}
                  />
                </span>
              </div>
            ))}
            {!system && !failed ? (
              <div className="settings-list-row">
                <span className="settings-list-key">
                  Reading configuration…
                </span>
              </div>
            ) : null}
            {failed ? (
              <div className="settings-list-row">
                <span className="settings-list-key">
                  <HugeiconsIcon
                    icon={Alert02Icon}
                    strokeWidth={2}
                    size={13}
                    aria-hidden
                  />{" "}
                  System details are unavailable in this environment.
                </span>
              </div>
            ) : null}
            {system ? (
              <>
                <div className="settings-list-row">
                  <span className="settings-list-key">Content index</span>
                  <span className="settings-list-value">
                    <StatePill
                      on={system.integrations.notion}
                      labels={["Configured", "Not configured"]}
                    />
                  </span>
                </div>
                <div className="settings-list-row">
                  <span className="settings-list-key">Spam protection</span>
                  <span className="settings-list-value">
                    <StatePill
                      on={system.integrations.turnstile}
                      labels={["Configured", "Not configured"]}
                    />
                  </span>
                </div>
                <div className="settings-list-row">
                  <span className="settings-list-key">Message delivery</span>
                  <span className="settings-list-value">
                    <StatePill
                      on={system.integrations.telegram}
                      labels={["Configured", "Not configured"]}
                    />
                  </span>
                </div>
                <div className="settings-list-row">
                  <span className="settings-list-key">Readership counter</span>
                  <span className="settings-list-value">
                    <StatePill
                      on={Boolean(system.integrations.readership)}
                      labels={["Configured", "Not configured"]}
                    />
                  </span>
                </div>
              </>
            ) : null}
          </div>
          <p className="settings-about-note">
            Only presence is reported — the route never returns a token, an id
            or any part of a value.
          </p>
        </div>

        <div className="settings-group">
          <p className="settings-group-title">This device</p>
          <dl className="settings-about-tiles">
            <div className="settings-about-tile">
              <dt>Theme</dt>
              <dd>{theme === "dark" ? "Dark" : "Light"}</dd>
            </div>
            <div className="settings-about-tile">
              <dt>Wallpaper</dt>
              <dd>{wallpaperMeta?.label ?? "Custom"}</dd>
            </div>
            <div className="settings-about-tile">
              <dt>Visibility</dt>
              <dd>{intensityMeta.label}</dd>
            </div>
            <div className="settings-about-tile">
              <dt>Slideshow</dt>
              <dd>{slideshowEnabled ? `${slideshowInterval}s` : "Off"}</dd>
            </div>
          </dl>
          <div className="settings-card" style={{ marginTop: 10 }}>
            <div className="settings-list-row">
              <span className="settings-list-key">
                <HugeiconsIcon
                  icon={UserAccountIcon}
                  strokeWidth={2}
                  size={13}
                  aria-hidden
                />{" "}
                Comment identity
              </span>
              <span className="settings-list-value">
                {commenter ?? "Not set"}
              </span>
            </div>
            <div className="settings-list-row">
              <span className="settings-list-key">
                <HugeiconsIcon
                  icon={Link01Icon}
                  strokeWidth={2}
                  size={13}
                  aria-hidden
                />{" "}
                Storage
              </span>
              <span className="settings-list-value">
                Cookies + browser storage
              </span>
            </div>
          </div>
        </div>

        <div className="settings-group">
          <div className="settings-group-header">
            <p className="settings-group-title">App &amp; offline</p>
            <span className="settings-group-count">
              Cache v{PWA_CACHE_VERSION}
            </span>
          </div>
          <div className="settings-card">
            <div className="settings-list-row">
              <span className="settings-list-key">Installation</span>
              <span className="settings-list-value" aria-live="polite">
                {pwaInstallStatusLabel}
              </span>
            </div>
            <div className="settings-list-row">
              <span className="settings-list-key">Service worker</span>
              <span className="settings-list-value" aria-live="polite">
                {serviceWorkerStatus}
              </span>
            </div>
            <div className="settings-list-row">
              <span className="settings-list-key">Cached content</span>
              <span className="settings-list-value">{pwaCacheStatusLabel}</span>
            </div>
            <div className="settings-list-row">
              <span className="settings-list-key">Site storage estimate</span>
              <span className="settings-list-value">
                {formatBytes(pwaCacheSummary?.estimatedUsageBytes ?? null)}
              </span>
            </div>
          </div>
          <p className="settings-about-note">
            Public pages you visit can reopen offline. API calls, form
            submissions, comment actions and owner tools always stay
            network-only and are never served from this cache.
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginTop: 10,
            }}
          >
            <button
              type="button"
              className="settings-action-btn"
              onClick={() => void handlePwaInstall()}
              disabled={pwaInstall.installed || pwaInstall.installing}
            >
              <HugeiconsIcon icon={Download04Icon} strokeWidth={2} size={13} />
              {pwaInstall.installed
                ? "Workspace installed"
                : pwaInstall.installing
                  ? "Installing workspace…"
                  : "Install workspace"}
            </button>
            <button
              type="button"
              className="settings-action-btn"
              onClick={() => void handlePwaUpdate()}
              disabled={checkingPwaUpdate}
            >
              <HugeiconsIcon icon={RepeatIcon} strokeWidth={2} size={13} />
              {pwaUpdateReady
                ? "Reload to update"
                : checkingPwaUpdate
                  ? "Checking…"
                  : "Check for updates"}
            </button>
            <button
              type="button"
              className="settings-danger-btn"
              onClick={() => void handleClearPwaCache()}
              disabled={
                clearingPwaCache ||
                !pwaCacheSummary?.supported ||
                pwaCacheSummary.entries === 0
              }
            >
              <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} size={13} />
              {clearingPwaCache ? "Clearing…" : "Clear offline cache"}
            </button>
          </div>
          <p className="settings-about-note">
            Clearing removes visited pages, images and static copies. The small
            essential offline fallback is restored automatically.
          </p>
        </div>

        <div className="settings-group">
          <p className="settings-group-title">Controls</p>
          <div className="settings-card">
            {KEYBOARD_GROUPS.map((group) => (
              <div key={group.title}>
                <div className="settings-list-row">
                  <span className="settings-list-key">{group.title}</span>
                </div>
                {group.rows.map((row) => (
                  <div className="settings-list-row" key={row.label}>
                    <span className="settings-list-key">{row.label}</span>
                    <span className="settings-list-value">
                      <span
                        style={{
                          display: "inline-flex",
                          gap: 3,
                          alignItems: "center",
                        }}
                      >
                        {row.keys.map((key) => (
                          <kbd className="settings-kbd" key={key}>
                            {key}
                          </kbd>
                        ))}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="settings-group" id="settings-privacy-storage">
          <p className="settings-group-title">Privacy &amp; storage</p>
          <p className="settings-about-note" style={{ marginBottom: 10 }}>
            Visitor cookies are listed below. Entry pages also record aggregate
            reads by entry, day, country and referring host; the Privacy Policy
            explains that first-party count, every local/session key and the
            offline caches listed above.
          </p>
          <div className="settings-card">
            {COOKIE_TABLE.map((row) => (
              <div className="settings-list-row" key={row.name}>
                <span className="settings-list-key mono">{row.name}</span>
                <span className="settings-list-value">{`${row.purpose} · ${row.duration}`}</span>
              </div>
            ))}
          </div>
          <p className="settings-about-note">
            Comments are public and stored with the entry in Notion; the email
            address is stripped from the public comment feed. There is no
            visitor account or profile. See the{" "}
            <Link href="/privacy-policy#cookies-and-browser-storage">
              full cookie and storage register
            </Link>
            .
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginTop: 10,
            }}
          >
            <CookieNoticeButton />
            <button
              type="button"
              className="settings-danger-btn"
              onClick={() => void resetDevice()}
            >
              <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} size={13} />
              Reset preferences on this device
            </button>
          </div>
        </div>

        <div className="settings-group">
          <p className="settings-group-title">Legal</p>
          <div className="settings-card">
            {LEGAL_DOCUMENTS.map((document) => (
              <div className="settings-list-row" key={document.id}>
                <span className="settings-list-key">{document.title}</span>
                <Link
                  className="settings-list-value"
                  href={document.route}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  Open
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    strokeWidth={2}
                    size={12}
                    aria-hidden
                  />
                </Link>
              </div>
            ))}
          </div>
          <p className="settings-about-note">
            Legal version {LEGAL_VERSION} · Effective {LEGAL_EFFECTIVE_DATE}.
          </p>
        </div>

        <div className="settings-group">
          <p className="settings-group-title">Credits &amp; licences</p>
          <div className="settings-card">
            <div className="settings-list-row">
              <span className="settings-list-key">Interface</span>
              <span className="settings-list-value">
                Animate UI · Coss UI · Base UI
              </span>
            </div>
            <div className="settings-list-row">
              <span className="settings-list-key">Icons</span>
              <span className="settings-list-value">Hugeicons</span>
            </div>
            <div className="settings-list-row">
              <span className="settings-list-key">Type</span>
              <span className="settings-list-value">Outfit (SIL OFL)</span>
            </div>
            <div className="settings-list-row">
              <span className="settings-list-key">Source</span>
              <a
                className="settings-list-value"
                href="https://github.com/prasad-kmd/PM-Web_V3"
                target="_blank"
                rel="noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                github.com/prasad-kmd/PM-Web_V3
                <HugeiconsIcon
                  icon={ArrowUpRight01Icon}
                  strokeWidth={2}
                  size={12}
                  aria-hidden
                />
              </a>
            </div>
          </div>
          <p className="settings-about-note">
            Operator-authored content and code are published under CC BY-NC-ND
            4.0 unless a specific item or source file states otherwise.
            Third-party and upstream components keep their own licences.
          </p>
        </div>
      </section>
    </>
  );
}

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
  const [activeTab, setActiveTab] = useState<"appearance" | "about">(
    "appearance",
  );
  const slideshowSwitchId = useId();

  useEffect(() => {
    const applySectionRequest = (section: SettingsSectionRequest | null) => {
      if (section !== "privacy-storage") return;
      clearPendingSettingsSection(section);
      setActiveTab("about");
      window.setTimeout(() => {
        document.getElementById("settings-privacy-storage")?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "auto"
            : "smooth",
          block: "start",
        });
      }, 160);
    };

    applySectionRequest(consumePendingSettingsSection());
    const onRequest = (event: Event) =>
      applySectionRequest(
        (event as CustomEvent<SettingsSectionRequest>).detail,
      );
    window.addEventListener(SETTINGS_SECTION_EVENT, onRequest);
    return () => window.removeEventListener(SETTINGS_SECTION_EVENT, onRequest);
  }, []);

  const activeIntensityMeta =
    WALLPAPER_INTENSITY_OPTIONS.find(
      (option) => option.id === wallpaperIntensity,
    ) ?? WALLPAPER_INTENSITY_OPTIONS[1];

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as "appearance" | "about")}
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
        <p className="settings-sidebar-label" style={{ marginTop: 14 }}>
          Preferences are saved after each change.
        </p>
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
              <p className="settings-group-title">Opening animation</p>
              <div className="settings-card settings-control-card">
                <div className="settings-control-row">
                  <div className="settings-option-copy">
                    <span className="settings-option-title">
                      Workspace opening
                    </span>
                    <span className="settings-option-description">
                      Plays automatically when the home workspace opens or
                      refreshes.
                    </span>
                  </div>

                  <button
                    type="button"
                    className="settings-action-btn"
                    onClick={requestBootPreview}
                    aria-label="Preview opening animation"
                  >
                    Preview
                    <HugeiconsIcon
                      icon={ArrowRight01Icon}
                      strokeWidth={2}
                      size={13}
                    />
                  </button>
                </div>
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
          <AboutTab />
        </TabsContent>
      </TabsContents>
    </Tabs>
  );
}
