/* The persistent DesktopOS shell is mounted in RootLayout so navigating
   between `/`, `/resume`, and `/settings` updates the URL and history stack
   without unmounting open windows. */
import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site";

export const metadata: Metadata = {
  alternates: {
    canonical: getSiteUrl(),
    types: { "application/rss+xml": "/feed.xml" },
  },
};

export default function Page() {
  return null;
}
