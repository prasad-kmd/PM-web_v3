import type { Metadata } from "next";
import { AppPage } from "@/components/apps/AppPage";

export const metadata: Metadata = {
  title: "Read Me",
  description: "Welcome notes, quick links, and how to use this desktop portfolio.",
};

export default function ReadmeRoute() {
  return <AppPage appId="notepad" />;
}
