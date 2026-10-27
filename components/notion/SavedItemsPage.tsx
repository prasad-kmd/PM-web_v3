"use client";
import Link from "next/link";
import { useContentBookmarks } from "./ContentBookmarksProvider";
import { Button } from "@/components/ui/button";
import { WindowBreadcrumb } from "@/components/system/WindowBreadcrumb";

export function SavedItemsPage() {
  const { bookmarks, removeBookmark, ready } = useContentBookmarks();
  return (
    <main className="cms-app">
      <WindowBreadcrumb items={[{ label: "Saved" }]} />
      <div className="cms-page">
        <header className="cms-heading">
          <div>
            <p className="cms-eyebrow">Your library</p>
            <h1>Saved items</h1>
            <p>
              Keep useful entries close. Your saved items stay in this browser.
            </p>
          </div>
          <span className="cms-count">
            {ready ? `${bookmarks.length} saved` : "Loading…"}
          </span>
        </header>
        {!ready ? (
          <p className="cms-status" role="status">
            Loading saved items…
          </p>
        ) : bookmarks.length ? (
          <div className="cms-saved-list">
            {bookmarks.map((item) => (
              <article
                className="cms-saved-item"
                key={`${item.type}:${item.slug}`}
              >
                <div>
                  <p className="cms-eyebrow">{item.type}</p>
                  <h2>
                    <Link
                      href={`/${item.type}/${encodeURIComponent(item.slug)}`}
                    >
                      {item.title}
                    </Link>
                  </h2>
                  {item.description ? <p>{item.description}</p> : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeBookmark(item.type, item.slug)}
                  aria-label={`Remove ${item.title} from saved items`}
                >
                  Remove
                </Button>
              </article>
            ))}
          </div>
        ) : (
          <div className="cms-empty">
            <span className="cms-empty-icon" aria-hidden="true">
              ☆
            </span>
            <h2>Nothing saved yet</h2>
            <p>Use Save on an article or project to find it here later.</p>
            <Link href="/articles" className="cms-text-link">
              Explore articles →
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
