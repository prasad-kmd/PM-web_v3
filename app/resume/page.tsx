import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resume",
  description:
    "Profile, experience, education, interests, languages, and contact details for Prasad Madhuranga.",
};

/* Direct visits to `/resume` render inside the persistent DesktopOS shell
   with the Resume window opened and focused automatically. */
export default function ResumeRoute() {
  return null;
}
