"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { BOOT_DONE_EVENT } from "@/lib/boot";
import {
  PWA_UPDATE_TOAST_ID,
  clearPwaCaches,
  shouldRegisterPwa,
} from "@/lib/pwa";

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;
const VISIBILITY_UPDATE_THROTTLE_MS = 5 * 60 * 1000;

type IdleWindow = Window & {
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout?: number },
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

function waitForBootToFinish(): Promise<void> {
  const bootState = document.documentElement.dataset.bootState;
  if (!bootState || bootState === "done" || bootState === "inactive") {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.removeEventListener(BOOT_DONE_EVENT, finish);
      resolve();
    };
    window.addEventListener(BOOT_DONE_EVENT, finish, { once: true });
    window.setTimeout(finish, 4000);
  });
}

async function disableExistingPwa() {
  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const workspaceRegistrations = registrations.filter((registration) => {
        if (registration.scope !== `${window.location.origin}/`) return false;
        const workers = [
          registration.active,
          registration.waiting,
          registration.installing,
        ].filter(Boolean);
        return (
          workers.length === 0 ||
          workers.some((worker) => {
            try {
              return new URL(worker!.scriptURL).pathname === "/sw.js";
            } catch {
              return false;
            }
          })
        );
      });
      await Promise.all(
        workspaceRegistrations.map((registration) => registration.unregister()),
      );
    }
  } catch {
    // Cleanup is best effort; a browser may deny it in unusual contexts.
  }

  try {
    await clearPwaCaches({ recacheCore: false });
  } catch {
    // Nothing else to do if Cache Storage is unavailable.
  }
}

/**
 * Production-only, load- and boot-deferred service-worker registration.
 * Updates never reload the workspace automatically: the waiting worker is
 * activated only after the visitor chooses Reload in the toast.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    let cancelled = false;
    let registration: ServiceWorkerRegistration | null = null;
    let updateInterval: number | undefined;
    let cancelIdle: (() => void) | undefined;
    let lastUpdateCheck = 0;
    let updateToastShown = false;
    let reloadingForUpdate = false;

    const onControllerChange = () => {
      if (!reloadingForUpdate) return;
      reloadingForUpdate = false;
      window.location.reload();
    };

    const showUpdateToast = () => {
      if (
        cancelled ||
        updateToastShown ||
        !registration?.waiting ||
        !navigator.serviceWorker.controller
      ) {
        return;
      }
      updateToastShown = true;

      toast("Workspace updated", {
        id: PWA_UPDATE_TOAST_ID,
        description:
          "Reload when you are ready. Open windows will not be refreshed automatically.",
        duration: Infinity,
        closeButton: true,
        action: {
          label: "Reload",
          onClick: () => {
            const waiting = registration?.waiting;
            if (!waiting) {
              window.location.reload();
              return;
            }
            reloadingForUpdate = true;
            waiting.postMessage({ type: "SKIP_WAITING" });
            window.setTimeout(() => {
              if (reloadingForUpdate) {
                reloadingForUpdate = false;
                window.location.reload();
              }
            }, 1500);
          },
        },
      });
    };

    const checkForUpdate = (force = false) => {
      if (!registration) return;
      const now = Date.now();
      if (!force && now - lastUpdateCheck < VISIBILITY_UPDATE_THROTTLE_MS) {
        return;
      }
      lastUpdateCheck = now;
      void registration.update().catch(() => undefined);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") checkForUpdate();
    };

    const ensureCoreCache = async () => {
      try {
        const controller = navigator.serviceWorker.controller;
        if (!controller || !("caches" in window)) return;
        const offline = await window.caches.match("/~offline", {
          ignoreSearch: true,
        });
        if (!offline) controller.postMessage({ type: "PM_RECACHE_CORE" });
      } catch {
        // The worker's inline fallback still covers an unavailable cache.
      }
    };

    const watchRegistration = (nextRegistration: ServiceWorkerRegistration) => {
      registration = nextRegistration;
      showUpdateToast();
      void ensureCoreCache();

      registration.addEventListener("updatefound", () => {
        const installing = registration?.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          if (installing.state === "installed") showUpdateToast();
        });
      });

      navigator.serviceWorker.addEventListener(
        "controllerchange",
        onControllerChange,
      );
      document.addEventListener("visibilitychange", onVisibilityChange);
      updateInterval = window.setInterval(
        () => checkForUpdate(true),
        UPDATE_CHECK_INTERVAL_MS,
      );
      checkForUpdate(true);
    };

    const register = async () => {
      if (cancelled) return;

      if (!shouldRegisterPwa()) {
        await disableExistingPwa();
        return;
      }
      if (!("serviceWorker" in navigator)) return;

      await waitForBootToFinish();
      if (cancelled) return;

      try {
        const nextRegistration = await navigator.serviceWorker.register(
          "/sw.js",
          {
            scope: "/",
            type: "classic",
            updateViaCache: "none",
          },
        );
        if (!cancelled) watchRegistration(nextRegistration);
      } catch {
        // Offline support is progressive enhancement. A failed registration
        // must never surface as a workspace error.
      }
    };

    const scheduleRegister = () => {
      const idleWindow = window as IdleWindow;
      if (idleWindow.requestIdleCallback) {
        const handle = idleWindow.requestIdleCallback(() => void register(), {
          timeout: 3000,
        });
        cancelIdle = () => idleWindow.cancelIdleCallback?.(handle);
      } else {
        const handle = window.setTimeout(() => void register(), 1000);
        cancelIdle = () => window.clearTimeout(handle);
      }
    };

    const onLoad = () => scheduleRegister();
    if (document.readyState === "complete") {
      scheduleRegister();
    } else {
      window.addEventListener("load", onLoad, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", onLoad);
      cancelIdle?.();
      if (updateInterval !== undefined) window.clearInterval(updateInterval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener(
          "controllerchange",
          onControllerChange,
        );
      }
    };
  }, []);

  return null;
}
