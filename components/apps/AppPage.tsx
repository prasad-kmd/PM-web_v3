"use client";

import { Desktop } from "@/components/desktop/Desktop";
import type { AppId } from "@/lib/registry";

/**
 * Legacy compatibility wrapper: all application routes now open natively
 * inside the persistent DesktopOS view.
 */
export function AppPage(_props: { appId: AppId }) {
  return <Desktop />;
}
