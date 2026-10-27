"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import {
  ArrowUpRight01Icon,
  Bookmark01Icon,
  Home01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { COLLECTION_ICONS } from "@/components/notion/collection-icons";
import {
  WindowBreadcrumb,
  type WindowCrumb,
} from "@/components/system/WindowBreadcrumb";
import { Button } from "@/components/ui/button";
import {
  CONTENT_META,
  CONTENT_TYPES,
  formatContentDate,
} from "@/lib/content-types";
import { APP_REGISTRY, getAppIdFromPathname } from "@/lib/registry";
import { suggestEntries, type SuggestionEntry } from "@/lib/suggestions";

/**
 * Not found — approved In-window document (02): breadcrumb, the missing
 * path, closest published entries and collection shortcuts.
 */
export function NotFoundView({
  entries,
  path,
}: {
  entries: SuggestionEntry[];
  /** Overrides the current pathname (used by /dev/states). */
  path?: string;
}) {
  const currentPath = usePathname();
  const pathname = path ?? currentPath ?? "/";
  const appId = getAppIdFromPathname(pathname);
  const app = appId ? APP_REGISTRY[appId] : null;
  const suggestions = useMemo(
    () => suggestEntries(pathname, entries),
    [pathname, entries],
  );
  const crumbs: WindowCrumb[] = [
    ...(app ? [{ label: app.title, href: app.route }] : []),
    { label: "Not found" },
  ];
  const browse = appId && appId in CONTENT_META ? app : null;

  return (
    <main className="state-doc" aria-labelledby="state-nf-title">
      <WindowBreadcrumb items={crumbs} />
      <div className="state-doc-body">
        <p className="state-eyebrow">
          <span className="state-code">404</span>
          Not found
        </p>
        <h1 id="state-nf-title">We couldn’t find that page</h1>
        <p className="state-lead">
          Nothing is published at <code className="state-path">{pathname}</code>
          . It may have moved or been unpublished.
        </p>

        {suggestions.length ? (
          <section className="state-section" aria-labelledby="state-nf-dym">
            <h2 id="state-nf-dym">Did you mean</h2>
            <ul className="state-suggestions">
              {suggestions.map((entry) => {
                const date = formatContentDate(entry.date);
                return (
                  <li key={`${entry.type}:${entry.slug}`}>
                    <Link
                      href={`/${entry.type}/${encodeURIComponent(entry.slug)}`}
                    >
                      <span className="state-sg-icon" aria-hidden>
                        <HugeiconsIcon
                          icon={COLLECTION_ICONS[entry.type]}
                          size={17}
                          strokeWidth={1.7}
                        />
                      </span>
                      <span className="state-sg-copy">
                        <strong>{entry.title}</strong>
                        <span>
                          {entry.category || CONTENT_META[entry.type].singular}
                          {date ? ` · ${date}` : ""}
                        </span>
                      </span>
                      <HugeiconsIcon
                        icon={ArrowUpRight01Icon}
                        size={14}
                        aria-hidden
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <section className="state-section" aria-labelledby="state-nf-browse">
          <h2 id="state-nf-browse">Or browse the library</h2>
          <nav className="state-collections" aria-label="Collections">
            {CONTENT_TYPES.map((type) => (
              <Link key={type} href={`/${type}`}>
                <HugeiconsIcon
                  icon={COLLECTION_ICONS[type]}
                  size={16}
                  strokeWidth={1.7}
                  aria-hidden
                />
                {CONTENT_META[type].label}
              </Link>
            ))}
            <Link href="/bookmarks">
              <HugeiconsIcon
                icon={Bookmark01Icon}
                size={16}
                strokeWidth={1.7}
                aria-hidden
              />
              Saved
            </Link>
          </nav>
        </section>

        <div className="state-actions-row">
          <Button render={<Link href="/" />}>
            <HugeiconsIcon icon={Home01Icon} strokeWidth={1.8} />
            Back to desktop
          </Button>
          {browse ? (
            <Button variant="outline" render={<Link href={browse.route} />}>
              Browse {browse.title.toLowerCase()}
            </Button>
          ) : null}
        </div>
      </div>
    </main>
  );
}
