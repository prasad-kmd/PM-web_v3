"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { usePwaInstall, type PwaInstallStatus } from "@/hooks/usePwaInstall";
import { PWA_INSTALL_TOAST_ID } from "@/lib/pwa";

/**
 * Central install-progress feedback, independent of which control started
 * installation. The loading toast and completion toast deliberately share an
 * ID so Sonner turns “Installing…” into “Installed” instead of stacking two
 * unrelated permanent notifications.
 */
export function PwaInstallToasts() {
  const { status } = usePwaInstall();
  const previousStatusRef = useRef<PwaInstallStatus>("checking");
  const installStartedRef = useRef(false);

  useEffect(() => {
    const previous = previousStatusRef.current;

    if (
      status === "installing" &&
      previous !== "installing" &&
      previous !== "checking"
    ) {
      installStartedRef.current = true;
      toast.loading("Installing workspace…", {
        id: PWA_INSTALL_TOAST_ID,
        description: "Your browser is adding Prasad M. to this device.",
      });
    } else if (
      previous === "installing" &&
      status !== "installed" &&
      installStartedRef.current
    ) {
      // The browser accepted the choice but no completion event arrived
      // before the hook's safety timeout. Do not leave a stale spinner.
      installStartedRef.current = false;
      toast.dismiss(PWA_INSTALL_TOAST_ID);
    }

    previousStatusRef.current = status;
  }, [status]);

  useEffect(() => {
    const onInstalled = () => {
      installStartedRef.current = false;
      toast.success("Workspace installed", {
        id: PWA_INSTALL_TOAST_ID,
        description:
          "You can now open Prasad M. from your apps or home screen.",
      });
    };

    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);

  return null;
}
