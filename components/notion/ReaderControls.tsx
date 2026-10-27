"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useContentBookmarks } from "./ContentBookmarksProvider";
import type { ContentItem } from "@/lib/notion-cms";

export function BookmarkToggle({ item }: { item: ContentItem }) {
  const { isBookmarked, toggleBookmark, ready } = useContentBookmarks();
  const saved = isBookmarked(item.type, item.slug);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-pressed={saved}
      disabled={!ready}
      onClick={() =>
        toggleBookmark({
          type: item.type,
          slug: item.slug,
          title: item.title,
          date: item.date,
          description: item.description,
          image: item.thumbnail,
        })
      }
    >
      {saved ? "✓ Saved" : "☆ Save"}
    </Button>
  );
}
export function ShareButton() {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? "Link copied" : "Copy link"}
    </Button>
  );
}

type Preferences = {
  size: number;
  line: number;
  serif: boolean;
  contrast: boolean;
};
const defaults: Preferences = {
  size: 16,
  line: 1.75,
  serif: false,
  contrast: false,
};
export function ReaderExperience({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(defaults);
  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("pm-reader-preferences-v1") || "null",
      ) as Partial<Preferences> | null;
      if (saved)
        setPrefs({
          size: Math.max(14, Math.min(22, Number(saved.size) || 16)),
          line: Math.max(1.4, Math.min(2, Number(saved.line) || 1.75)),
          serif: saved.serif === true,
          contrast: saved.contrast === true,
        });
    } catch {}
  }, []);
  function change(next: Preferences) {
    setPrefs(next);
    try {
      localStorage.setItem("pm-reader-preferences-v1", JSON.stringify(next));
    } catch {}
  }
  return (
    <>
      <details className="cms-reader-settings">
        <summary>Reading options</summary>
        <div className="cms-reader-settings-panel">
          <label>
            Text size{" "}
            <select
              value={prefs.size}
              onChange={(event) =>
                change({ ...prefs, size: Number(event.target.value) })
              }
            >
              <option value={14}>Small</option>
              <option value={16}>Default</option>
              <option value={18}>Large</option>
              <option value={20}>Larger</option>
              <option value={22}>Largest</option>
            </select>
          </label>
          <label>
            Line spacing{" "}
            <select
              value={prefs.line}
              onChange={(event) =>
                change({ ...prefs, line: Number(event.target.value) })
              }
            >
              <option value={1.4}>Compact</option>
              <option value={1.75}>Default</option>
              <option value={2}>Relaxed</option>
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={prefs.serif}
              onChange={(event) =>
                change({ ...prefs, serif: event.target.checked })
              }
            />{" "}
            Serif text
          </label>
          <label>
            <input
              type="checkbox"
              checked={prefs.contrast}
              onChange={(event) =>
                change({ ...prefs, contrast: event.target.checked })
              }
            />{" "}
            Higher contrast
          </label>
        </div>
      </details>
      <div
        className={`notion-content cms-reader${prefs.contrast ? " is-contrast" : ""}`}
        style={
          {
            "--reader-size": `${prefs.size}px`,
            "--reader-line": prefs.line,
            "--reader-font": prefs.serif
              ? "Georgia, serif"
              : "Outfit, Arial, sans-serif",
          } as CSSProperties
        }
      >
        {children}
      </div>
    </>
  );
}
