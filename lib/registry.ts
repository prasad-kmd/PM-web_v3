export type AppId = "settings" | "resume";

export type AppMeta = {
  id: AppId;
  title: string;
  kind: string;
  description: string;
  icon: string;
  route: `/${AppId}`;
};

export const APP_REGISTRY: Record<AppId, AppMeta> = {
  settings: {
    id: "settings",
    title: "Settings",
    kind: "Workspace preferences",
    description: "Theme and desktop wallpaper preferences",
    icon: "/icons/fluent-color/program.svg",
    route: "/settings",
  },
  resume: {
    id: "resume",
    title: "Resume",
    kind: "Professional portfolio",
    description: "Profile, experience, education, and research interests",
    icon: "/icons/fluent-color/document.svg",
    route: "/resume",
  },
};

export const DESKTOP_APPS: AppId[] = ["resume", "settings"];
export const PINNED_ORDER: AppId[] = ["resume", "settings"];
export const DOCK_ORDER: AppId[] = ["resume", "settings"];
export const RECOMMENDED = [
  { appId: "resume" as const, subtitle: "Profile, experience, and education" },
  { appId: "settings" as const, subtitle: "Theme and desktop wallpaper" },
];

export type Theme = "light" | "dark";

export const WORKSPACE_DEFAULT_TITLE = "Prasad M. — Desktop Workspace";

export function getAppIdFromPathname(
  pathname: string | null | undefined,
): AppId | null {
  if (!pathname) return null;
  const normalized = pathname.replace(/\/+$/, "") || "/";
  if (normalized === "/resume") return "resume";
  if (normalized === "/settings") return "settings";
  return null;
}

export function getPathnameForApp(appId: AppId | null): string {
  return appId ? APP_REGISTRY[appId].route : "/";
}

export function getDocumentTitleForApp(appId: AppId | null): string {
  return appId
    ? `${APP_REGISTRY[appId].title} · Prasad M.`
    : WORKSPACE_DEFAULT_TITLE;
}
