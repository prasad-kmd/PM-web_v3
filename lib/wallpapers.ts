export type WallpaperId =
  | "bloom"
  | "bloom-lavender"
  | "bloom-teal"
  | "bloom-coral"
  | "bloom-2"
  | "bloom-3"
  | "bloom-4"
  | "bloom-5";

export type WallpaperOption = {
  id: WallpaperId;
  label: string;
  description: string;
  src: string;
};

export type WallpaperIntensity = "subtle" | "balanced" | "vivid";

export type SlideshowIntervalSec = 15 | 30 | 60 | 300 | 900 | 1800;

/** All available Bloom & Ribbon wallpapers present in public/images. */
export const WALLPAPERS: WallpaperOption[] = [
  {
    id: "bloom",
    label: "Bloom",
    description: "Sculpted cobalt and sky-blue ribbon form",
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
    id: "bloom-2",
    label: "Ribbon · Azure",
    description: "Flowing translucent sky-blue wave",
    src: "/images/desktop-bloom-2-wallpaper.webp",
  },
  {
    id: "bloom-3",
    label: "Ribbon · Mint",
    description: "Seafoam and jade glass ribbons",
    src: "/images/desktop-bloom-3-wallpaper.webp",
  },
  {
    id: "bloom-4",
    label: "Ribbon · Amethyst",
    description: "Sweeping violet and periwinkle silk wave",
    src: "/images/desktop-bloom-4-wallpaper.webp",
  },
  {
    id: "bloom-5",
    label: "Ribbon · Amber",
    description: "Warm coral-amber intertwined glass loops",
    src: "/images/desktop-bloom-5-wallpaper.webp",
  },
];

export const DEFAULT_WALLPAPER: WallpaperId = "bloom";

export const WALLPAPER_INTENSITY_OPTIONS: {
  id: WallpaperIntensity;
  label: string;
  description: string;
}[] = [
  {
    id: "subtle",
    label: "Subtle",
    description: "Quiet low-contrast backdrop",
  },
  {
    id: "balanced",
    label: "Balanced",
    description: "Clear color and ribbon depth",
  },
  {
    id: "vivid",
    label: "Vivid",
    description: "Richer desktop color presence",
  },
];

export const DEFAULT_WALLPAPER_INTENSITY: WallpaperIntensity = "balanced";

export const SLIDESHOW_INTERVAL_OPTIONS: {
  value: SlideshowIntervalSec;
  label: string;
}[] = [
  { value: 15, label: "Every 15 seconds" },
  { value: 30, label: "Every 30 seconds" },
  { value: 60, label: "Every 1 minute" },
  { value: 300, label: "Every 5 minutes" },
  { value: 900, label: "Every 15 minutes" },
  { value: 1800, label: "Every 30 minutes" },
];

export const DEFAULT_SLIDESHOW_INTERVAL: SlideshowIntervalSec = 60;

export function isWallpaperId(value: unknown): value is WallpaperId {
  return (
    typeof value === "string" &&
    WALLPAPERS.some((wallpaper) => wallpaper.id === value)
  );
}

export function resolveWallpaperId(
  value: string | null | undefined,
): WallpaperId {
  return isWallpaperId(value) ? value : DEFAULT_WALLPAPER;
}

export function resolveWallpaperIntensity(
  value: string | null | undefined,
): WallpaperIntensity {
  if (value === "subtle" || value === "balanced" || value === "vivid") {
    return value;
  }
  return DEFAULT_WALLPAPER_INTENSITY;
}

export function resolveSlideshowInterval(
  value: string | number | null | undefined,
): SlideshowIntervalSec {
  const parsed = typeof value === "number" ? value : Number(value);
  const match = SLIDESHOW_INTERVAL_OPTIONS.find(
    (option) => option.value === parsed,
  );
  return match ? match.value : DEFAULT_SLIDESHOW_INTERVAL;
}

export function getWallpaper(id: WallpaperId): WallpaperOption {
  return WALLPAPERS.find((wallpaper) => wallpaper.id === id) ?? WALLPAPERS[0];
}

export function getNextWallpaperId(current: WallpaperId): WallpaperId {
  const currentIndex = WALLPAPERS.findIndex(
    (wallpaper) => wallpaper.id === current,
  );
  const nextIndex =
    currentIndex >= 0 ? (currentIndex + 1) % WALLPAPERS.length : 0;
  return WALLPAPERS[nextIndex].id;
}
