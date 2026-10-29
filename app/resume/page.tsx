import type { Metadata } from "next";
import { SITE_NAME, getSiteUrl } from "@/lib/site";
import { OG_IMAGE_SIZE, ogImageUrl } from "@/lib/content-metadata";

export const metadata: Metadata = {
  title: "Resume",
  alternates: { canonical: `${getSiteUrl()}/resume` },
  openGraph: {
    title: "Resume",
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    url: `${getSiteUrl()}/resume`,
    description:
      "Profile, experience, education, interests, languages, and contact details for Prasad Madhuranga.",
    images: [
      {
        url: ogImageUrl(
          "Resume",
          "Profile, experience, education, interests, languages, and contact details for Prasad Madhuranga.",
          "pages",
        ),
        ...OG_IMAGE_SIZE,
        alt: "Prasad Madhuranga — resume",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Resume",
    description:
      "Profile, experience, education, interests, languages, and contact details for Prasad Madhuranga.",
    images: [
      ogImageUrl(
        "Resume",
        "Profile, experience, education, interests, languages, and contact details for Prasad Madhuranga.",
        "pages",
      ),
    ],
  },
  description:
    "Profile, experience, education, interests, languages, and contact details for Prasad Madhuranga.",
};

/* Direct visits to `/resume` render inside the persistent DesktopOS shell
   with the Resume window opened and focused automatically. */
export default function ResumeRoute() {
  return null;
}
