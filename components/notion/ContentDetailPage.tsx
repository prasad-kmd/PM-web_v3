import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CONTENT_META,
  estimateReadingTime,
  formatContentDate,
  getContentDetail,
  getContentHeadings,
  getContentIndex,
  type ContentItem,
  type ContentType,
} from "@/lib/notion-cms";
import { getSiteUrl } from "@/lib/site";
import { NotionBlocks } from "./NotionBlocks";
import {
  BookmarkToggle,
  ReaderExperience,
  ShareButton,
} from "./ReaderControls";

function JsonLd({ type, item }: { type: ContentType; item: ContentItem }) {
  const base = getSiteUrl();
  const url = `${base}/${type}/${encodeURIComponent(item.slug)}`;
  const data = {
    "@context": "https://schema.org",
    "@type":
      type === "projects"
        ? "CreativeWork"
        : type === "glossary"
          ? "DefinedTerm"
          : "TechArticle",
    headline: item.title,
    name: item.title,
    description: item.description || undefined,
    url,
    datePublished: item.date || undefined,
    dateModified: item.lastEditedTime || item.date || undefined,
    image: item.image ? new URL(item.image, base).toString() : undefined,
    author: item.author
      ? { "@type": "Person", name: item.author.name }
      : undefined,
    keywords:
      [...item.categories, ...item.tags, ...item.technical].join(", ") ||
      undefined,
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: base },
      {
        "@type": "ListItem",
        position: 2,
        name: CONTENT_META[type].label,
        item: `${base}/${type}`,
      },
      { "@type": "ListItem", position: 3, name: item.title, item: url },
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
export async function ContentDetailPage({
  type,
  slug,
}: {
  type: ContentType;
  slug: string;
}) {
  const result = await getContentDetail(type, slug);
  const meta = CONTENT_META[type];
  if (result.configured && !result.error && !result.item) notFound();
  if (!result.item)
    return (
      <main className="cms-app">
        <div className="cms-toolbar">
          <Link href={`/${type}`}>← {meta.label}</Link>
        </div>
        <div className="cms-page">
          <div className="cms-empty" role="status">
            <span className="cms-empty-icon">!</span>
            <h1>
              {result.configured
                ? "Content is temporarily unavailable"
                : "Collection not connected"}
            </h1>
            <p>
              {result.configured
                ? "We couldn’t reach this entry. Please try again."
                : "This collection is not available yet."}
            </p>
            <Link href={`/${type}`} className="cms-text-link">
              Back to {meta.label.toLowerCase()} →
            </Link>
          </div>
        </div>
      </main>
    );
  const item = result.item;
  const headings = getContentHeadings(result.blocks);
  const readTime = item.readTime || estimateReadingTime(result.blocks);
  const topics = [
    ...new Set([...item.categories, ...item.tags, ...item.technical]),
  ];
  const index = await getContentIndex(type);
  const related = index.items
    .filter((other) => other.id !== item.id)
    .map((other) => ({
      item: other,
      score: [...other.tags, ...other.categories, ...other.technical].filter(
        (tag) => topics.includes(tag),
      ).length,
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        Date.parse(b.item.date || "1970-01-01") -
          Date.parse(a.item.date || "1970-01-01"),
    )
    .slice(0, 3);
  return (
    <main className="cms-app">
      <JsonLd type={type} item={item} />
      <div className="cms-toolbar">
        <Link href="/">Workspace</Link>
        <span>/</span>
        <Link href={`/${type}`}>{meta.label}</Link>
        <span>/</span>
        <span className="cms-crumb-title">{item.title}</span>
      </div>
      <div className="cms-page cms-detail-layout">
        <article className="cms-detail">
          <Link className="cms-back" href={`/${type}`}>
            ← Back to {meta.label.toLowerCase()}
          </Link>
          <header className="cms-detail-header">
            <p className="cms-eyebrow">
              {meta.singular}
              {item.aiAssisted ? " · AI-assisted" : ""}
            </p>
            <h1>{item.title}</h1>
            {item.description ? (
              <p className="cms-deck">{item.description}</p>
            ) : null}
            <div className="cms-detail-meta">
              {item.date ? (
                <time dateTime={item.date}>{formatContentDate(item.date)}</time>
              ) : null}
              <span>{readTime} min read</span>
              {item.author?.name ? <span>By {item.author.name}</span> : null}
            </div>
            {topics.length ? (
              <ul className="cms-topics" aria-label="Topics">
                {topics.map((topic) => (
                  <li key={topic}>{topic}</li>
                ))}
              </ul>
            ) : null}
            <div className="cms-detail-actions">
              <BookmarkToggle item={item} />
              <ShareButton />
              {item.aiAssisted ? (
                <details className="cms-ai">
                  <summary>About AI assistance</summary>
                  <p>This entry was marked as AI-assisted by its author.</p>
                </details>
              ) : null}
            </div>
          </header>
          {item.image ? (
            <figure className="cms-hero-image">
              <img src={item.image} alt="" />
            </figure>
          ) : null}
          {result.error ? (
            <div className="cms-notice" role="status">
              Some content blocks could not be loaded. Please try again later.
            </div>
          ) : null}
          {result.blocks.length ? (
            <ReaderExperience>
              <NotionBlocks
                blocks={result.blocks}
                type={type}
                pageId={item.id}
              />
            </ReaderExperience>
          ) : !result.error ? (
            <p className="cms-status">
              This entry does not have body content yet.
            </p>
          ) : null}
          {related.length ? (
            <section className="cms-related">
              <div className="cms-section-head">
                <h2>More from {meta.label}</h2>
                <Link href={`/${type}`}>Browse all →</Link>
              </div>
              {related.map(({ item: other }) => (
                <Link
                  key={other.id}
                  className="cms-related-link"
                  href={`/${type}/${encodeURIComponent(other.slug)}`}
                >
                  <span>{other.title}</span>
                  <span aria-hidden="true">↗</span>
                </Link>
              ))}
            </section>
          ) : null}
        </article>
        <aside className="cms-outline">
          <details open>
            <summary>On this page</summary>
            {headings.length ? (
              <nav aria-label="Article outline">
                <ul>
                  {headings.map((heading) => (
                    <li
                      key={heading.id}
                      style={{
                        paddingLeft: `${Math.max(0, heading.level - 1) * 10}px`,
                      }}
                    >
                      <a href={`#${heading.id}`}>{heading.text}</a>
                    </li>
                  ))}
                </ul>
              </nav>
            ) : (
              <p>No sections in this entry.</p>
            )}
          </details>
          {item.author ? (
            <div className="cms-author">
              <span className="cms-eyebrow">Author</span>
              <strong>{item.author.name}</strong>
              {item.author.role ? <p>{item.author.role}</p> : null}
              {item.author.biography ? <p>{item.author.biography}</p> : null}
            </div>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
