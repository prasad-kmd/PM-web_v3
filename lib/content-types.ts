/** Client-safe collection definitions shared by server and client code. */
export const CONTENT_TYPES = [
  "projects",
  "blog",
  "articles",
  "tutorials",
  "glossary",
  "news",
] as const;

export type ContentType = (typeof CONTENT_TYPES)[number];

export const CONTENT_META: Record<
  ContentType,
  { label: string; eyebrow: string; singular: string; description: string }
> = {
  projects: {
    label: "Projects",
    eyebrow: "Selected work",
    singular: "Project",
    description:
      "Engineering work, experiments and things built along the way.",
  },
  blog: {
    label: "Blog",
    eyebrow: "Field notes",
    singular: "Post",
    description: "Ideas, observations and notes from the experience.",
  },
  articles: {
    label: "Articles",
    eyebrow: "Long-form writing",
    singular: "Article",
    description:
      "Useful insights and writing into engineering, technology and research.",
  },
  tutorials: {
    label: "Tutorials",
    eyebrow: "Learn by doing",
    singular: "Tutorial",
    description:
      "Practical guides, worked examples and technical walkthroughs.",
  },
  glossary: {
    label: "Glossary",
    eyebrow: "Reference",
    singular: "Term",
    description:
      "A growing reference for useful engineering terms and concepts.",
  },
  news: {
    label: "News",
    eyebrow: "Updates",
    singular: "Story",
    description: "Short updates from engineering, technology and research.",
  },
};

export function formatContentDate(value: string | null): string | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(timestamp);
}
