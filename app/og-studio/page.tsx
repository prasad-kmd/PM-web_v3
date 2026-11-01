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
    title: "OG Image Studio",
    robots: { index: false, follow: false },
    description: "Workspace studio for composing and exporting share graphics.",
  };
}

/* Direct visits to `/og-studio` are server-guarded (`private, no-store`).
   Signed-out requests receive a stealth 404; signed-in owner requests open
   the OG Image Studio window inside the persistent DesktopOS shell. */
export default async function OgStudioRoute() {
  const session = await getAdminSession();
  if (!session) notFound();
  return null;
}
