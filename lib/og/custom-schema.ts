import { z } from "zod";

export const CANVAS_PRESETS = {
  og: { label: "Open Graph", sublabel: "1200 × 630", width: 1200, height: 630 },
  hd: { label: "HD Cover", sublabel: "1280 × 720", width: 1280, height: 720 },
  social: {
    label: "Social 16:9",
    sublabel: "1200 × 675",
    width: 1200,
    height: 675,
  },
  square: {
    label: "Square 1:1",
    sublabel: "1200 × 1200",
    width: 1200,
    height: 1200,
  },
} as const;

export type OgCanvasPreset = keyof typeof CANVAS_PRESETS;

export const OG_BACKDROPS = {
  "bloom-blue": {
    label: "Bloom Cobalt",
    wallpaper: "projects",
    swatch: "linear-gradient(135deg, #0b2447 0%, #1d5fd6 58%, #60a5fa 100%)",
  },
  "bloom-coral": {
    label: "Bloom Coral",
    wallpaper: "articles",
    swatch: "linear-gradient(135deg, #3b1219 0%, #c2410c 55%, #fb923c 100%)",
  },
  "bloom-violet": {
    label: "Bloom Violet",
    wallpaper: "blog",
    swatch: "linear-gradient(135deg, #1e1338 0%, #6d28d9 55%, #c084fc 100%)",
  },
  "bloom-teal": {
    label: "Bloom Teal",
    wallpaper: "tutorials",
    swatch: "linear-gradient(135deg, #09262a 0%, #0d9488 55%, #5eead4 100%)",
  },
  "bloom-indigo": {
    label: "Bloom Indigo",
    wallpaper: "pages",
    swatch: "linear-gradient(135deg, #11183b 0%, #4338ca 56%, #818cf8 100%)",
  },
  "bloom-emerald": {
    label: "Bloom Botanical",
    wallpaper: "glossary",
    swatch: "linear-gradient(135deg, #0b291e 0%, #059669 56%, #6ee7b7 100%)",
  },
  "bloom-slate": {
    label: "Bloom Editorial",
    wallpaper: "news",
    swatch: "linear-gradient(135deg, #111827 0%, #334155 56%, #94a3b8 100%)",
  },
  obsidian: {
    label: "Obsidian Studio",
    wallpaper: null,
    swatch: "linear-gradient(135deg, #090d16 0%, #141b2d 60%, #1e293b 100%)",
  },
  daylight: {
    label: "Daylight Paper",
    wallpaper: null,
    swatch: "linear-gradient(135deg, #f8fafc 0%, #eef2f6 58%, #dbeafe 100%)",
  },
} as const;

export type OgBackdropId = keyof typeof OG_BACKDROPS;

export const OG_ACCENTS = {
  sky: {
    label: "Desktop Sky",
    hex: "#38bdf8",
    strong: "#0284c7",
    soft: "rgba(56, 189, 248, 0.18)",
  },
  blue: {
    label: "Cobalt Blue",
    hex: "#60a5fa",
    strong: "#2563eb",
    soft: "rgba(96, 165, 250, 0.18)",
  },
  emerald: {
    label: "Emerald",
    hex: "#34d399",
    strong: "#059669",
    soft: "rgba(52, 211, 153, 0.18)",
  },
  violet: {
    label: "Violet",
    hex: "#a78bfa",
    strong: "#7c3aed",
    soft: "rgba(167, 139, 250, 0.18)",
  },
  amber: {
    label: "Amber",
    hex: "#fbbf24",
    strong: "#d97706",
    soft: "rgba(251, 191, 36, 0.18)",
  },
  rose: {
    label: "Rose",
    hex: "#fb7185",
    strong: "#e11d48",
    soft: "rgba(251, 113, 133, 0.18)",
  },
  indigo: {
    label: "Indigo",
    hex: "#818cf8",
    strong: "#4f46e5",
    soft: "rgba(129, 140, 248, 0.18)",
  },
  cyan: {
    label: "Cyan",
    hex: "#22d3ee",
    strong: "#0891b2",
    soft: "rgba(34, 211, 238, 0.18)",
  },
} as const;

export type OgAccentId = keyof typeof OG_ACCENTS;

export const OG_LAYOUTS = {
  spotlight: {
    label: "Bloom Spotlight",
    description: "Floating frosted card over Bloom canvas",
  },
  split: {
    label: "Split Showcase",
    description: "Editorial copy paired with media frame",
  },
  editorial: {
    label: "Full Editorial",
    description: "Edge-to-edge architectural statement",
  },
  minimal: {
    label: "Centered Banner",
    description: "Balanced centerpiece for launches",
  },
} as const;

export type OgLayoutId = keyof typeof OG_LAYOUTS;

export const OG_PATTERNS = {
  none: "Clean",
  grid: "Blueprint Grid",
  dots: "Dot Matrix",
  crosshair: "Corner Ticks",
} as const;

export type OgPatternId = keyof typeof OG_PATTERNS;

export const OG_ICONS = {
  pm: "PM Brand Mark",
  none: "None",
  cpu: "Mechatronics / CPU",
  code: "Software / Code",
  layers: "Systems / CAD",
  terminal: "Terminal",
  sparkles: "Highlight",
  compass: "Architecture",
  wrench: "Hardware",
} as const;

export type OgIconId = keyof typeof OG_ICONS;

export const OgCustomSchema = z.object({
  preset: z.enum(["og", "hd", "social", "square"]).default("og"),
  layout: z
    .enum(["spotlight", "split", "editorial", "minimal"])
    .default("spotlight"),
  backdrop: z
    .enum([
      "bloom-blue",
      "bloom-coral",
      "bloom-violet",
      "bloom-teal",
      "bloom-indigo",
      "bloom-emerald",
      "bloom-slate",
      "obsidian",
      "daylight",
    ])
    .default("bloom-blue"),
  accent: z
    .enum([
      "sky",
      "blue",
      "emerald",
      "violet",
      "amber",
      "rose",
      "indigo",
      "cyan",
    ])
    .default("sky"),
  pattern: z.enum(["none", "grid", "dots", "crosshair"]).default("crosshair"),
  cardTone: z.enum(["dark", "light"]).default("dark"),
  vignette: z.enum(["subtle", "medium", "deep"]).default("medium"),
  title: z
    .string()
    .trim()
    .min(1)
    .max(180)
    .default("Inverse Kinematics for a 6-DOF Stewart Platform"),
  description: z
    .string()
    .trim()
    .max(320)
    .default(
      "Closed-form actuator geometry, workspace singularity maps, and real-time trajectory control.",
    ),
  category: z.string().trim().max(48).default("Mechatronics"),
  kicker: z.string().trim().max(60).default(""),
  tags: z.string().trim().max(160).default("Kinematics, Control, CAD"),
  author: z.string().trim().max(80).default("Prasad Madhuranga"),
  siteName: z.string().trim().max(80).default("Prasad Madhuranga"),
  siteUrl: z.string().trim().max(80).default("pmengineer.lk"),
  icon: z
    .enum([
      "pm",
      "none",
      "cpu",
      "code",
      "layers",
      "terminal",
      "sparkles",
      "compass",
      "wrench",
    ])
    .default("pm"),
  titleSize: z.enum(["auto", "sm", "md", "lg", "xl"]).default("auto"),
  descSize: z.enum(["sm", "md", "lg"]).default("md"),
  align: z.enum(["left", "center"]).default("left"),
  image: z.string().trim().max(1000).default(""),
  imageDataUri: z.string().max(6_000_000).optional(),
  imageFit: z.enum(["cover", "contain"]).default("cover"),
  showAvatar: z.boolean().default(true),
  showFooter: z.boolean().default(true),
  showBorder: z.boolean().default(true),
});

export type OgCustomConfig = z.infer<typeof OgCustomSchema>;

export const DEFAULT_OG_CUSTOM_CONFIG: OgCustomConfig = OgCustomSchema.parse(
  {},
);

export function parseOgCustomSearchParams(
  searchParams: URLSearchParams,
): OgCustomConfig {
  const raw: Record<string, unknown> = {};
  for (const [key, val] of searchParams.entries()) {
    if (key === "showAvatar" || key === "showFooter" || key === "showBorder") {
      raw[key] = val !== "false" && val !== "0";
    } else if (key !== "imageDataUri") {
      raw[key] = val;
    }
  }
  const parsed = OgCustomSchema.safeParse(raw);
  return parsed.success ? parsed.data : DEFAULT_OG_CUSTOM_CONFIG;
}

export function buildOgCustomQuery(config: OgCustomConfig): string {
  const params = new URLSearchParams();
  const entries = Object.entries(config) as Array<
    [keyof OgCustomConfig, OgCustomConfig[keyof OgCustomConfig]]
  >;
  for (const [key, value] of entries) {
    if (key === "imageDataUri" || value === undefined) continue;
    const defaultVal = DEFAULT_OG_CUSTOM_CONFIG[key];
    if (value === defaultVal && key !== "title") continue;
    params.set(key, String(value));
  }
  return params.toString();
}
