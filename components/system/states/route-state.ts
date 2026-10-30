import { CONTENT_TYPES } from "@/lib/content-types";
import { LEGAL_DOCUMENTS, LEGAL_HUB_ROUTE } from "@/lib/legal";
import { APP_REGISTRY, getAppIdFromPathname } from "@/lib/registry";
import type { LoadingLayout } from "./LoadingView";

/** Window label + skeleton layout for a pathname (loading and error states). */
export function describeRoute(pathname: string | null | undefined): {
  label: string;
  layout: LoadingLayout;
} {
  const appId = getAppIdFromPathname(pathname);
  const legalDocument = LEGAL_DOCUMENTS.find(
    (document) => document.route === pathname,
  );
  const label = legalDocument
    ? legalDocument.title
    : appId
      ? APP_REGISTRY[appId].title
      : "page";
  if (appId === "invoices") {
    return { label, layout: "invoices" };
  }
  if (appId === "og-studio") {
    return { label, layout: "og-studio" };
  }
  if (appId === "legal") {
    return {
      label,
      layout: pathname === LEGAL_HUB_ROUTE ? "page" : "reader",
    };
  }
  const segments = (pathname ?? "").split("/").filter(Boolean);
  const isCollection = CONTENT_TYPES.some((type) => type === segments[0]);
  const isTaxonomy = segments[0] === "categories" || segments[0] === "tags";
  const layout: LoadingLayout = isTaxonomy
    ? "listing"
    : !isCollection
      ? "page"
      : segments.length > 1
        ? "reader"
        : "listing";
  return { label, layout };
}
