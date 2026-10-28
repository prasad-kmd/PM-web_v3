import {
  Book02Icon,
  BookOpen01Icon,
  File02Icon,
  Folder01Icon,
  News01Icon,
  NewspaperIcon,
  Notebook01Icon,
} from "@hugeicons/core-free-icons";

/** OG image types accepted by `/api/og?type=`. Unknown values fall back to `default`. */
export const OG_TYPES = {
  projects: {
    singular: "Project",
    collection: "Projects",
    accent: "#3d6fe0",
    wallpaper: "projects",
    icon: Folder01Icon,
  },
  blog: {
    singular: "Blog post",
    collection: "Blog",
    accent: "#e0785f",
    wallpaper: "blog",
    icon: Notebook01Icon,
  },
  articles: {
    singular: "Article",
    collection: "Articles",
    accent: "#8a7cf2",
    wallpaper: "articles",
    icon: News01Icon,
  },
  tutorials: {
    singular: "Tutorial",
    collection: "Tutorials",
    accent: "#19a4b8",
    wallpaper: "tutorials",
    icon: BookOpen01Icon,
  },
  glossary: {
    singular: "Glossary term",
    collection: "Glossary",
    accent: "#3bb58a",
    wallpaper: "glossary",
    icon: Book02Icon,
  },
  news: {
    singular: "News",
    collection: "News",
    accent: "#e0a43b",
    wallpaper: "news",
    icon: NewspaperIcon,
  },
  pages: {
    singular: "Page",
    collection: "Workspace",
    accent: "#a3a3a3",
    wallpaper: "pages",
    icon: File02Icon,
  },
  default: {
    singular: "Page",
    collection: "Workspace",
    accent: "#a3a3a3",
    wallpaper: "pages",
    icon: File02Icon,
  },
} as const;

export type OgType = keyof typeof OG_TYPES;
export type OgKind = "detail" | "collection" | "home" | "page";
export type OgStyle = "editorial" | "window";

/** Collections shown as desktop shortcuts on the window card. */
export const OG_SHORTCUTS = [
  "projects",
  "blog",
  "articles",
  "tutorials",
  "glossary",
  "news",
] as const satisfies readonly OgType[];

export function resolveOgType(value: string | null): OgType {
  return value && Object.hasOwn(OG_TYPES, value)
    ? (value as OgType)
    : "default";
}

export function resolveOgKind(value: string | null, type: OgType): OgKind {
  if (value === "detail" || value === "collection" || value === "home")
    return value;
  return type === "default" ? "home" : "page";
}

/** `?style=` wins, then the `OG_STYLE` env, then the approved default. */
export function resolveOgStyle(value: string | null): OgStyle {
  const candidate = value || process.env.OG_STYLE || "editorial";
  return candidate === "window" ? "window" : "editorial";
}

export type OgCardData = {
  type: OgType;
  kind: OgKind;
  eyebrow: string;
  title: string;
  description: string;
  /** Label/value rows (editorial media panel). */
  facts: { label: string; value: string }[];
  /** Short inline metadata (window card). */
  meta: string[];
  /** Data URI for the media panel / backdrop. */
  media: string;
  /** True when `media` is the entry's own cover (not a wallpaper). */
  hasCover: boolean;
  avatar: string;
  logo: string;
  domain: string;
  author: string;
};
