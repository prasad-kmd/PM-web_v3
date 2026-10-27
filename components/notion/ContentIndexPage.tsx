import Link from "next/link";
import { Suspense } from "react";
import { WindowBreadcrumb } from "@/components/system/WindowBreadcrumb";
import {
  CONTENT_META,
  getContentIndex,
  type ContentType,
} from "@/lib/notion-cms";
import {
  parseUrlState,
  toListingItem,
  type ListingSearchParams,
} from "@/lib/content-listing";
import {
  CollectionBrowser,
  CollectionBrowserFallback,
} from "./CollectionBrowser";

export async function ContentIndexPage({
  type,
  searchParams,
}: {
  type: ContentType;
  searchParams: ListingSearchParams;
}) {
  const meta = CONTENT_META[type];
  const result = await getContentIndex(type);
  const { q, page } = parseUrlState(searchParams);
  const unavailable = !result.configured || result.error;
  const items = unavailable ? [] : result.items.map(toListingItem);
  const browserProps = { type, items, initialQ: q, initialPage: page };
  return (
    <main className="cms-app lib-app">
      <WindowBreadcrumb items={[{ label: meta.label }]} />
      {unavailable ? (
        <div className="lib-unavailable">
          <div className="lib-empty" role="status">
            <h1>
              {!result.configured
                ? "Collection not connected"
                : "Content is temporarily unavailable"}
            </h1>
            <p>
              {!result.configured
                ? "This collection is not available yet. Please check back later."
                : "We couldn’t reach this collection. Please try again in a moment."}
            </p>
            {result.configured ? (
              <Link href={`/${type}`} className="lib-button">
                Try again
              </Link>
            ) : null}
          </div>
        </div>
      ) : (
        <Suspense fallback={<CollectionBrowserFallback {...browserProps} />}>
          <CollectionBrowser {...browserProps} />
        </Suspense>
      )}
    </main>
  );
}
