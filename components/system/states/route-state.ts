import { CONTENT_TYPES } from "@/lib/content-types";
import { APP_REGISTRY, getAppIdFromPathname } from "@/lib/registry";
import type { LoadingLayout } from "./LoadingView";

/** Window label + skeleton layout for a pathname (loading and error states). */
export function describeRoute(pathname: string | null | undefined): {
  label: string;
  layout: LoadingLayout;
} {
  const appId = getAppIdFromPathname(pathname);
  const label = appId ? APP_REGISTRY[appId].title : "page";
  const segments = (pathname ?? "").split("/").filter(Boolean);
  const isCollection = CONTENT_TYPES.some((type) => type === segments[0]);
  const layout: LoadingLayout = !isCollection
    ? "page"
    : segments.length > 1
      ? "reader"
      : "listing";
  return { label, layout };
}
