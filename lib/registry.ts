export type AppId = "settings" | "notepad";

export type AppMeta = {
  id: AppId;
  title: string;
  icon: string;
  kind: string;
  description: string;
};

export const APP_REGISTRY: Record<AppId, AppMeta> = {
  settings: {
    id: "settings",
    title: "Settings",
    icon: "/icons/fluent-color/program.svg",
    kind: "System App",
    description: "Personalization, appearance, and wallpaper settings",
  },
  notepad: {
    id: "notepad",
    title: "Read Me.txt",
    icon: "/icons/fluent-color/document.svg",
    kind: "Text document",
    description: "Welcome notes, bio, and engineering quick links",
  },
};

export const DESKTOP_APPS: AppId[] = ["settings", "notepad"];

export const WALLPAPERS = {
  hill: { src: "/images/hill-country-wallpaper.webp", label: "Hill Country (Kandy)" },
  bloom: { src: "/images/desktop-bloom-wallpaper.webp", label: "Spatial Bloom" },
  workbench: { src: "/images/workbench-wallpaper.webp", label: "Studio Workbench" },
} as const;

export type Wallpaper = keyof typeof WALLPAPERS;
export type Theme = "light" | "dark";
