import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAdminSession } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const session = await getAdminSession();
  if (!session) {
    return {
      title: "Page not found",
      robots: { index: false, follow: false },
    };
  }
  return {
    title: "Content Insights",
    robots: { index: false, follow: false },
    description: "Public content readership trends and entry performance.",
  };
}

/* Direct visits to `/insights` are server-guarded (`private, no-store`).
   Signed-out requests receive a stealth 404; signed-in owner requests open
   the Content Insights window inside the persistent DesktopOS shell. */
export default async function InsightsRoute() {
  const session = await getAdminSession();
  if (!session) notFound();
  return null;
}
