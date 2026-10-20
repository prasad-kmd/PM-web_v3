import type { Metadata } from "next";
import { AppPage } from "@/components/apps/AppPage";

export const metadata: Metadata = {
  title: "Settings",
  description: "Personalize the desktop — theme, accent colour, and wallpaper.",
};

export default function SettingsRoute() {
  return <AppPage appId="settings" />;
}
