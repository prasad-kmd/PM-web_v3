import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Invoice Studio",
  robots: { index: false, follow: false },
  description: "Workspace ledger and client-side PDF invoice studio.",
};

/* Direct visits to `/invoices` render inside the persistent DesktopOS shell
   with the Invoice Studio window opened and focused when signed in. */
export default function InvoicesRoute() {
  return null;
}
