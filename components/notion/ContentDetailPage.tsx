import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight01Icon,
  ArrowUpRight01Icon,
  Calendar03Icon,
  Clock01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
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
import { isFeedType } from "@/lib/content-listing";
import { collectLinks } from "@/lib/inline-links";
import { entryOgImagePath } from "@/lib/og/url";
import { WindowBreadcrumb } from "@/components/system/WindowBreadcrumb";
import { AiAssistedDialog } from "./AiAssistedDialog";
import { NotionBlocks } from "./NotionBlocks";
import {
  ReaderBody,
  ReaderFooter,
  ReaderLayout,
  ReaderOutline,
  ReaderProgress,
  ReaderProvider,
  ReaderSections,
  ReaderToolbarActions,
  type ReaderHeading,
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
          : type === "news"
            ? "NewsArticle"
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
function byReadingOrder(type: ContentType) {
  return (a: ContentItem, b: ContentItem) =>
    type === "glossary"
      ? a.title.localeCompare(b.title, "en", { sensitivity: "base" })
      : Date.parse(b.date || "1970-01-01") -
          Date.parse(a.date || "1970-01-01") || a.title.localeCompare(b.title);
}

const entryHref = (type: ContentType, slug: string) =>
  `/${type}/${encodeURIComponent(slug)}`;

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
      <main className="cms-app rdr-app">
        <WindowBreadcrumb
          items={[
            { label: meta.label, href: `/${type}` },
            { label: "Unavailable" },
          ]}
        />
        <div className="lib-unavailable">
          <div className="lib-empty" role="status">
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
            <Link href={`/${type}`} className="lib-button">
              Back to {meta.label.toLowerCase()}
            </Link>
          </div>
        </div>
      </main>
    );

  const item = result.item;
  const rawHeadings = getContentHeadings(result.blocks);
  const minLevel = Math.min(3, ...rawHeadings.map((heading) => heading.level));
  const headings: ReaderHeading[] = rawHeadings.map((heading) => ({
    id: heading.id,
    label: heading.text,
    depth: Math.min(2, Math.max(0, heading.level - minLevel)),
  }));
  const readTime = item.readTime || estimateReadingTime(result.blocks);
  const topics = [
    ...new Set([...item.categories, ...item.tags, ...item.technical]),
  ];
  const date = formatContentDate(item.date);
  const feed = isFeedType(type);
  const storyLinks = feed ? collectLinks(result.blocks) : [];

  const index = await getContentIndex(type);
  const ordered = [...index.items].sort(byReadingOrder(type));
  const position = ordered.findIndex((other) => other.id === item.id);
  const next = position >= 0 ? ordered[position + 1] : undefined;
  const prev = position > 0 ? ordered[position - 1] : undefined;
  const related = index.items
    .filter((other) => other.id !== item.id && other.id !== next?.id)
    .map((other) => ({
      item: other,
      score: [...other.tags, ...other.categories, ...other.technical].filter(
        (tag) => topics.includes(tag),
      ).length,
    }))
    .filter(({ score }) => score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        Date.parse(b.item.date || "1970-01-01") -
          Date.parse(a.item.date || "1970-01-01"),
    )
    .slice(0, 3);

  return (
    <main className="cms-app rdr-app">
      <JsonLd type={type} item={item} />
      <ReaderProvider
        headings={headings}
        nextHref={next ? entryHref(type, next.slug) : null}
        prevHref={prev ? entryHref(type, prev.slug) : null}
      >
        <WindowBreadcrumb
          items={[
            { label: meta.label, href: `/${type}` },
            { label: item.title },
          ]}
          actions={<ReaderToolbarActions item={item} />}
        />
        <ReaderProgress />
        <ReaderLayout>
          <article className="rdr-doc">
            <header className="rdr-head">
              <p className="rdr-chip">
                <span>
                  {feed ? meta.label : item.categories[0] || meta.singular}
                </span>
                {item.aiAssisted ? (
                  <AiAssistedDialog contentTitle={item.title} />
                ) : null}
              </p>
              <h1>{item.title}</h1>
              {item.description ? (
                <p className="rdr-deck">{item.description}</p>
              ) : null}
              <div className="rdr-meta">
                {item.author?.name ? (
                  <span className="rdr-byline">
                    {item.author.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.author.avatar} alt="" />
                    ) : null}
                    {item.author.name}
                  </span>
                ) : null}
                {date && item.date ? (
                  <span>
                    <HugeiconsIcon
                      icon={Calendar03Icon}
                      size={14}
                      aria-hidden
                    />
                    <time dateTime={item.date}>{date}</time>
                  </span>
                ) : null}
                <span>
                  <HugeiconsIcon icon={Clock01Icon} size={14} aria-hidden />
                  {readTime} min read
                </span>
              </div>
            </header>
            {item.image ? (
              <figure className="rdr-cover">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.image} alt="" />
              </figure>
            ) : (
              /* No cover: the page's share image (same URL as og:image). */
              <figure className="rdr-cover rdr-cover-og">
                <Image
                  src={entryOgImagePath(item, type)}
                  alt=""
                  width={1200}
                  height={630}
                  sizes="(max-width: 760px) 100vw, 700px"
                  preload
                />
              </figure>
            )}
            {result.error ? (
              <div className="cms-notice" role="status">
                Some content blocks could not be loaded. Please try again later.
              </div>
            ) : null}
            {result.blocks.length ? (
              <ReaderBody>
                <NotionBlocks
                  blocks={result.blocks}
                  type={type}
                  pageId={item.id}
                />
              </ReaderBody>
            ) : !result.error ? (
              <p className="cms-status">
                This entry does not have body content yet.
              </p>
            ) : null}

            {storyLinks.length ? (
              <section className="rdr-sources" aria-labelledby="rdr-sources">
                <h2 id="rdr-sources">Links in this story</h2>
                <ul>
                  {storyLinks.map((link) => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        <HugeiconsIcon
                          icon={ArrowUpRight01Icon}
                          size={14}
                          aria-hidden
                        />
                        <span>
                          <strong>{link.label}</strong>
                          {link.host ? <span>{link.host}</span> : null}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <footer className="rdr-end">
              {topics.length ? (
                <ul className="rdr-topics" aria-label="Topics">
                  {topics.map((topic) => (
                    <li key={topic}>{topic}</li>
                  ))}
                </ul>
              ) : null}
              {item.author ? (
                <div className="rdr-author">
                  {item.author.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.author.avatar} alt="" />
                  ) : null}
                  <div>
                    <strong>{item.author.name}</strong>
                    {item.author.role ? <span>{item.author.role}</span> : null}
                    {item.author.biography ? (
                      <p>{item.author.biography}</p>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {item.aiAssisted ? (
                <AiAssistedDialog contentTitle={item.title} variant="note" />
              ) : null}
              {next ? (
                <Link className="rdr-next" href={entryHref(type, next.slug)}>
                  <span className="rdr-next-label">Next in {meta.label}</span>
                  <strong>{next.title}</strong>
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    size={16}
                    aria-hidden
                  />
                </Link>
              ) : null}
              {related.length ? (
                <nav className="rdr-related" aria-label="Related entries">
                  <h2>Related</h2>
                  {related.map(({ item: other }) => (
                    <Link key={other.id} href={entryHref(type, other.slug)}>
                      {other.title}
                    </Link>
                  ))}
                </nav>
              ) : null}
            </footer>
          </article>
          <aside className="rdr-toc" aria-label="On this page">
            <ReaderOutline />
          </aside>
        </ReaderLayout>
        <ReaderFooter
          collectionLabel={meta.label}
          hasNext={Boolean(next)}
          hasPrev={Boolean(prev)}
        />
        <ReaderSections />
      </ReaderProvider>
    </main>
  );
}
