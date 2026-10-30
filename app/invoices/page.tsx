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
    title: "Invoice Studio",
    robots: { index: false, follow: false },
    description: "Workspace ledger and client-side PDF invoice studio.",
  };
}

/* Direct visits to `/invoices` are server-guarded (`private, no-store`).
   Signed-out requests receive a stealth 404; signed-in owner requests open
   the Invoice Studio window inside the persistent DesktopOS shell. */
export default async function InvoicesRoute() {
  const session = await getAdminSession();
  if (!session) notFound();
  return null;
}
