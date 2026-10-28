/** Shared, serialisable shape of one latest-content entry.
 *
 *  Kept in its own module (no `server-only`) so client components — the résumé
 *  and the desktop widget — can import the type without pulling the Notion
 *  client into the browser bundle. */
export type LatestItem = {
  id: string;
  type: "projects" | "blog" | "articles" | "tutorials" | "glossary" | "news";
  typeLabel: string;
  title: string;
  slug: string;
  href: string;
  summary: string;
  category: string | null;
  date: string | null;
  dateLabel: string | null;
  readTime: number | null;
  /** Same-origin `/api/notion-image` path, or null. */
  image: string | null;
};
