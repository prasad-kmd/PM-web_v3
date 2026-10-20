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
    icon: "/icons/thesvg/files.svg",
    kind: "App",
    description: "System appearance and personalization",
  },
  notepad: {
    id: "notepad",
    title: "Read Me.txt",
    icon: "/icons/thesvg/notepadplusplus.svg",
    kind: "Text document",
    description: "Welcome notes and links",
  },
};

export const PINNED_ORDER: AppId[] = ["settings", "notepad"];

export const RECOMMENDED = [
  { appId: "notepad" as AppId, subtitle: "Opened just now" },
  { appId: "settings" as AppId, subtitle: "Appearance changed" },
];

export const WALLPAPERS = {
  bloom: { src: "/images/desktop-bloom-wallpaper.webp", label: "Bloom" },
  hill: { src: "/images/hill-country-wallpaper.webp", label: "Hill Country" },
  workbench: { src: "/images/workbench-wallpaper.webp", label: "Workbench" },
} as const;

export type Wallpaper = keyof typeof WALLPAPERS;
export type Theme = "light" | "dark";
