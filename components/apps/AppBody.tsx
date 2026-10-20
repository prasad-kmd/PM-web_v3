"use client";

import type { AppId } from "@/lib/registry";
import { NotepadApp } from "./NotepadApp";
import { SettingsApp } from "./SettingsApp";

/* One place that maps an app id to its body. Adding an app = add a case + a
   registry entry + a component file. Nothing else in the shell needs to know. */
export function AppBody({ appId }: { appId: AppId }) {
  switch (appId) {
    case "settings":
      return <SettingsApp />;
    case "notepad":
      return <NotepadApp />;
    default:
      return null;
  }
}
