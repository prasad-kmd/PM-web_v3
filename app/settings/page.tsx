import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
  description:
    "Configure workspace theme, desktop wallpaper, backdrop visibility, and automatic wallpaper slideshow.",
};

/* Direct visits to `/settings` render inside the persistent DesktopOS shell
   with the Settings window opened and focused automatically. */
export default function SettingsRoute() {
  return null;
}
