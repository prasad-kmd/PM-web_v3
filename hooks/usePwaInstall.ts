"use client";

import { useSyncExternalStore } from "react";

export type PwaInstallStatus =
  | "checking"
  | "installed"
  | "installing"
  | "installable"
  | "ios"
  | "unavailable";

export type PwaInstallOutcome =
  "accepted" | "dismissed" | "installed" | "ios" | "unavailable";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt: () => Promise<void>;
}

declare global {
  interface Navigator {
    standalone?: boolean;
  }
}

let status: PwaInstallStatus = "checking";
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let hasInstalledThisSession = false;
let initialized = false;
const listeners = new Set<() => void>();

function detectInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return (
    hasInstalledThisSession ||
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: window-controls-overlay)").matches ||
    window.navigator.standalone === true
  );
}

function detectIos(): boolean {
  if (typeof window === "undefined") return false;
  const userAgent = window.navigator.userAgent;
  return (
    /iphone|ipad|ipod/i.test(userAgent) ||
    (window.navigator.platform === "MacIntel" &&
      window.navigator.maxTouchPoints > 1)
  );
}

function computeStatus(): PwaInstallStatus {
  if (detectInstalled()) return "installed";
  if (deferredPrompt) return "installable";
  if (detectIos()) return "ios";
  return "unavailable";
}

function setStatus(next: PwaInstallStatus) {
  if (status === next) return;
  status = next;
  for (const listener of listeners) listener();
}

function refreshStatus() {
  if (status !== "installing") setStatus(computeStatus());
  else if (detectInstalled()) setStatus("installed");
}

function initializePwaInstallCapture() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  setStatus(computeStatus());

  window.addEventListener("beforeinstallprompt", ((event: Event) => {
    // Keep Chrome's mini-infobar out of the way; the workspace exposes its
    // own quiet install actions in the profile menu and Settings.
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    refreshStatus();
  }) as EventListener);

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    hasInstalledThisSession = true;
    setStatus("installed");
  });

  const standaloneQuery = window.matchMedia("(display-mode: standalone)");
  standaloneQuery.addEventListener?.("change", refreshStatus);
}

function subscribe(listener: () => void): () => void {
  initializePwaInstallCapture();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): PwaInstallStatus {
  return status;
}

function getServerSnapshot(): PwaInstallStatus {
  return "checking";
}

export async function promptPwaInstall(): Promise<PwaInstallOutcome> {
  initializePwaInstallCapture();
  if (detectInstalled()) {
    setStatus("installed");
    return "installed";
  }

  if (!deferredPrompt) {
    refreshStatus();
    return detectIos() ? "ios" : "unavailable";
  }

  const promptEvent = deferredPrompt;
  deferredPrompt = null;

  try {
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") {
      if (hasInstalledThisSession) {
        setStatus("installed");
        return "accepted";
      }
      setStatus("installing");
      window.setTimeout(() => {
        if (status === "installing" && !detectInstalled()) {
          setStatus(computeStatus());
        }
      }, 10_000);
      return "accepted";
    }
    setStatus(computeStatus());
    return "dismissed";
  } catch {
    setStatus(computeStatus());
    return "unavailable";
  }
}

export function usePwaInstall() {
  const currentStatus = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  return {
    status: currentStatus,
    installed: currentStatus === "installed",
    installing: currentStatus === "installing",
    canInstall: currentStatus === "installable",
    isIos: currentStatus === "ios",
    promptInstall: promptPwaInstall,
  } as const;
}
