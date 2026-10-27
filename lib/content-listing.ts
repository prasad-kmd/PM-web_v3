// Adapted from PM-Web_V2 (AGPL-3.0); see THIRD_PARTY_NOTICES.md.
//
// Client-safe listing helpers. Only `q` (search) and `page` (pagination) live
// in the URL. View, sort, category and glossary letter are local UI state —
// view and sort are remembered per collection in localStorage.
import type { ContentType } from "@/lib/content-types";
import type { ContentItem } from "@/lib/notion-cms";

export type ListingSearchParams = Record<string, string | string[] | undefined>;
export type ListingView = "grid" | "list";
export type ListingSort = "newest" | "oldest" | "shortest" | "title";

/** Lean, serialisable item summary sent to the client listing. */
export type ListingItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  date: string | null;
  categories: string[];
  tags: string[];
  technical: string[];
  thumbnail: string | null;
  readTime: number | null;
  authorName: string | null;
  authorRole: string | null;
};

export type ListingOptions = {
  q: string;
  category: string;
  sort: ListingSort;
  letter: string;
  page: number;
};

export const LISTING_PAGE_SIZE = 12;
export const INITIALS = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
export const LISTING_PREFS_KEY = (type: ContentType) =>
  `pm-listing-prefs-v1:${type}`;

export const SORT_LABELS: Record<ListingSort, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  title: "Title A–Z",
  shortest: "Shortest read",
};

export function toListingItem(item: ContentItem): ListingItem {
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    description: item.description,
    date: item.date,
    categories: item.categories,
    tags: item.tags,
    technical: item.technical,
    thumbnail: item.thumbnail || item.image,
    readTime: item.readTime,
    authorName: item.author?.name ?? null,
    authorRole: item.author?.role ?? null,
  };
}

function first(value: string | string[] | null | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/** The only URL state: `?q=` and `?page=`. */
export function parseUrlState(params: {
  q?: string | string[] | null;
  page?: string | string[] | null;
}): { q: string; page: number } {
  const page = Number(first(params.page) || 1);
  return {
    q: first(params.q).trim().slice(0, 300),
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  };
}

/** Build `/type?q=…&page=…`, omitting defaults. */
export function listingUrl(type: ContentType, q: string, page: number) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return `/${type}${query ? `?${query}` : ""}`;
}

export function defaultSort(type: ContentType): ListingSort {
  return type === "glossary" ? "title" : "newest";
}

export function defaultView(type: ContentType): ListingView {
  return type === "glossary" ? "list" : "grid";
}

export function isListingSort(value: unknown): value is ListingSort {
  return (
    value === "newest" ||
    value === "oldest" ||
    value === "shortest" ||
    value === "title"
  );
}

export function titleInitial(title: string): string {
  const letter = title
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .charAt(0)
    .toUpperCase();
  return /^[A-Z]$/.test(letter) ? letter : "#";
}

function timestamp(value: string | null): number | null {
  const result = value ? Date.parse(value) : NaN;
  return Number.isFinite(result) ? result : null;
}

export function selectListing(items: ListingItem[], options: ListingOptions) {
  const query = options.q.toLocaleLowerCase();
  const searched = items.filter(
    (item) =>
      !query ||
      [
        item.title,
        item.description,
        item.authorName,
        item.authorRole,
        ...item.categories,
        ...item.tags,
        ...item.technical,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase()
        .includes(query),
  );
  const categories = new Map<string, number>();
  for (const item of searched)
    for (const category of new Set(item.categories)) {
      categories.set(category, (categories.get(category) ?? 0) + 1);
    }
  const categoryItems = searched.filter(
    (item) => !options.category || item.categories.includes(options.category),
  );
  const initials = new Set(
    categoryItems.map((item) => titleInitial(item.title)),
  );
  const filtered = categoryItems.filter(
    (item) => !options.letter || titleInitial(item.title) === options.letter,
  );
  filtered.sort((a, b) => {
    let order = 0;
    if (options.sort === "title") order = a.title.localeCompare(b.title);
    else if (options.sort === "shortest")
      order =
        a.readTime === null
          ? b.readTime === null
            ? 0
            : 1
          : b.readTime === null
            ? -1
            : a.readTime - b.readTime;
    else {
      const x = timestamp(a.date),
        y = timestamp(b.date);
      order =
        x === null
          ? y === null
            ? 0
            : 1
          : y === null
            ? -1
            : options.sort === "oldest"
              ? x - y
              : y - x;
    }
    return (
      (Number.isFinite(order) ? order : 0) ||
      a.title.localeCompare(b.title) ||
      a.id.localeCompare(b.id)
    );
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / LISTING_PAGE_SIZE));
  const page = Math.min(options.page, pageCount);
  const offset = (page - 1) * LISTING_PAGE_SIZE;
  return {
    items: filtered.slice(offset, offset + LISTING_PAGE_SIZE),
    total: filtered.length,
    page,
    pageCount,
    offset,
    categories: [...categories].sort(([a], [b]) => a.localeCompare(b)),
    initials,
    searchCount: searched.length,
  };
}
