import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DevStatesPreview } from "@/components/system/states/DevStatesPreview";
import { getSuggestionEntries } from "@/lib/suggestion-entries";

export const metadata: Metadata = {
  title: "State preview",
  robots: { index: false, follow: false },
};

/** Development preview of loading / not-found / error / global-error. */
export default async function DevStatesPage() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ENABLE_DEV_ROUTES !== "1"
  )
    notFound();
  const entries = await getSuggestionEntries();
  return <DevStatesPreview entries={entries} />;
}
