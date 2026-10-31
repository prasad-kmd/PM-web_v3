import type { Metadata } from "next";
import { NotFoundView } from "@/components/system/states/NotFoundView";
import { getSuggestionEntries } from "@/lib/suggestion-entries";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default async function NotFound() {
  const entries = await getSuggestionEntries();
  return <NotFoundView entries={entries} />;
}
