"use client";

import dynamic from "next/dynamic";
import { useAdminAuth } from "@/components/admin/AdminAuthProvider";
import { LoadingView } from "@/components/system/states/LoadingView";
import { WindowBreadcrumb } from "@/components/system/WindowBreadcrumb";
import type { AppId } from "@/lib/registry";
import { ResumeApp } from "./ResumeApp";
import { SettingsApp } from "./SettingsApp";

const OgStudioApp = dynamic(
  () =>
    import("@/components/admin/og/OgStudioApp").then((mod) => mod.OgStudioApp),
  {
    ssr: false,
    loading: () => <LoadingView label="OG Image Studio" layout="og-studio" />,
  },
);

const InvoiceStudioApp = dynamic(
  () =>
    import("@/components/admin/invoice/InvoiceStudioApp").then(
      (mod) => mod.InvoiceStudioApp,
    ),
  {
    ssr: false,
    loading: () => <LoadingView label="Invoice Studio" layout="invoices" />,
  },
);

/** Keep desktop windows and direct app routes on the same application body. */
export function AppBody({
  appId,
  onNavigateHome,
}: {
  appId: AppId;
  onNavigateHome?: () => void;
}) {
  const { authenticated, ready } = useAdminAuth();

  switch (appId) {
    case "settings":
      return (
        <div className="settings-app">
          <WindowBreadcrumb
            items={[{ label: "Settings" }]}
            onHomeClick={onNavigateHome}
          />
          <SettingsApp />
        </div>
      );
    case "resume":
      return <ResumeApp onNavigateHome={onNavigateHome} />;
    case "og-studio":
      if (!ready) {
        return <LoadingView label="OG Image Studio" layout="og-studio" />;
      }
      if (!authenticated) return null;
      return <OgStudioApp />;
    case "invoices":
      if (!ready) {
        return <LoadingView label="Invoice Studio" layout="invoices" />;
      }
      if (!authenticated) return null;
      return <InvoiceStudioApp />;
    default:
      return null;
  }
}
