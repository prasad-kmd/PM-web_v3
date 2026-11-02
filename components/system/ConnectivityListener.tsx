"use client";

import { Wifi01Icon, WifiOff01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect } from "react";
import { toast } from "sonner";

const TOAST_ID = "connectivity-toast";

/**
 * The v1 connectivity notification, ported to v3's Hugeicons + existing
 * bottom-right sonner Toaster. Unlike v1 it also handles a hard load that
 * starts offline, where no `offline` event fires.
 *
 * Renders nothing: this is a listener mounted once next to the service-worker
 * registrar in the persistent desktop workspace.
 */
export function ConnectivityListener(): null {
  useEffect(() => {
    const offline = () => {
      toast.error("You are offline", {
        id: TOAST_ID,
        description: "Please check your internet connection.",
        duration: Infinity,
        icon: <HugeiconsIcon icon={WifiOff01Icon} strokeWidth={2} size={16} />,
      });
    };

    const online = () => {
      toast.success("Back online", {
        id: TOAST_ID,
        description: "Your internet connection has been restored.",
        duration: 5000,
        icon: <HugeiconsIcon icon={Wifi01Icon} strokeWidth={2} size={16} />,
      });
    };

    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    if (!navigator.onLine) offline();

    return () => {
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
    };
  }, []);

  return null;
}
