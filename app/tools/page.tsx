import type { Metadata } from "next";
import { SITE_NAME, getSiteUrl } from "@/lib/site";
import { OG_IMAGE_SIZE, ogImageUrl } from "@/lib/content-metadata";

const description =
  "Offline engineering utilities and calculators in the PM Web desktop workspace.";

export const metadata: Metadata = {
  title: "Tools",
  description,
  alternates: { canonical: `${getSiteUrl()}/tools` },
  openGraph: {
    title: "Tools",
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    url: `${getSiteUrl()}/tools`,
    description,
    images: [
      {
        url: ogImageUrl("Tools", description, "pages"),
        ...OG_IMAGE_SIZE,
        alt: "PM Web Tools",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tools",
    description,
    images: [ogImageUrl("Tools", description, "pages")],
  },
};

/* Direct visits to `/tools` render inside the persistent DesktopOS shell
   with the Tool Bench window opened and focused automatically. */
export default function ToolsRoute() {
  return null;
}
