export type AppId = "settings" | "resume";

export type AppMeta = {
  id: AppId;
  title: string;
  kind: string;
  description: string;
  icon: string;
};

export const APP_REGISTRY: Record<AppId, AppMeta> = {
  settings: {
    id: "settings",
    title: "Settings",
    kind: "Workspace preferences",
    description: "Theme and desktop wallpaper preferences",
    icon: "/icons/fluent-color/program.svg",
  },
  resume: {
    id: "resume",
    title: "Resume",
    kind: "Professional portfolio",
    description: "Profile, experience, education, and research interests",
    icon: "/icons/fluent-color/document.svg",
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
