import type { Metadata } from "next";
import { AppPage } from "@/components/apps/AppPage";

export const metadata: Metadata = {
  title: "Settings",
  description: "Choose the exact light or dark Animate UI workspace mode.",
};

export default function SettingsRoute() {
  return <AppPage appId="settings" />;
}
