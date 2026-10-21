"use client";

import Link from "next/link";
import { useState, type MouseEvent } from "react";
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { DesktopContextMenuContent } from "@/components/desktop/ContextMenu";
import { AppBody } from "@/components/apps/AppBody";
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";
import { APP_REGISTRY, type AppId } from "@/lib/registry";

/** A direct-route rendering of the same app body shown in a desktop window. */
export function AppPage({ appId }: { appId: AppId }) {
  const meta = APP_REGISTRY[appId];
  const [contextTarget, setContextTarget] = useState<{
    link: string | null;
    image: string | null;
  }>({ link: null, image: null });

  const captureContextTarget = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    const link = target.closest("a[href]") as HTMLAnchorElement | null;
    const image = target.closest("img") as HTMLImageElement | null;
    setContextTarget({
      link: link?.href ?? null,
      image: image?.src ?? null,
    });
  };

  const navigateToApp = (targetApp: AppId) => {
    window.location.assign(`/${targetApp}`);
  };

  return (
    <main className="standalone">
      <ContextMenu>
        <ContextMenuTrigger
          className="window-body-context-trigger"
          onContextMenu={(event) => {
            event.preventDefault();
            captureContextTarget(event);
          }}
        >
          <div className="standalone-shell">
            <div className="standalone-bar">
              <Link href="/" className="standalone-back">
                <HugeiconsIcon icon={ArrowLeft02Icon} strokeWidth={2} size={15} />
                Back to desktop
              </Link>
              <span className="standalone-title">{meta.title}</span>
            </div>
            <div className="standalone-body">
              <AppBody appId={appId} />
            </div>
          </div>
        </ContextMenuTrigger>
        <DesktopContextMenuContent
          onOpenSettings={() => navigateToApp("settings")}
          onOpenResume={() => navigateToApp("resume")}
          targetLink={contextTarget.link}
          targetImage={contextTarget.image}
        />
      </ContextMenu>
    </main>
  );
}
