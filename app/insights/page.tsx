import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Content Insights",
  robots: { index: false, follow: false },
  description: "Public content readership trends and entry performance.",
};

/* Direct visits to `/insights` render inside the persistent DesktopOS shell
   with the Content Insights window opened and focused when signed in. */
export default function InsightsRoute() {
  return null;
}
