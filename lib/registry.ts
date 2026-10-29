export type AppId =
  | "settings"
  | "resume"
  | "projects"
  | "blog"
  | "articles"
  | "tutorials"
  | "glossary"
  | "news"
  | "bookmarks"
  | "contact"
  | "og-studio"
  | "invoices";

export type AppMeta = {
  id: AppId;
  title: string;
  kind: string;
  description: string;
  icon: string;
  route: `/${AppId}`;
  adminOnly?: boolean;
};
export const APP_REGISTRY: Record<AppId, AppMeta> = {
  resume: {
    id: "resume",
    title: "Resume",
    kind: "Professional portfolio",
    description: "Profile, experience, education, and research interests",
    icon: "/icons/fluent-color/document.svg",
    route: "/resume",
  },
  projects: {
    id: "projects",
    title: "Projects",
    kind: "Selected work",
    description: "Engineering work, experiments, and projects",
    icon: "/icons/fluent-color/folder.svg",
    route: "/projects",
  },
  blog: {
    id: "blog",
    title: "Blog",
    kind: "Field notes",
    description: "Notes, ideas, and observations",
    icon: "/icons/fluent-color/document.svg",
    route: "/blog",
  },
  articles: {
    id: "articles",
    title: "Articles",
    kind: "Long-form writing",
    description: "Engineering, technology, and research articles",
    icon: "/icons/fluent-color/document.svg",
    route: "/articles",
  },
  tutorials: {
    id: "tutorials",
    title: "Tutorials",
    kind: "Practical guides",
    description: "Guides, examples, and walkthroughs",
    icon: "/icons/fluent-color/documents_folder.svg",
    route: "/tutorials",
  },
  glossary: {
    id: "glossary",
    title: "Glossary",
    kind: "Reference",
    description: "Engineering terms and concepts",
    icon: "/icons/fluent-color/archive_folder.svg",
    route: "/glossary",
  },
  news: {
    id: "news",
    title: "News",
    kind: "Updates",
    description: "Short updates from engineering, technology, and research",
    icon: "/icons/fluent-color/file.svg",
    route: "/news",
  },
  bookmarks: {
    id: "bookmarks",
    title: "Saved",
    kind: "Saved items",
    description: "Content saved in this browser",
    icon: "/icons/fluent-color/favorite_folder.svg",
    route: "/bookmarks",
  },
  contact: {
    id: "contact",
    title: "Contact",
    kind: "Get in touch",
    description: "Send a message to Prasad",
    icon: "/icons/fluent-color/account.svg",
    route: "/contact",
  },
  settings: {
    id: "settings",
    title: "Settings",
    kind: "Workspace preferences",
    description: "Theme and desktop wallpaper preferences",
    icon: "/icons/fluent-color/program.svg",
    route: "/settings",
  },
  "og-studio": {
    id: "og-studio",
    title: "OG Image Studio",
    kind: "Brand graphics",
    description: "Compose and export social share artwork",
    icon: "/icons/fluent-color/program.svg",
    route: "/og-studio",
    adminOnly: true,
  },
  invoices: {
    id: "invoices",
    title: "Invoice Studio",
    kind: "Workspace ledger",
    description: "Compose invoices, manage clients, and export PDFs",
    icon: "/icons/fluent-color/document.svg",
    route: "/invoices",
    adminOnly: true,
  },
};
export const DESKTOP_APPS: AppId[] = [
  "resume",
  "projects",
  "blog",
  "articles",
  "tutorials",
  "glossary",
  "news",
  "bookmarks",
  "contact",
  "settings",
];
export const PINNED_ORDER: AppId[] = ["resume", "settings"];
export const DOCK_ORDER: AppId[] = ["resume", "settings"];
export const RECOMMENDED = [
  { appId: "resume" as const, subtitle: "Profile, experience, and education" },
  { appId: "settings" as const, subtitle: "Theme and desktop wallpaper" },
];
export type Theme = "light" | "dark";
export const WORKSPACE_DEFAULT_TITLE = "Prasad M. — Desktop Workspace";
const ROUTED_APPS: AppId[] = [
  "projects",
  "blog",
  "articles",
  "tutorials",
  "glossary",
  "news",
  "bookmarks",
  "contact",
];
export function usesRouteContent(appId: AppId | null): appId is AppId {
  return appId !== null && ROUTED_APPS.includes(appId);
}
export function isAdminOnlyApp(appId: AppId | null): boolean {
  return appId !== null && Boolean(APP_REGISTRY[appId]?.adminOnly);
}
export function getAppIdFromPathname(
  pathname: string | null | undefined,
): AppId | null {
  if (!pathname) return null;
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return (
    (Object.keys(APP_REGISTRY) as AppId[]).find((id) => {
      const route = APP_REGISTRY[id].route;
      return (
        normalized === route ||
        (usesRouteContent(id) && normalized.startsWith(`${route}/`))
      );
    }) ?? null
  );
}
export function getPathnameForApp(appId: AppId | null): string {
  return appId ? APP_REGISTRY[appId].route : "/";
}
export function getDocumentTitleForApp(appId: AppId | null): string {
  return appId
    ? `${APP_REGISTRY[appId].title} · Prasad M.`
    : WORKSPACE_DEFAULT_TITLE;
}
