import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site";
import { ogImageUrl } from "@/lib/content-metadata";

export const metadata: Metadata = {
  title: "Resume",
  alternates: { canonical: `${getSiteUrl()}/resume` },
  openGraph: {
    title: "Resume",
    description: "Profile and experience of Prasad Madhuranga.",
    images: [
      {
        url: ogImageUrl(
          "Resume",
          "Profile and experience of Prasad Madhuranga.",
          "pages",
        ),
        width: 1280,
        height: 720,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: [
      ogImageUrl(
        "Resume",
        "Profile and experience of Prasad Madhuranga.",
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
