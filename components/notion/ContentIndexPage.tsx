import Link from "next/link";
import { CollectionControls } from "./CollectionControls";
import {
  CONTENT_META,
  formatContentDate,
  getContentIndex,
  type ContentType,
} from "@/lib/notion-cms";
import {
  INITIALS,
  listingHref,
  parseListingOptions,
  selectListing,
  type ListingSearchParams,
} from "@/lib/content-listing";

export async function ContentIndexPage({
  type,
  searchParams,
}: {
  type: ContentType;
  searchParams: ListingSearchParams;
}) {
  const meta = CONTENT_META[type];
  const result = await getContentIndex(type);
  const options = parseListingOptions(type, searchParams);
  const listing = selectListing(result.items, options);
  const href = (patch: Parameters<typeof listingHref>[2]) =>
    listingHref(type, options, patch);
  return (
    <main className="cms-app">
      <div className="cms-toolbar">
        <Link href="/" className="cms-toolbar-home">
          Workspace
        </Link>
        <span aria-hidden="true">/</span>
        <span>{meta.label}</span>
        <span className="cms-toolbar-right">Notion library</span>
      </div>
      <div className="cms-page">
        <header className="cms-heading">
          <div>
            <p className="cms-eyebrow">{meta.eyebrow}</p>
            <h1>{meta.label}</h1>
            <p>{meta.description}</p>
          </div>
          <span className="cms-count">
            {result.configured && !result.error
              ? `${result.items.length} ${result.items.length === 1 ? "entry" : "entries"}`
              : "Collection"}
          </span>
        </header>
        {!result.configured ? (
          <div className="cms-empty" role="status">
            <span className="cms-empty-icon" aria-hidden="true">
              □
            </span>
            <h2>Collection not connected</h2>
            <p>
              This collection is not available yet. Please check back later.
            </p>
          </div>
        ) : result.error ? (
          <div className="cms-empty" role="status">
            <span className="cms-empty-icon" aria-hidden="true">
              !
            </span>
            <h2>Content is temporarily unavailable</h2>
            <p>
              We couldn’t reach this collection. Please try again in a moment.
            </p>
            <Link href={`/${type}`} className="cms-text-link">
              Try again →
            </Link>
          </div>
        ) : (
          <>
            <CollectionControls
              key={`${type}:${options.q}:${options.category}:${options.sort}:${options.view}:${options.letter}`}
              type={type}
              options={options}
              categories={listing.categories}
            />
            {type === "glossary" ? (
              <nav className="cms-letters" aria-label="Glossary initial">
                <Link
                  aria-current={!options.letter ? "page" : undefined}
                  href={href({ letter: "", page: 1 })}
                >
                  All
                </Link>
                {INITIALS.map((letter) =>
                  listing.initials.has(letter) ? (
                    <Link
                      key={letter}
                      href={href({ letter, page: 1 })}
                      aria-current={
                        options.letter === letter ? "page" : undefined
                      }
                    >
                      {letter}
                    </Link>
                  ) : (
                    <span key={letter} aria-disabled="true">
                      {letter}
                    </span>
                  ),
                )}
              </nav>
            ) : null}
            <div className="cms-result-bar">
              <span>
                {listing.total} {listing.total === 1 ? "result" : "results"}
              </span>
              <div className="cms-view-switch" aria-label="Listing view">
                <Link
                  href={href({ view: "grid", page: 1 })}
                  aria-current={options.view === "grid" ? "page" : undefined}
                >
                  Grid
                </Link>
                <Link
                  href={href({ view: "list", page: 1 })}
                  aria-current={options.view === "list" ? "page" : undefined}
                >
                  List
                </Link>
              </div>
            </div>
            {listing.items.length ? (
              <div
                className={`cms-cards ${options.view === "list" ? "is-list" : ""}`}
              >
                {listing.items.map((item) => (
                  <article className="cms-card" key={item.id}>
                    <Link
                      href={`/${type}/${encodeURIComponent(item.slug)}`}
                      className="cms-card-link"
                    >
                      {item.thumbnail || item.image ? (
                        <div className="cms-card-image">
                          <img
                            src={item.thumbnail || item.image || ""}
                            alt=""
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div
                          className="cms-card-placeholder"
                          aria-hidden="true"
                        >
                          <span>▧</span>
                        </div>
                      )}
                      <div className="cms-card-copy">
                        <div className="cms-card-meta">
                          <span>{item.categories[0] || meta.singular}</span>
                          {item.date ? (
                            <time dateTime={item.date}>
                              {formatContentDate(item.date)}
                            </time>
                          ) : null}
                        </div>
                        <h2>{item.title}</h2>
                        {item.description ? <p>{item.description}</p> : null}
                        <div className="cms-card-bottom">
                          <span>
                            {item.author?.name ||
                              (item.readTime
                                ? `${item.readTime} min read`
                                : "Read entry")}
                          </span>
                          <span aria-hidden="true">↗</span>
                        </div>
                      </div>
                    </Link>
                  </article>
                ))}
              </div>
            ) : (
              <div className="cms-empty" role="status">
                <span className="cms-empty-icon" aria-hidden="true">
                  ⌕
                </span>
                <h2>
                  {options.q || options.category || options.letter
                    ? "No matching entries"
                    : "No published entries yet"}
                </h2>
                <p>
                  {options.q || options.category || options.letter
                    ? "Try a different search or clear the filters."
                    : "Published entries will appear here when available."}
                </p>
                {options.q || options.category || options.letter ? (
                  <Link href={`/${type}`} className="cms-text-link">
                    Clear filters →
                  </Link>
                ) : null}
              </div>
            )}
            {listing.pageCount > 1 ? (
              <nav className="cms-pagination" aria-label="Collection pages">
                {listing.page > 1 ? (
                  <Link href={href({ page: listing.page - 1 })}>
                    ← Previous
                  </Link>
                ) : (
                  <span aria-disabled="true">← Previous</span>
                )}
                <span>
                  Page {listing.page} of {listing.pageCount}
                </span>
                {listing.page < listing.pageCount ? (
                  <Link href={href({ page: listing.page + 1 })}>Next →</Link>
                ) : (
                  <span aria-disabled="true">Next →</span>
                )}
              </nav>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
