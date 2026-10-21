"use client";

import Link from "next/link";
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { APP_REGISTRY, type AppId } from "@/lib/registry";
import { AppBody } from "./AppBody";

/** A direct-route rendering of the same app body shown in a desktop window. */
export function AppPage({ appId }: { appId: AppId }) {
  const meta = APP_REGISTRY[appId];

  return (
    <main className="standalone">
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
    </main>
  );
}
