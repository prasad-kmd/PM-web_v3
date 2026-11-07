"use client";
import { useMemo } from "react";
import { useCinemaLibrary } from "@/components/admin/cinema/store/LibraryProvider";
import { StatBar } from "@/components/admin/cinema/parts/StatBar";
import { TastePanel } from "@/components/admin/cinema/parts/TastePanel";
import { StateNotice } from "@/components/admin/cinema/parts/StateNotice";
import { Button } from "@/components/ui/button";
import { computeCinemaStats } from "@/lib/cinema/stats";
import { buildTasteProfile } from "@/lib/cinema/taste";
import type { CinemaStatBucket } from "@/lib/cinema/types";

function Bars({ title, items }: { title: string; items: CinemaStatBucket[] }) {
  const max = Math.max(0, ...items.map((i) => i.count));
  return (
    <section className="cinema-side-card cinema-stat-section">
      <h2>{title}</h2>
      {items.length ? (
        items.map((b) => <StatBar key={b.key} bucket={b} max={max} />)
      ) : (
        <p className="cinema-stat-note">No data yet.</p>
      )}
    </section>
  );
}
export function StatsView({ onBrowse }: { onBrowse: () => void }) {
  const { entries, ready } = useCinemaLibrary();
  const stats = useMemo(() => computeCinemaStats(entries), [entries]);
  const profile = useMemo(() => buildTasteProfile(entries), [entries]);
  if (!ready)
    return (
      <div className="cinema-scroll">
        <StateNotice
          title="Loading your library"
          body="Your stats will be ready in a moment."
        />
      </div>
    );
  if (entries.length < 3)
    return (
      <div className="cinema-scroll">
        <StateNotice
          title="Your story starts here"
          body="Add at least three titles to your library to see your stats. Rate two titles to unlock taste-based recommendations when enough genre data is available."
          action={
            <Button size="xs" variant="outline" onClick={onBrowse}>
              Browse titles
            </Button>
          }
        />
      </div>
    );
  const monthMax = Math.max(1, ...stats.addedByMonth.map((m) => m.count));
  return (
    <div className="cinema-scroll cinema-stats">
      <header className="cinema-stats-head">
        <div>
          <span className="cinema-stats-eyebrow">YOUR LIBRARY, IN NUMBERS</span>
          <h1>Stats</h1>
          <p>A little perspective on everything you&apos;ve collected.</p>
        </div>
        <span>
          {stats.total} titles · updated{" "}
          {new Date(stats.generatedAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </header>
      <div className="cinema-stat-tiles">
        {[
          {
            label: "Titles",
            value: stats.total,
            note: `${stats.films} films · ${stats.series} series`,
          },
          {
            label: "Est. watched",
            value: `${Math.round(stats.watchedMinutes / 60)}h`,
            note: `~${stats.episodesTracked} estimated episodes`,
          },
          {
            label: "Average rating",
            value: stats.averageRating?.toFixed(1) ?? "—",
            note: `${stats.rated} rated titles`,
          },
          {
            label: "Library runtime",
            value: `${Math.round(stats.libraryMinutes / 60)}h`,
            note: "Known runtimes only",
          },
        ].map((tile) => (
          <div className="cinema-side-card cinema-stat-tile" key={tile.label}>
            <span className="cinema-stat-tile-label">{tile.label}</span>
            <strong className="cinema-stat-tile-value">{tile.value}</strong>
            <span className="cinema-stat-note">{tile.note}</span>
          </div>
        ))}
      </div>
      <p className="cinema-stat-note">
        Watch time is estimated from status, progress and TMDB runtimes — not a
        stopwatch. Films marked Watching count as half; series use an average
        episodes per season. {stats.unknownRuntime} title
        {stats.unknownRuntime === 1 ? " has" : "s have"} incomplete runtime or
        episode data; totals may be understated.
      </p>
      <section className="cinema-side-card cinema-stat-section">
        <h2>Library status</h2>
        <div
          className="cinema-stat-stacked"
          aria-label="Library status distribution"
        >
          {stats.statuses.map((b, i) =>
            b.count ? (
              <div
                key={b.key}
                role="img"
                aria-label={`${b.label}: ${b.count}`}
                style={{ width: `${b.share * 100}%`, opacity: 1 - i * 0.16 }}
              />
            ) : null,
          )}
        </div>
        <div className="cinema-stat-legend">
          {stats.statuses.map((b, i) => (
            <span key={b.key}>
              <i style={{ opacity: 1 - i * 0.16 }} />
              {b.label} · {b.count}
            </span>
          ))}
        </div>
      </section>
      <div className="cinema-stats-grid">
        <Bars title="Top genres" items={stats.genres} />
        <Bars title="Decades" items={stats.decades} />
        <Bars title="Rating bands" items={stats.ratingBands} />
        <section className="cinema-side-card cinema-stat-section">
          <h2>Added per month</h2>
          <div className="cinema-stat-histogram">
            {stats.addedByMonth.map((m) => (
              <div
                className="cinema-stat-column"
                key={m.month}
                role="img"
                aria-label={`${m.label}: ${m.count} titles`}
              >
                <span>{m.count}</span>
                <div className="cinema-stat-column-track">
                  <div style={{ height: `${(m.count / monthMax) * 100}%` }} />
                </div>
                <span>{m.label}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="cinema-side-card cinema-stat-section">
        <h2>Little insights</h2>
        <div className="cinema-insights">
          {stats.insights.map((i) => (
            <div key={i.label}>
              <span>{i.label}</span>
              <strong>{i.value}</strong>
            </div>
          ))}
        </div>
      </section>
      <section className="cinema-side-card cinema-stat-section">
        {profile ? (
          <TastePanel profile={profile} />
        ) : (
          <>
            <h2>Your taste profile</h2>
            <p className="cinema-stat-note">
              Rate at least two titles to unlock recommendations based on your
              taste.
            </p>
          </>
        )}
        <Button size="xs" variant="outline" onClick={onBrowse}>
          Explore Browse
        </Button>
      </section>
    </div>
  );
}
