import type { Metadata } from "next";
import { SavedItemsPage } from "@/components/notion/SavedItemsPage";
export const metadata: Metadata = {
  title: "Saved items",
  description: "Your saved content in this browser.",
  robots: { index: false, follow: true },
};
export default function BookmarksPage() {
  return <SavedItemsPage />;
}
