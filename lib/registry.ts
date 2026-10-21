export type AppId = "settings" | "notepad";

export type AppMeta = {
  id: AppId;
  title: string;
  kind: string;
  description: string;
};

export const APP_REGISTRY: Record<AppId, AppMeta> = {
  settings: {
    id: "settings",
    title: "Settings",
    kind: "Workspace preferences",
    description: "Light and dark workspace appearance",
  },
  notepad: {
    id: "notepad",
    title: "Read Me.txt",
    kind: "Text document",
    description: "Welcome notes, bio, and engineering quick links",
  },
};

export const DESKTOP_APPS: AppId[] = ["settings", "notepad"];

export type Theme = "light" | "dark";
