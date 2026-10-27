"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Bookmark01Icon,
  GridViewIcon,
  ListViewIcon,
  Search01Icon,
  Tag01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CONTENT_META,
  CONTENT_TYPES,
  formatContentDate,
  type ContentType,
} from "@/lib/content-types";
import {
  defaultSort,
  defaultView,
  INITIALS,
  isListingSort,
  LISTING_PREFS_KEY,
  listingUrl,
  parseUrlState,
  selectListing,
  SORT_LABELS,
  type ListingItem,
  type ListingSort,
  type ListingView,
} from "@/lib/content-listing";
import { COLLECTION_ICONS } from "./collection-icons";

const SORT_ITEMS = (Object.keys(SORT_LABELS) as ListingSort[]).map((value) => ({
  value,
  label: SORT_LABELS[value],
}));

type BrowserProps = {
  type: ContentType;
  items: ListingItem[];
  /** Server-parsed URL state, used until client search params are available. */
  initialQ: string;
  initialPage: number;
};

/** Reads `?q=` and `?page=` from the URL — the only listing state kept there. */
export function CollectionBrowser(props: BrowserProps) {
  const params = useSearchParams();
  const { q, page } = parseUrlState({
    q: params.get("q"),
    page: params.get("page"),
  });
  return <CollectionBrowserView {...props} q={q} page={page} />;
}

/** Static render used as the Suspense fallback (server HTML for crawlers). */
export function CollectionBrowserFallback(props: BrowserProps) {
  return (
    <CollectionBrowserView
      {...props}
      q={props.initialQ}
      page={props.initialPage}
    />
  );
}

function scrollWindowToTop(from: HTMLElement | null) {
  const scroller = from?.closest(".window-body");
  if (scroller) scroller.scrollTo({ top: 0 });
}

function CollectionBrowserView({
  type,
  items,
  q,
  page,
}: BrowserProps & { q: string; page: number }) {
  const meta = CONTENT_META[type];
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchId = useId();

  // Local-only UI state (never written to the URL).
  const [category, setCategory] = useState("");
  const [letter, setLetter] = useState("");
  const [sort, setSort] = useState<ListingSort>(defaultSort(type));
  const [view, setView] = useState<ListingView>(defaultView(type));
  const [draft, setDraft] = useState(q);

  // Restore remembered view + sort after mount (keeps SSR markup stable).
  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(LISTING_PREFS_KEY(type)) || "null",
      ) as { view?: unknown; sort?: unknown } | null;
      if (saved?.view === "grid" || saved?.view === "list") setView(saved.view);
      if (isListingSort(saved?.sort)) setSort(saved.sort);
    } catch {}
  }, [type]);

  const remember = useCallback(
    (next: { view: ListingView; sort: ListingSort }) => {
      try {
        localStorage.setItem(LISTING_PREFS_KEY(type), JSON.stringify(next));
      } catch {}
    },
    [type],
  );

  /** Native history updates are synced into `useSearchParams` by Next. */
  const writeUrl = useCallback(
    (nextQ: string, nextPage: number, mode: "push" | "replace") => {
      const url = listingUrl(type, nextQ, nextPage);
      if (url === window.location.pathname + window.location.search) return;
      window.history[mode === "push" ? "pushState" : "replaceState"](
        null,
        "",
        url,
      );
    },
    [type],
  );

  // Back/Forward (or another tab of the window) changed `q`: mirror it.
  useEffect(() => {
    setDraft(q);
  }, [q]);

  // Debounced search → `?q=` (replace, so typing doesn't flood history).
  useEffect(() => {
    const next = draft.trim().slice(0, 300);
    if (next === q) return;
    const timer = setTimeout(() => writeUrl(next, 1, "replace"), 250);
    return () => clearTimeout(timer);
  }, [draft, q, writeUrl]);

  // "/" focuses search while this listing is the live window content.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey)
        return;
      const target = event.target as HTMLElement | null;
      if (
        target?.closest(
          "input, textarea, select, [contenteditable=true], [role=menu], [role=listbox]",
        )
      )
        return;
      if (!rootRef.current?.isConnected) return;
      event.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const listing = useMemo(
    () => selectListing(items, { q, category, sort, letter, page }),
    [items, q, category, sort, letter, page],
  );
  const filtered = Boolean(q || category || letter);

  const resetPage = () => writeUrl(q, 1, "replace");
  const chooseCategory = (next: string) => {
    setCategory((current) => (current === next ? "" : next));
    resetPage();
  };
  const chooseLetter = (next: string) => {
    setLetter(next);
    resetPage();
  };
  const goToPage = (event: MouseEvent<HTMLAnchorElement>, next: number) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0)
      return;
    event.preventDefault();
    writeUrl(q, next, "push");
    scrollWindowToTop(rootRef.current);
  };
  const clearFilters = () => {
    setCategory("");
    setLetter("");
    setDraft("");
    writeUrl("", 1, "replace");
  };

  return (
    <div className="lib" ref={rootRef} data-view={view}>
      <aside className="lib-side" aria-label="Library">
        <p className="lib-group">Library</p>
        <nav className="lib-sources" aria-label="Collections">
          {CONTENT_TYPES.map((key) => (
            <Link
              key={key}
              href={`/${key}`}
              className="lib-source"
              aria-current={key === type ? "page" : undefined}
            >
              <HugeiconsIcon
                icon={COLLECTION_ICONS[key]}
                size={15}
                strokeWidth={1.8}
                aria-hidden
              />
              <span>{CONTENT_META[key].label}</span>
              {key === type ? (
                <span className="lib-count">{items.length}</span>
              ) : null}
            </Link>
          ))}
          <Link href="/bookmarks" className="lib-source lib-source-saved">
            <HugeiconsIcon
              icon={Bookmark01Icon}
              size={15}
              strokeWidth={1.8}
              aria-hidden
            />
            <span>Saved</span>
          </Link>
        </nav>
        {listing.categories.length ? (
          <>
            <p className="lib-group">Categories</p>
            <div className="lib-sources" role="group" aria-label="Categories">
              {listing.categories.map(([name, count]) => (
                <button
                  key={name}
                  type="button"
                  className="lib-source"
                  aria-pressed={category === name}
                  onClick={() => chooseCategory(name)}
                >
                  <HugeiconsIcon
                    icon={Tag01Icon}
                    size={14}
                    strokeWidth={1.8}
                    aria-hidden
                  />
                  <span>{name}</span>
                  <span className="lib-count">{count}</span>
                </button>
              ))}
            </div>
          </>
        ) : null}
      </aside>

      <div className="lib-main">
        <div className="lib-tools" role="search">
          <label className="lib-search" htmlFor={searchId}>
            <HugeiconsIcon
              icon={Search01Icon}
              size={15}
              strokeWidth={1.8}
              aria-hidden
            />
            <span className="sr-only">Search {meta.label.toLowerCase()}</span>
            <input
              ref={searchRef}
              id={searchId}
              type="search"
              value={draft}
              maxLength={300}
              placeholder={`Search ${meta.label.toLowerCase()}`}
              autoComplete="off"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape" && draft) {
                  event.preventDefault();
                  setDraft("");
                }
              }}
            />
            <kbd className="lib-kbd" aria-hidden>
              /
            </kbd>
          </label>
          <span className="lib-grow" />
          <Select
            items={SORT_ITEMS}
            value={sort}
            onValueChange={(value) => {
              if (!isListingSort(value)) return;
              setSort(value);
              remember({ view, sort: value });
              resetPage();
            }}
          >
            <SelectTrigger
              className="lib-sort min-w-0"
              aria-label="Sort entries"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectPopup align="end">
              {SORT_ITEMS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
          <ToggleGroup
            className="lib-seg"
            aria-label="Layout"
            value={[view]}
            onValueChange={(value) => {
              const next = value[0];
              if (next !== "grid" && next !== "list") return;
              setView(next);
              remember({ view: next, sort });
            }}
          >
            <Toggle value="grid" aria-label="Grid view">
              <HugeiconsIcon icon={GridViewIcon} size={15} strokeWidth={1.8} />
            </Toggle>
            <Toggle value="list" aria-label="List view">
              <HugeiconsIcon icon={ListViewIcon} size={15} strokeWidth={1.8} />
            </Toggle>
          </ToggleGroup>
        </div>

        <header className="lib-head">
          <div>
            <h1>{meta.label}</h1>
            <p>{meta.description}</p>
          </div>
        </header>

        {type === "glossary" ? (
          <nav className="lib-letters" aria-label="Filter by initial">
            <button
              type="button"
              aria-pressed={!letter}
              onClick={() => chooseLetter("")}
            >
              All
            </button>
            {INITIALS.map((initial) => (
              <button
                key={initial}
                type="button"
                aria-pressed={letter === initial}
                disabled={!listing.initials.has(initial)}
                onClick={() => chooseLetter(initial)}
              >
                {initial}
              </button>
            ))}
          </nav>
        ) : null}

        {listing.items.length ? (
          <>
            {view === "list" ? (
              <div className="lib-cols" aria-hidden>
                <span>Name</span>
                <span>Category</span>
                <span>Published</span>
                <span>Read</span>
              </div>
            ) : null}
            <ul className="lib-items" aria-label={`${meta.label} entries`}>
              {listing.items.map((item) => {
                const date = formatContentDate(item.date);
                const cat = item.categories[0] || meta.singular;
                return (
                  <li key={item.id}>
                    <Link
                      className="lib-tile"
                      href={`/${type}/${encodeURIComponent(item.slug)}`}
                    >
                      <span className="lib-media" aria-hidden>
                        {item.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.thumbnail} alt="" loading="lazy" />
                        ) : (
                          <HugeiconsIcon
                            icon={COLLECTION_ICONS[type]}
                            size={22}
                            strokeWidth={1.5}
                          />
                        )}
                      </span>
                      <span className="lib-copy">
                        <strong>{item.title}</strong>
                        <span className="lib-meta">
                          {cat}
                          {date ? (
                            <>
                              {" · "}
                              <time dateTime={item.date ?? undefined}>
                                {date}
                              </time>
                            </>
                          ) : null}
                        </span>
                      </span>
                      <span className="lib-col">{cat}</span>
                      <span className="lib-col lib-num">{date ?? "—"}</span>
                      <span className="lib-col lib-num">
                        {item.readTime ? `${item.readTime} min` : "—"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <div className="lib-empty" role="status">
            <HugeiconsIcon
              icon={filtered ? Search01Icon : COLLECTION_ICONS[type]}
              size={22}
              strokeWidth={1.6}
              aria-hidden
            />
            <h2>
              {filtered ? "No matching entries" : "No published entries yet"}
            </h2>
            <p>
              {filtered
                ? "Try a different search or clear the filters."
                : "Published entries will appear here when available."}
            </p>
            {filtered ? (
              <button
                type="button"
                className="lib-button"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            ) : null}
          </div>
        )}

        <footer className="lib-status">
          <span className="lib-num" role="status">
            {listing.total} {listing.total === 1 ? "item" : "items"}
            {filtered && listing.total !== items.length
              ? ` of ${items.length}`
              : ""}
          </span>
          {listing.pageCount > 1 ? (
            <nav className="lib-pages" aria-label="Pages">
              {listing.page > 1 ? (
                <a
                  href={listingUrl(type, q, listing.page - 1)}
                  onClick={(event) => goToPage(event, listing.page - 1)}
                  aria-label="Previous page"
                >
                  <HugeiconsIcon icon={ArrowLeft01Icon} size={14} />
                </a>
              ) : (
                <span aria-disabled="true">
                  <HugeiconsIcon icon={ArrowLeft01Icon} size={14} />
                </span>
              )}
              <span className="lib-num">
                Page {listing.page} of {listing.pageCount}
              </span>
              {listing.page < listing.pageCount ? (
                <a
                  href={listingUrl(type, q, listing.page + 1)}
                  onClick={(event) => goToPage(event, listing.page + 1)}
                  aria-label="Next page"
                >
                  <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
                </a>
              ) : (
                <span aria-disabled="true">
                  <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
                </span>
              )}
            </nav>
          ) : null}
          <span className="lib-grow" />
          <span className="lib-synced">Synced from Notion</span>
        </footer>
      </div>
    </div>
  );
}
