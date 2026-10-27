"use client";

import type { AppId } from "@/lib/registry";
import { WindowBreadcrumb } from "@/components/system/WindowBreadcrumb";
import { ResumeApp } from "./ResumeApp";
import { SettingsApp } from "./SettingsApp";

/** Keep desktop windows and direct app routes on the same application body. */
export function AppBody({
  appId,
  onNavigateHome,
}: {
  appId: AppId;
  onNavigateHome?: () => void;
}) {
  switch (appId) {
    case "settings":
      return (
        <div className="settings-app">
          <WindowBreadcrumb
            items={[{ label: "Settings" }]}
            onHomeClick={onNavigateHome}
          />
          <SettingsApp />
        </div>
      );
    case "resume":
      return <ResumeApp onNavigateHome={onNavigateHome} />;
    default:
      return null;
  }
}
