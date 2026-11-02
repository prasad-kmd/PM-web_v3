export type AppId =
  | "settings"
  | "tools"
  | "resume"
  | "projects"
  | "blog"
  | "articles"
  | "tutorials"
  | "glossary"
  | "news"
  | "categories"
  | "tags"
  | "bookmarks"
  | "contact"
  | "legal"
  | "og-studio"
  | "invoices"
  | "insights";

export type AppMeta = {
  id: AppId;
  title: string;
  kind: string;
  description: string;
  route: `/${AppId}`;
  /** Additional canonical paths that open this same routed window. */
  aliases?: readonly string[];
  adminOnly?: boolean;
};
export const APP_REGISTRY: Record<AppId, AppMeta> = {
  resume: {
    id: "resume",
    title: "Resume",
    kind: "Professional portfolio",
    description: "Profile, experience, education, and research interests",
    route: "/resume",
  },
  projects: {
    id: "projects",
    title: "Projects",
    kind: "Selected work",
    description: "Engineering work, experiments, and projects",
    route: "/projects",
  },
  blog: {
    id: "blog",
    title: "Blog",
    kind: "Field notes",
    description: "Notes, ideas, and observations",
    route: "/blog",
  },
  articles: {
    id: "articles",
    title: "Articles",
    kind: "Long-form writing",
    description: "Engineering, technology, and research articles",
    route: "/articles",
  },
  tutorials: {
    id: "tutorials",
    title: "Tutorials",
    kind: "Practical guides",
    description: "Guides, examples, and walkthroughs",
    route: "/tutorials",
  },
  glossary: {
    id: "glossary",
    title: "Glossary",
    kind: "Reference",
    description: "Engineering terms and concepts",
    route: "/glossary",
  },
  news: {
    id: "news",
    title: "News",
    kind: "Updates",
    description: "Short updates from engineering, technology, and research",
    route: "/news",
  },
  categories: {
    id: "categories",
    title: "Categories",
    kind: "Browse by category",
    description: "Content grouped by category across every collection",
    route: "/categories",
  },
  tags: {
    id: "tags",
    title: "Tags",
    kind: "Browse by tag",
    description: "Content grouped by tag and technical topic",
    route: "/tags",
  },
  bookmarks: {
    id: "bookmarks",
    title: "Saved",
    kind: "Saved items",
    description: "Content saved in this browser",
    route: "/bookmarks",
  },
  contact: {
    id: "contact",
    title: "Contact",
    kind: "Get in touch",
    description: "Send a message to Prasad",
    route: "/contact",
  },
  legal: {
    id: "legal",
    title: "Legal",
    kind: "Privacy & terms",
    description:
      "Privacy Policy, Terms and Conditions, Disclaimer, and cookies",
    route: "/legal",
    aliases: ["/privacy-policy", "/terms-and-conditions", "/disclaimer"],
  },
  settings: {
    id: "settings",
    title: "Settings",
    kind: "Workspace preferences",
    description: "Theme and desktop wallpaper preferences",
    route: "/settings",
  },
  tools: {
    id: "tools",
    title: "Tools",
    kind: "Engineering utilities",
    description: "Offline engineering utilities and calculators",
    route: "/tools",
  },
  "og-studio": {
    id: "og-studio",
    title: "OG Image Studio",
    kind: "Brand graphics",
    description: "Compose and export social share artwork",
    route: "/og-studio",
    adminOnly: true,
  },
  invoices: {
    id: "invoices",
    title: "Invoice Studio",
    kind: "Workspace ledger",
    description: "Compose invoices, manage clients, and export PDFs",
    route: "/invoices",
    adminOnly: true,
  },
  insights: {
    id: "insights",
    title: "Content Insights",
    kind: "Readership",
    description: "Public content readership trends and top entries",
    route: "/insights",
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
  "tools",
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
  "categories",
  "tags",
  "bookmarks",
  "contact",
  "legal",
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
      const meta = APP_REGISTRY[id];
      const routes = [meta.route, ...(meta.aliases ?? [])];
      return routes.some(
        (route) =>
          normalized === route ||
          (usesRouteContent(id) && normalized.startsWith(`${route}/`)),
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
