export type WallpaperId =
  | "workspace"
  | "bloom"
  | "hill-country"
  | "workbench"
  | "bloom-lavender"
  | "bloom-teal"
  | "bloom-coral";

export type WallpaperOption = {
  id: WallpaperId;
  label: string;
  description: string;
  src: string;
};

/** Existing wallpaper files are retained; new options follow the Bloom art direction. */
export const WALLPAPERS: WallpaperOption[] = [
  {
    id: "workspace",
    label: "Workspace",
    description: "Original desktop backdrop",
    src: "/images/workspace-background.jpg",
  },
  {
    id: "bloom",
    label: "Bloom",
    description: "Original Windows-inspired ribbon form",
    src: "/images/desktop-bloom-wallpaper.webp",
  },
  {
    id: "bloom-lavender",
    label: "Bloom · Lavender",
    description: "Glossy ribbon bloom in violet and blue",
    src: "/images/desktop-bloom-lavender-wallpaper.webp",
  },
  {
    id: "bloom-teal",
    label: "Bloom · Teal",
    description: "Layered cyan and ocean-blue ribbon",
    src: "/images/desktop-bloom-teal-wallpaper.webp",
  },
  {
    id: "bloom-coral",
    label: "Bloom · Coral",
    description: "Soft coral satin loops on warm ivory",
    src: "/images/desktop-bloom-coral-wallpaper.webp",
  },
  {
    id: "hill-country",
    label: "Hill country",
    description: "Existing Central Province landscape",
    src: "/images/hill-country-wallpaper.webp",
  },
  {
    id: "workbench",
    label: "Workbench",
    description: "Existing material study",
    src: "/images/workbench-wallpaper.webp",
  },
];

export const DEFAULT_WALLPAPER: WallpaperId = "workspace";

export function getWallpaper(id: WallpaperId): WallpaperOption {
  return WALLPAPERS.find((wallpaper) => wallpaper.id === id) ?? WALLPAPERS[0];
}
