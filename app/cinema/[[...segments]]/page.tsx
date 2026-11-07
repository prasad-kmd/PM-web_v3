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
    title: "Cinema Studio",
    robots: { index: false, follow: false },
    description: "Private film and series library.",
  };
}

/**
 * Every cinema URL — `/cinema`, `/cinema/movie/550`, `/cinema/person/287`,
 * `/cinema/list/row/trending` — resolves to this one guarded page.
 *
 * It renders nothing: the DesktopOS shell detects the app from the pathname and
 * mounts `<AppBody appId="cinema" />`, whose in-window router reads the same
 * pathname. A catch-all keeps the guard in exactly one place while still giving
 * the browser real, shareable URLs and working back/forward.
 *
 * There is deliberately **no** `loading.tsx` here: a loading boundary would
 * flash the skeleton on every in-window navigation.
 */
export default async function CinemaRoute() {
  const session = await getAdminSession();
  if (!session) notFound();
  return null;
}
