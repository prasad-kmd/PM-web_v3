import type { Metadata } from "next";
import { AppPage } from "@/components/apps/AppPage";

export const metadata: Metadata = {
  title: "Resume",
  description:
    "Profile, experience, education, interests, languages, and contact details for Prasad Madhuranga.",
};

export default function ResumeRoute() {
  return <AppPage appId="resume" />;
}
