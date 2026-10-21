"use client";

import type { AppId } from "@/lib/registry";
import { ResumeApp } from "./ResumeApp";
import { SettingsApp } from "./SettingsApp";

/** Keep desktop windows and direct app routes on the same application body. */
export function AppBody({ appId }: { appId: AppId }) {
  switch (appId) {
    case "settings":
      return <SettingsApp />;
    case "resume":
      return <ResumeApp />;
    default:
      return null;
  }
}
