import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "OG Image Studio",
  robots: { index: false, follow: false },
  description: "Workspace studio for composing and exporting share graphics.",
};

/* Direct visits to `/og-studio` render inside the persistent DesktopOS shell
   with the OG Image Studio window opened and focused when signed in. */
export default function OgStudioRoute() {
  return null;
}
