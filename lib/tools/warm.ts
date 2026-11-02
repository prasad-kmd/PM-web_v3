import { TOOL_LOADERS } from "./registry";

type IdleWindow = Window & {
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout: number },
  ) => number;
};

let started = false;

/**
 * Fetch ported tool chunks while the browser is idle so they land in the
 * service worker's static cache. Phases 2–5b now register twenty-seven loaders;
 * the wiring stays here so later phases only add a loader and the offline
 * contract does not have to be redesigned.
 */
export function warmToolModules(): void {
  if (typeof window === "undefined" || started) return;
  started = true;

  const run = () => {
    for (const load of Object.values(TOOL_LOADERS)) {
      void load().catch(() => undefined);
    }
  };

  const schedule = () => {
    const idleWindow = window as IdleWindow;
    if (typeof idleWindow.requestIdleCallback === "function") {
      idleWindow.requestIdleCallback(run, { timeout: 4000 });
    } else {
      window.setTimeout(run, 1200);
    }
  };

  const sw = navigator.serviceWorker;
  if (sw?.controller) {
    schedule();
  } else if (sw) {
    // On a first install the worker is not controlling this page yet. Wait for
    // `controllerchange`, but fall back so development/PWA-off is harmless.
    let done = false;
    const once = () => {
      if (done) return;
      done = true;
      sw.removeEventListener("controllerchange", once);
      schedule();
    };
    sw.addEventListener("controllerchange", once);
    window.setTimeout(once, 8000);
  } else {
    schedule();
  }
}
