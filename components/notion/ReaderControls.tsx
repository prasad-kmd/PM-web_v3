"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import {
  Bookmark01Icon,
  BookmarkCheck01Icon,
  Link01Icon,
  SidebarRightIcon,
  TextFontIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverPopup,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RailToc, type RailTocItem } from "@/components/ui/rail-toc";
import {
  ScrollProgress,
  type ScrollProgressSection,
} from "@/components/ui/scroll-progress";
import { Switch } from "@/components/ui/switch";
import { useContentBookmarks } from "./ContentBookmarksProvider";
import type { ContentItem } from "@/lib/notion-cms";

/* -------------------------------------------------------------------------- */
/* Reader context                                                             */
/* -------------------------------------------------------------------------- */

type Preferences = {
  size: number;
  line: number;
  serif: boolean;
  contrast: boolean;
};
const DEFAULT_PREFS: Preferences = {
  size: 16,
  line: 1.75,
  serif: false,
  contrast: false,
};
const PREFS_KEY = "pm-reader-preferences-v1";
const OUTLINE_KEY = "pm-reader-outline-v1";
/** Sticky window toolbar (42px) + progress hairline + breathing room. */
const HEADING_OFFSET = 72;

export type ReaderHeading = { id: string; label: string; depth: number };

type ReaderContextValue = {
  /** The window's scroll element (`.window-body`), once located. */
  scrollerRef: RefObject<HTMLElement | null>;
  ready: boolean;
  headings: ReaderHeading[];
  sections: ScrollProgressSection[];
  prefs: Preferences;
  setPrefs: (next: Preferences) => void;
  outline: boolean;
  toggleOutline: () => void;
};

const ReaderContext = createContext<ReaderContextValue | null>(null);

function useReader() {
  const value = useContext(ReaderContext);
  if (!value)
    throw new Error("Reader components must be inside ReaderProvider");
  return value;
}

const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    Boolean(
      target.closest(
        "input, textarea, select, [contenteditable=true], [role=menu], [role=listbox], [role=dialog]",
      ),
    )
  );
}

/**
 * Owns reader state and finds the window scroller. DesktopOS renders route
 * content inside `.window-body`, not the document, so the Rare UI components
 * receive that element through `containerRef`. They read the ref when they
 * mount, so they render only once it has been located.
 */
export function ReaderProvider({
  children,
  headings,
  prevHref,
  nextHref,
}: {
  children: ReactNode;
  headings: ReaderHeading[];
  prevHref?: string | null;
  nextHref?: string | null;
}) {
  const router = useRouter();
  const anchorRef = useRef<HTMLSpanElement>(null);
  const scrollerRef = useRef<HTMLElement | null>(null);
  const [ready, setReady] = useState(false);
  const [prefs, setPrefsState] = useState<Preferences>(DEFAULT_PREFS);
  const [outline, setOutline] = useState(true);

  useIsoLayoutEffect(() => {
    const scroller =
      anchorRef.current?.closest<HTMLElement>(".window-body") ?? null;
    scrollerRef.current = scroller;
    setReady(true);
    if (!scroller) return;
    // Expose the window's visible height so the sticky outline is sized to
    // the window, not the browser viewport (100dvh overflows small windows).
    const syncViewport = () =>
      scroller.style.setProperty(
        "--rdr-viewport",
        `${scroller.clientHeight}px`,
      );
    syncViewport();
    const observer = new ResizeObserver(syncViewport);
    observer.observe(scroller);
    return () => {
      observer.disconnect();
      scroller.style.removeProperty("--rdr-viewport");
    };
  }, []);

  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(PREFS_KEY) || "null",
      ) as Partial<Preferences> | null;
      if (saved)
        setPrefsState({
          size: Math.max(14, Math.min(22, Number(saved.size) || 16)),
          line: Math.max(1.4, Math.min(2, Number(saved.line) || 1.75)),
          serif: saved.serif === true,
          contrast: saved.contrast === true,
        });
      if (localStorage.getItem(OUTLINE_KEY) === "off") setOutline(false);
    } catch {}
  }, []);

  const setPrefs = useCallback((next: Preferences) => {
    setPrefsState(next);
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const toggleOutline = useCallback(() => {
    setOutline((current) => {
      try {
        localStorage.setItem(OUTLINE_KEY, current ? "off" : "on");
      } catch {}
      return !current;
    });
  }, []);

  // J / K: next / previous entry · O: toggle the outline rail.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat)
        return;
      if (isTypingTarget(event.target)) return;
      if (!anchorRef.current?.isConnected) return;
      const key = event.key.toLowerCase();
      if (key === "j" && nextHref) router.push(nextHref);
      else if (key === "k" && prevHref) router.push(prevHref);
      else if (key === "o") toggleOutline();
      else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nextHref, prevHref, router, toggleOutline]);

  const sections = useMemo(() => {
    const top = headings.filter((heading) => heading.depth === 0);
    return top.map((heading) => ({
      id: heading.id,
      label:
        heading.label.length > 38
          ? `${heading.label.slice(0, 36).trimEnd()}…`
          : heading.label,
    }));
  }, [headings]);

  const value = useMemo(
    () => ({
      scrollerRef,
      ready,
      headings,
      sections,
      prefs,
      setPrefs,
      outline,
      toggleOutline,
    }),
    [ready, headings, sections, prefs, setPrefs, outline, toggleOutline],
  );

  return (
    <ReaderContext.Provider value={value}>
      <span ref={anchorRef} hidden />
      {children}
    </ReaderContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/* Toolbar actions                                                            */
/* -------------------------------------------------------------------------- */

export function BookmarkToggle({ item }: { item: ContentItem }) {
  const { isBookmarked, toggleBookmark, ready } = useContentBookmarks();
  const saved = isBookmarked(item.type, item.slug);
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved" : "Save entry"}
      title={saved ? "Saved" : "Save"}
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
      <HugeiconsIcon
        icon={saved ? BookmarkCheck01Icon : Bookmark01Icon}
        strokeWidth={1.8}
      />
    </Button>
  );
}

export function ShareButton() {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={copied ? "Link copied" : "Copy link"}
      title={copied ? "Link copied" : "Copy link"}
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
      <HugeiconsIcon
        icon={copied ? Tick02Icon : Link01Icon}
        strokeWidth={1.8}
      />
    </Button>
  );
}

function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="rdr-opt">
      <span className="rdr-opt-label">{label}</span>
      <div className="rdr-seg" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={String(option.value)}
            type="button"
            aria-pressed={option.value === value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ReadingOptions() {
  const { prefs, setPrefs } = useReader();
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Reading options"
            title="Reading options"
          />
        }
      >
        <HugeiconsIcon icon={TextFontIcon} strokeWidth={1.8} />
      </PopoverTrigger>
      <PopoverPopup className="rdr-options" align="end">
        <PopoverTitle className="rdr-options-title">
          Reading options
        </PopoverTitle>
        <Segmented
          label="Text size"
          value={prefs.size}
          options={[
            { value: 14, label: "S" },
            { value: 16, label: "M" },
            { value: 18, label: "L" },
            { value: 20, label: "XL" },
          ]}
          onChange={(size) => setPrefs({ ...prefs, size })}
        />
        <Segmented
          label="Line spacing"
          value={prefs.line}
          options={[
            { value: 1.4, label: "Compact" },
            { value: 1.75, label: "Default" },
            { value: 2, label: "Relaxed" },
          ]}
          onChange={(line) => setPrefs({ ...prefs, line })}
        />
        <label className="rdr-opt rdr-opt-row">
          <span className="rdr-opt-label">Serif text</span>
          <Switch
            checked={prefs.serif}
            onCheckedChange={(serif) => setPrefs({ ...prefs, serif })}
          />
        </label>
        <label className="rdr-opt rdr-opt-row">
          <span className="rdr-opt-label">Higher contrast</span>
          <Switch
            checked={prefs.contrast}
            onCheckedChange={(contrast) => setPrefs({ ...prefs, contrast })}
          />
        </label>
      </PopoverPopup>
    </Popover>
  );
}

export function ReaderToolbarActions({ item }: { item: ContentItem }) {
  const { outline, toggleOutline, headings } = useReader();
  return (
    <>
      {headings.length ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="rdr-outline-toggle"
          aria-pressed={outline}
          onClick={toggleOutline}
          title="Toggle outline (O)"
        >
          <HugeiconsIcon icon={SidebarRightIcon} strokeWidth={1.8} />
          Outline
        </Button>
      ) : null}
      <BookmarkToggle item={item} />
      <ShareButton />
      <ReadingOptions />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Layout pieces                                                              */
/* -------------------------------------------------------------------------- */

function useScrollerProgress() {
  const { scrollerRef, ready } = useReader();
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!ready) return;
    const scroller = scrollerRef.current;
    const target: HTMLElement | Window = scroller ?? window;
    let frame = 0;
    const read = () => {
      frame = 0;
      const top = scroller ? scroller.scrollTop : window.scrollY;
      const max = scroller
        ? scroller.scrollHeight - scroller.clientHeight
        : document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, Math.max(0, top / max)) : 0);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    target.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      target.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [ready, scrollerRef]);
  return progress;
}

/** Hairline progress bar directly under the window toolbar. */
export function ReaderProgress() {
  const progress = useScrollerProgress();
  return (
    <div className="rdr-progress" aria-hidden>
      <span style={{ transform: `scaleX(${progress})` }} />
    </div>
  );
}

/** Applies the outline on/off state to the reader grid. */
export function ReaderLayout({ children }: { children: ReactNode }) {
  const { outline, headings } = useReader();
  return (
    <div
      className="rdr-grid"
      data-outline={outline && headings.length ? "on" : "off"}
    >
      {children}
    </div>
  );
}

/** Desktop outline: Rare UI Rail TOC bound to the window scroller. */
export function ReaderOutline() {
  const { headings, ready, scrollerRef } = useReader();
  const followRef = useRef<HTMLDivElement>(null);

  // Rail TOC marks the reached heading with aria-current but never scrolls its
  // own list. Follow it: keep the active row inside the sticky outline panel
  // (scrolling only the panel — never the window) unless the pointer is in it.
  useEffect(() => {
    const host = followRef.current;
    const panel = host?.closest<HTMLElement>(".rdr-toc");
    if (!ready || !host || !panel) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const follow = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (panel.scrollHeight <= panel.clientHeight) return;
        if (panel.matches(":hover")) return;
        const active = host.querySelector<HTMLElement>(
          '[aria-current="location"]',
        );
        if (!active) return;
        const box = panel.getBoundingClientRect();
        const row = active.getBoundingClientRect();
        const margin = Math.min(64, box.height / 4);
        if (row.top >= box.top + margin && row.bottom <= box.bottom - margin)
          return;
        const target =
          panel.scrollTop + (row.top - box.top) - (box.height - row.height) / 2;
        panel.scrollTo({
          top: Math.max(0, target),
          behavior: reduceMotion.matches ? "auto" : "smooth",
        });
      });
    };
    const observer = new MutationObserver(follow);
    observer.observe(host, {
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-current"],
    });
    follow();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [ready, headings]);

  const items = useMemo<RailTocItem[]>(
    () =>
      headings.map((heading) => ({
        id: heading.id,
        label: heading.label,
        depth: heading.depth,
      })),
    [headings],
  );
  if (!items.length) return null;
  return (
    <div ref={followRef} className="rdr-rail-follow">
      {ready ? (
        <RailToc
          items={items}
          containerRef={scrollerRef}
          offset={HEADING_OFFSET}
          className="rdr-rail w-full"
        />
      ) : null}
    </div>
  );
}

/** Narrow windows / mobile: Rare UI Scroll Progress pill, like v2. */
export function ReaderSections() {
  const { sections, ready, scrollerRef } = useReader();
  if (!ready || !sections.length) return null;
  return (
    <div className="rdr-dock">
      <ScrollProgress
        sections={sections}
        containerRef={scrollerRef}
        offset={HEADING_OFFSET + 48}
        className="absolute bottom-0 z-20"
      />
    </div>
  );
}

/** Command-style status footer: current section + key hints. */
export function ReaderFooter({
  collectionLabel,
  hasNext,
  hasPrev,
}: {
  collectionLabel: string;
  hasNext: boolean;
  hasPrev: boolean;
}) {
  const { sections, scrollerRef, ready } = useReader();
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (!ready || !sections.length) return;
    const scroller = scrollerRef.current;
    const target: HTMLElement | Window = scroller ?? window;
    let frame = 0;
    const read = () => {
      frame = 0;
      const line =
        (scroller ? scroller.getBoundingClientRect().top : 0) +
        HEADING_OFFSET +
        48;
      let index = 0;
      sections.forEach((section, i) => {
        const top = document
          .getElementById(section.id)
          ?.getBoundingClientRect().top;
        if (top !== undefined && top <= line) index = i;
      });
      setActive(index);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    target.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      target.removeEventListener("scroll", onScroll);
    };
  }, [ready, scrollerRef, sections]);

  const current = sections[active];
  return (
    <footer className="rdr-foot">
      <span className="rdr-foot-section">
        {current
          ? `Section ${active + 1} of ${sections.length} · ${current.label}`
          : collectionLabel}
      </span>
      <span className="rdr-foot-grow" />
      {hasNext || hasPrev ? (
        <span className="rdr-foot-hint">
          <kbd>J</kbd>/<kbd>K</kbd> Next / previous entry
        </span>
      ) : null}
      {sections.length ? (
        <span className="rdr-foot-hint">
          <kbd>O</kbd> Outline
        </span>
      ) : null}
    </footer>
  );
}

/** Applies reading preferences to the Notion body. */
export function ReaderBody({ children }: { children: ReactNode }) {
  const { prefs } = useReader();
  return (
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
  );
}
