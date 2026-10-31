/**
 * Shared constants and browser helpers for the dependency-free Phase 4 PWA.
 * Keep `PWA_CACHE_VERSION` in sync with `SW_VERSION` in `public/sw.js`.
 */
export const PWA_CACHE_VERSION = 2;
export const PWA_CACHE_PREFIX = "pm-";
export const PWA_CORE_CACHE = `pm-core-v${PWA_CACHE_VERSION}`;
export const PWA_STATIC_CACHE = `pm-static-v${PWA_CACHE_VERSION}`;
export const PWA_PAGES_CACHE = `pm-pages-v${PWA_CACHE_VERSION}`;
export const PWA_IMAGES_CACHE = `pm-images-v${PWA_CACHE_VERSION}`;
export const PWA_CACHE_NAMES = [
  PWA_CORE_CACHE,
  PWA_STATIC_CACHE,
  PWA_PAGES_CACHE,
  PWA_IMAGES_CACHE,
] as const;

export const PWA_INSTALL_HINT_KEY = "pm-pwa-install-hint-v1";
export const PWA_INSTALL_TOAST_ID = "pm-pwa-install";
export const PWA_UPDATE_TOAST_ID = "pm-pwa-update";

export type PwaCacheSummary = {
  supported: boolean;
  cacheNames: string[];
  entries: number;
  entriesByCache: Record<string, number>;
  /** Origin-wide Storage API estimate; this is not Cache Storage alone. */
  estimatedUsageBytes: number | null;
};

export function isPwaDisabledByEnv(): boolean {
  return process.env.NEXT_PUBLIC_PWA?.trim().toLowerCase() === "off";
}

export function shouldRegisterPwa(): boolean {
  return process.env.NODE_ENV === "production" && !isPwaDisabledByEnv();
}

export async function getPwaCacheSummary(): Promise<PwaCacheSummary> {
  if (typeof window === "undefined" || !("caches" in window)) {
    return {
      supported: false,
      cacheNames: [],
      entries: 0,
      entriesByCache: {},
      estimatedUsageBytes: null,
    };
  }

  try {
    const cacheNames = (await window.caches.keys()).filter((name) =>
      name.startsWith(PWA_CACHE_PREFIX),
    );
    const entriesByCache = Object.fromEntries(
      await Promise.all(
        cacheNames.map(async (name) => {
          const cache = await window.caches.open(name);
          return [name, (await cache.keys()).length] as const;
        }),
      ),
    );
    const estimate = window.navigator.storage?.estimate
      ? await window.navigator.storage.estimate()
      : null;

    return {
      supported: true,
      cacheNames,
      entries: Object.values(entriesByCache).reduce(
        (total, count) => total + count,
        0,
      ),
      entriesByCache,
      estimatedUsageBytes:
        typeof estimate?.usage === "number" ? estimate.usage : null,
    };
  } catch {
    return {
      supported: false,
      cacheNames: [],
      entries: 0,
      entriesByCache: {},
      estimatedUsageBytes: null,
    };
  }
}

export async function clearPwaCaches({
  recacheCore = true,
}: { recacheCore?: boolean } = {}): Promise<number> {
  if (typeof window === "undefined" || !("caches" in window)) return 0;

  const cacheNames = (await window.caches.keys()).filter((name) =>
    name.startsWith(PWA_CACHE_PREFIX),
  );
  const results = await Promise.all(
    cacheNames.map((name) => window.caches.delete(name)),
  );

  if (recacheCore) {
    window.navigator.serviceWorker?.controller?.postMessage({
      type: "PM_RECACHE_CORE",
    });
  }

  return results.filter(Boolean).length;
}

export async function activateWaitingServiceWorker(): Promise<boolean> {
  if (typeof window === "undefined" || !("serviceWorker" in window.navigator)) {
    return false;
  }

  const registration =
    await window.navigator.serviceWorker.getRegistration("/");
  const waiting = registration?.waiting;
  if (!waiting) return false;

  let reloading = false;
  const reload = () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  };
  window.navigator.serviceWorker.addEventListener("controllerchange", reload, {
    once: true,
  });
  waiting.postMessage({ type: "SKIP_WAITING" });
  window.setTimeout(reload, 1500);
  return true;
}

export function formatBytes(bytes: number | null): string {
  if (bytes === null || !Number.isFinite(bytes) || bytes < 0) return "Unknown";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value >= 10 ? value.toFixed(1) : value.toFixed(2)} ${units[unitIndex]}`;
}
