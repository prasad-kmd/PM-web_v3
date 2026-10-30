"use client";

import { Download04Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";
import { usePwaInstall } from "@/hooks/usePwaInstall";

export const PWA_INSTALL_SHORTCUT_ID = "pwa-install";

/**
 * A first-class desktop shortcut for installing the workspace.
 *
 * A real button click keeps the browser user activation that Chromium
 * requires for `BeforeInstallPromptEvent.prompt()`. The profile-menubar item
 * could lose that activation while the menu closed, so it has been replaced
 * by this directly clickable desktop affordance.
 */
export function DesktopInstallShortcut({
  selected = false,
  onSelect,
}: {
  selected?: boolean;
  onSelect?: () => void;
} = {}) {
  const { status, installed, installing, canInstall, isIos, promptInstall } =
    usePwaInstall();

  // Only surface the shortcut when clicking it can actually start the
  // browser install flow (or show the iOS Share instructions). This avoids
  // replacing the old menubar item with another button that can only toast.
  if (
    installed ||
    status === "checking" ||
    (!canInstall && !isIos && !installing)
  ) {
    return null;
  }

  const handleInstall = () => {
    if (installing) return;

    void promptInstall().then((outcome) => {
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
    });
  };

  return (
    <button
      type="button"
      data-shortcut-id={PWA_INSTALL_SHORTCUT_ID}
      data-pwa-install-shortcut=""
      className={`desktop-shortcut desktop-install-shortcut${selected ? " is-selected" : ""}`}
      onPointerDown={(event) => {
        event.stopPropagation();
        onSelect?.();
      }}
      onFocus={() => onSelect?.()}
      onClick={handleInstall}
      disabled={installing}
      aria-label={installing ? "Installing workspace" : "Install workspace app"}
      aria-busy={installing || undefined}
    >
      <span className="shortcut-icon desktop-install-icon" aria-hidden>
        {/* A plain img keeps this on the public icon path instead of routing
            it through the Next image optimizer that the SW deliberately skips. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/pwa/icon-192.png" alt="" width={30} height={30} />
        <span className="desktop-install-badge">
          <HugeiconsIcon icon={Download04Icon} strokeWidth={2.2} size={10} />
        </span>
      </span>
      <span className="shortcut-label">
        {installing ? "Installing…" : "Install app"}
      </span>
    </button>
  );
}
