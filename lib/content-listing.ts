// Adapted from PM-Web_V2 (AGPL-3.0); see THIRD_PARTY_NOTICES.md.
import type { ContentItem, ContentType } from "@/lib/notion-cms";

export type ListingSearchParams = Record<string, string | string[] | undefined>;
export type ListingView = "grid" | "list";
export type ListingSort = "newest" | "oldest" | "shortest" | "title";
export type ListingOptions = {
  q: string;
  category: string;
  sort: ListingSort;
  view: ListingView;
  letter: string;
  page: number;
};
export const LISTING_PAGE_SIZE = 12;
export const INITIALS = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export function parseListingOptions(
  type: ContentType,
  params: ListingSearchParams,
): ListingOptions {
  const sort = first(params.sort);
  const view = first(params.view);
  const letter = first(params.letter).toUpperCase();
  const page = Number(first(params.page) || 1);
  return {
    q: first(params.q).trim().slice(0, 300),
    category: first(params.category).slice(0, 200),
    sort:
      sort === "newest" ||
      sort === "oldest" ||
      sort === "shortest" ||
      sort === "title"
        ? sort
        : type === "glossary"
          ? "title"
          : "newest",
    view:
      view === "grid" || view === "list"
        ? view
        : type === "glossary"
          ? "list"
          : "grid",
    letter: type === "glossary" && INITIALS.includes(letter) ? letter : "",
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  };
}

export function listingHref(
  type: ContentType,
  options: ListingOptions,
  patch: Partial<ListingOptions> = {},
): string {
  const values = { ...options, ...patch };
  const params = new URLSearchParams();
  if (values.q) params.set("q", values.q);
  if (values.category) params.set("category", values.category);
  if (values.letter) params.set("letter", values.letter);
  params.set("sort", values.sort);
  params.set("view", values.view);
  if (values.page > 1) params.set("page", String(values.page));
  return `/${type}?${params.toString()}`;
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

export function selectListing(items: ContentItem[], options: ListingOptions) {
  const query = options.q.toLocaleLowerCase();
  const searched = items.filter(
    (item) =>
      !query ||
      [
        item.title,
        item.description,
        item.author?.name,
        item.author?.role,
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
