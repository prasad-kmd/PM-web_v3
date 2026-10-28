"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { formatContentDate, type ContentType } from "@/lib/content-types";
import { monthKey, monthLabel, type ListingItem } from "@/lib/content-listing";

const DAY = 86_400_000;
const weekday = new Intl.DateTimeFormat("en", {
  weekday: "short",
  timeZone: "UTC",
});

/** Midnight (UTC) of a content date, so "today" compares calendar days. */
function utcDay(value: string | null): number | null {
  const time = value ? Date.parse(value) : NaN;
  if (!Number.isFinite(time)) return null;
  const date = new Date(time);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/**
 * Dated feed for headline-only collections (News): rows grouped under sticky
 * month headings, each with a calendar tile and the headline.
 */
export function NewsFeed({
  type,
  items,
  label,
  showLatest,
}: {
  type: ContentType;
  items: ListingItem[];
  label: string;
  /** Mark the first row "Latest" (newest-first, first page, unfiltered). */
  showLatest: boolean;
}) {
  // Relative labels depend on the reader's clock: add them after mount so the
  // server HTML and the first client render match.
  const [today, setToday] = useState<number | null>(null);
  useEffect(() => {
    const now = new Date();
    setToday(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  }, []);

  const groups: Array<{ key: string; items: ListingItem[] }> = [];
  for (const item of items) {
    const key = monthKey(item.date);
    const last = groups[groups.length - 1];
    if (last?.key === key) last.items.push(item);
    else groups.push({ key, items: [item] });
  }

  let index = 0;
  return (
    <div className="news-feed" aria-label={`${label} stories`}>
      {groups.map((group) => (
        <section
          key={group.key || "undated"}
          className="news-group"
          aria-labelledby={`news-month-${group.key || "undated"}`}
        >
          <h2
            className="news-month"
            id={`news-month-${group.key || "undated"}`}
          >
            <span>{group.key ? monthLabel(group.key) : "Undated"}</span>
            <span className="news-month-count">{group.items.length}</span>
          </h2>
          <ol className="news-rows">
            {group.items.map((item) => {
              const isFirst = index++ === 0;
              const day = utcDay(item.date);
              const full = formatContentDate(item.date);
              const delta =
                today !== null && day !== null
                  ? Math.round((today - day) / DAY)
                  : null;
              const relative =
                delta === 0 ? "Today" : delta === 1 ? "Yesterday" : null;
              return (
                <li key={item.id}>
                  <Link
                    className="news-row"
                    href={`/${type}/${encodeURIComponent(item.slug)}`}
                    data-lead={isFirst && showLatest ? "" : undefined}
                  >
                    <span className="news-date" aria-hidden>
                      {day !== null ? (
                        <>
                          <span className="news-day">
                            {new Date(day).getUTCDate()}
                          </span>
                          <span className="news-weekday">
                            {weekday.format(day)}
                          </span>
                        </>
                      ) : (
                        <span className="news-weekday">—</span>
                      )}
                    </span>
                    <span className="news-copy">
                      <strong>{item.title}</strong>
                      <span className="news-meta">
                        {isFirst && showLatest ? (
                          <span className="news-badge is-latest">Latest</span>
                        ) : null}
                        {relative ? (
                          <span className="news-badge">{relative}</span>
                        ) : null}
                        {full ? (
                          <time dateTime={item.date ?? undefined}>{full}</time>
                        ) : null}
                      </span>
                    </span>
                    <HugeiconsIcon
                      className="news-go"
                      icon={ArrowRight01Icon}
                      size={15}
                      aria-hidden
                    />
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
