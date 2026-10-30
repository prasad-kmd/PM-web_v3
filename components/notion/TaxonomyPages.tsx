import Link from "next/link";
import { notFound } from "next/navigation";
import { Folder01Icon, Tag01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { WindowBreadcrumb } from "@/components/system/WindowBreadcrumb";
import {
  CONTENT_META,
  CONTENT_TYPES,
  formatContentDate,
} from "@/lib/content-types";
import type { ContentItem } from "@/lib/notion-cms";
import { getSiteUrl } from "@/lib/site";
import {
  TAXONOMY_META,
  getTaxonomyIndex,
  getTaxonomyTerm,
  type TaxonomyIndex,
  type TaxonomyTerm,
} from "@/lib/taxonomy";
import type { TaxonomyKind } from "@/lib/taxonomy-slug";
import { COLLECTION_ICONS } from "./collection-icons";

const KIND_ICON = { categories: Folder01Icon, tags: Tag01Icon } as const;

function collectionsSummary(term: TaxonomyTerm): string {
  return CONTENT_TYPES.filter((type) => term.countsByType[type])
    .map((type) => `${CONTENT_META[type].label} ${term.countsByType[type]}`)
    .join(" · ");
}

function TaxonomySidebar({
  kind,
  index,
  currentSlug,
}: {
  kind: TaxonomyKind;
  index: TaxonomyIndex;
  currentSlug?: string;
}) {
  return (
    <aside className="lib-side" aria-label="Library">
      <p className="lib-group">Library</p>
      <nav className="lib-sources" aria-label="Collections">
        {CONTENT_TYPES.map((type) => (
          <Link key={type} href={`/${type}`} className="lib-source">
            <HugeiconsIcon
              icon={COLLECTION_ICONS[type]}
              size={15}
              strokeWidth={1.8}
              aria-hidden
            />
            <span>{CONTENT_META[type].label}</span>
          </Link>
        ))}
      </nav>

      <p className="lib-group">Browse by</p>
      <nav className="lib-sources" aria-label="Browse by">
        {(["categories", "tags"] as const).map((candidate) => (
          <Link
            key={candidate}
            href={`/${candidate}`}
            className="lib-source"
            aria-current={candidate === kind ? "page" : undefined}
          >
            <HugeiconsIcon
              icon={KIND_ICON[candidate]}
              size={15}
              strokeWidth={1.8}
              aria-hidden
            />
            <span>{TAXONOMY_META[candidate].label}</span>
            <span className="lib-count">{index.terms[candidate].length}</span>
          </Link>
        ))}
      </nav>

      {index.terms[kind].length ? (
        <>
          <p className="lib-group">{TAXONOMY_META[kind].label}</p>
          <nav
            className="lib-sources"
            aria-label={`All ${TAXONOMY_META[kind].label.toLowerCase()}`}
          >
            {index.terms[kind].map((term) => (
              <Link
                key={term.slug}
                href={`/${kind}/${encodeURIComponent(term.slug)}`}
                className="lib-source"
                aria-current={term.slug === currentSlug ? "page" : undefined}
              >
                <HugeiconsIcon
                  icon={KIND_ICON[kind]}
                  size={14}
                  strokeWidth={1.8}
                  aria-hidden
                />
                <span>{term.label}</span>
                <span className="lib-count">{term.count}</span>
              </Link>
            ))}
          </nav>
        </>
      ) : null}
    </aside>
  );
}

function Unavailable({ kind }: { kind: TaxonomyKind }) {
  const meta = TAXONOMY_META[kind];
  return (
    <main className="cms-app lib-app">
      <WindowBreadcrumb items={[{ label: meta.label }]} />
      <div className="lib-unavailable">
        <div className="lib-empty" role="status">
          <h1>Content is temporarily unavailable</h1>
          <p>
            We couldn’t reach the collections to build this index. Please try
            again in a moment.
          </p>
          <Link href={`/${kind}`} className="lib-button">
            Try again
          </Link>
        </div>
      </div>
    </main>
  );
}

function JsonLd({ kind, term }: { kind: TaxonomyKind; term: TaxonomyTerm }) {
  const base = getSiteUrl();
  const url = `${base}/${kind}/${encodeURIComponent(term.slug)}`;
  const data = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${term.label} · ${TAXONOMY_META[kind].label}`,
    url,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: term.count,
      itemListElement: term.items.map((item, position) => ({
        "@type": "ListItem",
        position: position + 1,
        url: `${base}/${item.type}/${encodeURIComponent(item.slug)}`,
        name: item.title,
      })),
    },
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: base },
      {
        "@type": "ListItem",
        position: 2,
        name: TAXONOMY_META[kind].label,
        item: `${base}/${kind}`,
      },
      { "@type": "ListItem", position: 3, name: term.label, item: url },
    ],
  };
  return (
    <>
      {[data, breadcrumb].map((value, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(value).replace(/</g, "\\u003c"),
          }}
        />
      ))}
    </>
  );
}

function EntryTile({ item }: { item: ContentItem }) {
  const meta = CONTENT_META[item.type];
  const date = formatContentDate(item.date);
  const category = item.categories[0];
  const media = item.thumbnail || item.image;
  return (
    <li>
      <Link
        className="lib-tile"
        href={`/${item.type}/${encodeURIComponent(item.slug)}`}
      >
        <span className="lib-media" aria-hidden>
          {media ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={media} alt="" loading="lazy" />
          ) : (
            <HugeiconsIcon
              icon={COLLECTION_ICONS[item.type]}
              size={22}
              strokeWidth={1.5}
            />
          )}
        </span>
        <span className="lib-copy">
          <strong>{item.title}</strong>
          {item.description ? (
            <span className="tax-desc">{item.description}</span>
          ) : null}
          <span className="lib-meta">
            {category || meta.singular}
            {date ? (
              <>
                {" · "}
                <time dateTime={item.date ?? undefined}>{date}</time>
              </>
            ) : null}
            {item.readTime ? ` · ${item.readTime} min read` : null}
          </span>
        </span>
      </Link>
    </li>
  );
}

/** `/categories` and `/tags`: every term, with counts, A–Z. */
export async function TaxonomyIndexPage({ kind }: { kind: TaxonomyKind }) {
  const meta = TAXONOMY_META[kind];
  const index = await getTaxonomyIndex();
  if (!index.configured) return <Unavailable kind={kind} />;
  const terms = index.terms[kind];

  return (
    <main className="cms-app lib-app">
      <WindowBreadcrumb items={[{ label: meta.label }]} />
      <div className="lib" data-view="grid">
        <TaxonomySidebar kind={kind} index={index} />
        <div className="lib-main tax-main">
          <header className="lib-head tax-head">
            <div>
              <h1>{meta.label}</h1>
              <p>{meta.description}</p>
            </div>
          </header>

          {terms.length ? (
            <ul className="tax-terms" aria-label={meta.label}>
              {terms.map((term) => (
                <li key={term.slug}>
                  <Link
                    className="tax-term"
                    href={`/${kind}/${encodeURIComponent(term.slug)}`}
                  >
                    <span className="tax-term-top">
                      <HugeiconsIcon
                        icon={KIND_ICON[kind]}
                        size={15}
                        strokeWidth={1.8}
                        aria-hidden
                      />
                      <strong>{term.label}</strong>
                      <span className="lib-count">{term.count}</span>
                    </span>
                    <span className="tax-term-meta">
                      {collectionsSummary(term)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="lib-empty" role="status">
              <h2>No {meta.label.toLowerCase()} yet</h2>
              <p>
                Published entries have not been filed under any{" "}
                {meta.singular.toLowerCase()} so far.
              </p>
            </div>
          )}

          <footer className="lib-status">
            <span className="lib-num" role="status">
              {terms.length} {terms.length === 1 ? "term" : "terms"} ·{" "}
              {index.totalItems} {index.totalItems === 1 ? "entry" : "entries"}{" "}
              indexed
            </span>
          </footer>
        </div>
      </div>
    </main>
  );
}

/** `/categories/<slug>` and `/tags/<slug>`: one term across every collection. */
export async function TaxonomyTermPage({
  kind,
  slug,
}: {
  kind: TaxonomyKind;
  slug: string;
}) {
  const meta = TAXONOMY_META[kind];
  const { term, index } = await getTaxonomyTerm(kind, slug);
  // Only a complete index proves a slug does not exist; a partial one
  // (a collection down or unconfigured) shows the unavailable surface.
  if (!term && index.complete) notFound();
  if (!term) return <Unavailable kind={kind} />;

  const groups = CONTENT_TYPES.map((type) => ({
    type,
    items: term.items.filter((item) => item.type === type),
  })).filter((group) => group.items.length > 0);
  const moreTerms = index.terms[kind]
    .filter((candidate) => candidate.slug !== term.slug)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 12);

  return (
    <main className="cms-app lib-app">
      <JsonLd kind={kind} term={term} />
      <WindowBreadcrumb
        items={[{ label: meta.label, href: `/${kind}` }, { label: term.label }]}
      />
      <div className="lib" data-view="grid">
        <TaxonomySidebar kind={kind} index={index} currentSlug={term.slug} />
        <div className="lib-main tax-main">
          <header className="lib-head tax-head">
            <div>
              <p className="tax-eyebrow">{meta.singular}</p>
              <h1>{term.label}</h1>
              <p>
                {term.count} {term.count === 1 ? "entry" : "entries"} across{" "}
                {groups.length}{" "}
                {groups.length === 1 ? "collection" : "collections"} ·{" "}
                {collectionsSummary(term)}
              </p>
            </div>
          </header>

          {groups.map((group) => (
            <section
              key={group.type}
              className="tax-group"
              aria-labelledby={`tax-${group.type}`}
            >
              <div className="tax-group-head">
                <h2 id={`tax-${group.type}`}>
                  <HugeiconsIcon
                    icon={COLLECTION_ICONS[group.type]}
                    size={16}
                    strokeWidth={1.8}
                    aria-hidden
                  />
                  {CONTENT_META[group.type].label}
                  <span className="lib-count">{group.items.length}</span>
                </h2>
                <Link href={`/${group.type}`}>
                  Open {CONTENT_META[group.type].label.toLowerCase()}
                </Link>
              </div>
              <ul
                className="lib-items"
                aria-label={`${CONTENT_META[group.type].label} filed under ${term.label}`}
              >
                {group.items.map((item) => (
                  <EntryTile key={`${item.type}:${item.id}`} item={item} />
                ))}
              </ul>
            </section>
          ))}

          {moreTerms.length ? (
            <nav
              className="tax-more"
              aria-label={`More ${meta.label.toLowerCase()}`}
            >
              <h2>More {meta.label.toLowerCase()}</h2>
              <ul className="rdr-topics">
                {moreTerms.map((candidate) => (
                  <li key={candidate.slug}>
                    <Link
                      href={`/${kind}/${encodeURIComponent(candidate.slug)}`}
                    >
                      {candidate.label}
                      <span className="lib-count"> {candidate.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}

          <footer className="lib-status">
            <span className="lib-num" role="status">
              {term.count} {term.count === 1 ? "item" : "items"}
            </span>
            <Link className="tax-all" href={`/${kind}`}>
              All {meta.label.toLowerCase()}
            </Link>
          </footer>
        </div>
      </div>
    </main>
  );
}
