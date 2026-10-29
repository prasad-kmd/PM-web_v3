"use client";

import { useMemo, useState } from "react";
import {
  Cancel01Icon,
  Copy01Icon,
  QuoteDownIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { MorphIcon } from "@/components/ui/morph-icon";
import {
  Popover,
  PopoverPopup,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { WorkspaceTooltip } from "@/components/ui/tooltip";
import { CONTENT_META } from "@/lib/content-types";
import type { ContentItem } from "@/lib/notion-cms";

type CitationFormat = "plain" | "bibtex" | "markdown";

function extractYear(dateStr: string | null): string {
  if (dateStr) {
    const stamp = Date.parse(dateStr);
    if (Number.isFinite(stamp)) {
      return String(new Date(stamp).getUTCFullYear());
    }
  }
  return String(new Date().getFullYear());
}

function toBibtexKey(authorName: string, year: string, slug: string): string {
  const family =
    authorName
      .trim()
      .split(/\s+/)
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, "") || "madhuranga";
  const cleanSlug = slug
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 28);
  return `${family}${year}_${cleanSlug || "entry"}`;
}

function formatBibtexAuthor(authorName: string): string {
  const parts = authorName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return authorName.trim() || "Madhuranga, Prasad";
  const last = parts[parts.length - 1];
  const given = parts.slice(0, -1).join(" ");
  return `${last}, ${given}`;
}

export function ReaderCitePopover({
  item,
  baseUrl,
}: {
  item: ContentItem;
  baseUrl?: string;
}) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<CitationFormat>("plain");
  const [copied, setCopied] = useState(false);

  const citationText = useMemo(() => {
    const origin =
      baseUrl?.replace(/\/+$/g, "") ||
      (typeof window !== "undefined" ? window.location.origin : "");
    const url = `${origin}/${item.type}/${encodeURIComponent(item.slug)}`;
    const author = item.author?.name?.trim() || "Prasad Madhuranga";
    const year = extractYear(item.date);
    const collectionLabel = CONTENT_META[item.type].label;
    const accessed = new Date().toISOString().slice(0, 10);

    if (format === "markdown") {
      return `[${item.title} — ${author}](${url})`;
    }

    if (format === "bibtex") {
      const key = toBibtexKey(author, year, item.slug);
      const bibAuthor = formatBibtexAuthor(author);
      const safeTitle = item.title.replace(/[{}]/g, "");
      return [
        `@misc{${key},`,
        `  author = {${bibAuthor}},`,
        `  title  = {{${safeTitle}}},`,
        `  year   = {${year}},`,
        `  url    = {${url}},`,
        `  note   = {${collectionLabel}; accessed ${accessed}}`,
        `}`,
      ].join("\n");
    }

    return `${author} (${year}). "${item.title}." ${collectionLabel}. ${url}`;
  }, [
    baseUrl,
    format,
    item.author?.name,
    item.date,
    item.slug,
    item.title,
    item.type,
  ]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(citationText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <WorkspaceTooltip label="Cite entry" align="end">
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="rdr-tool"
              aria-label="Cite entry"
            />
          }
        >
          <MorphIcon
            icon={open ? Cancel01Icon : QuoteDownIcon}
            iconKey={open ? "close-cite" : "cite"}
          />
        </PopoverTrigger>
      </WorkspaceTooltip>
      <PopoverPopup className="rdr-options rdr-cite-popover" align="end">
        <PopoverTitle className="rdr-options-title">Cite entry</PopoverTitle>
        <div className="rdr-seg" role="group" aria-label="Citation format">
          {(
            [
              { value: "plain", label: "Plain" },
              { value: "bibtex", label: "BibTeX" },
              { value: "markdown", label: "Markdown" },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={format === option.value}
              onClick={() => {
                setFormat(option.value);
                setCopied(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
        <pre className="rdr-cite-preview" tabIndex={0}>
          <code>{citationText}</code>
        </pre>
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="w-full justify-center gap-1.5"
          onClick={() => void handleCopy()}
        >
          <HugeiconsIcon
            icon={copied ? Tick02Icon : Copy01Icon}
            size={13}
            strokeWidth={2}
            aria-hidden
          />
          <span>{copied ? "Citation copied" : "Copy citation"}</span>
        </Button>
      </PopoverPopup>
    </Popover>
  );
}
