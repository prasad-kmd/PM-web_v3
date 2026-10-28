/**
 * Inline link shortcodes for Notion text:
 *
 *   [link href="https://example.com"] Example Website [/link]
 *
 * Notion splits text into rich-text segments whenever formatting changes, so a
 * tag can span several segments (a bold label, for example). The resolver
 * works on the joined plain text, then rebuilds the segments: tag characters
 * are removed and every label segment keeps its own formatting and gains the
 * link. Code blocks and inline code are never converted.
 *
 * Every link (shortcode or native Notion link) is also cleaned: redirect
 * wrappers such as `https://www.google.com/url?q=<target>&sa=…` are unwrapped
 * to `<target>`.
 *
 * Client-safe: no server imports.
 */

type RichTextItem = Record<string, unknown> & {
  type?: string;
  plain_text?: string;
  href?: string | null;
  annotations?: Record<string, unknown>;
  text?: { content?: string; link?: { url?: string } | null };
};

// Quotes may be straight, curly (Notion's smart quotes) or single; an
// unquoted address is accepted too. Tag names are case-insensitive.
const QUOTES = `"'\u201c\u201d\u2018\u2019`;
const LINK_PATTERN = new RegExp(
  String.raw`\[link\s+href\s*=\s*(?:[${QUOTES}]([^${QUOTES}]*)[${QUOTES}]|([^\s\]${QUOTES}]+))\s*\]([\s\S]*?)\[\/link\s*\]`,
  "gi",
);
/** Block-level shortcodes rendered from plain text; their content stays raw. */
const BLOCK_SHORTCODE = /^\s*\[(?:tabs|button|quiz)\b/i;

const GOOGLE_HOST = /(^|\.)google\.[a-z]{2,3}(\.[a-z]{2})?$/i;

/** Unwrap redirect wrappers (Google `/url?q=` and `/url?url=`) to the target. */
export function cleanHref(value: string): string {
  let href = value.trim().replace(/&amp;/gi, "&");
  for (let depth = 0; depth < 3; depth += 1) {
    let url: URL;
    try {
      url = new URL(href);
    } catch {
      return href;
    }
    if (!GOOGLE_HOST.test(url.hostname) || url.pathname !== "/url") break;
    const target = url.searchParams.get("q") || url.searchParams.get("url");
    if (!target || !/^https?:\/\//i.test(target.trim())) break;
    href = target.trim();
  }
  return href;
}

/** Same allow-list the renderer uses: web, mail, phone, site-relative, anchors. */
export function safeHref(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const href = cleanHref(value);
  if (
    /^(https?:|mailto:|tel:)/i.test(href) ||
    (href.startsWith("/") && !href.startsWith("//") && !href.includes("\\")) ||
    href.startsWith("#")
  ) {
    return href;
  }
  return null;
}

type LinkMatch = {
  start: number;
  labelStart: number;
  labelEnd: number;
  end: number;
  href: string | null;
};

function findLinks(text: string): LinkMatch[] {
  const matches: LinkMatch[] = [];
  for (const match of text.matchAll(LINK_PATTERN)) {
    const start = match.index ?? 0;
    const whole = match[0];
    const label = match[3] ?? "";
    const closeLength = whole.length - whole.lastIndexOf("[");
    const end = start + whole.length;
    const labelEnd = end - closeLength;
    const labelStart = labelEnd - label.length;
    // Trim surrounding whitespace from the label.
    const lead = label.length - label.trimStart().length;
    const trail = label.length - label.trimEnd().length;
    const trimmedStart = labelStart + lead;
    const trimmedEnd = Math.max(trimmedStart, labelEnd - trail);
    matches.push({
      start,
      labelStart: trimmedStart,
      labelEnd: trimmedEnd,
      end,
      href: safeHref(match[1] ?? match[2] ?? ""),
    });
  }
  return matches;
}

/** Plain-text form: `[link href="…"] Label [/link]` → `Label`. */
export function stripInlineLinks(text: string): string {
  if (!text || !/\[link\b/i.test(text)) return text;
  return text.replace(LINK_PATTERN, (_whole, _q, _u, label: string) =>
    label.trim(),
  );
}

/** Markdown form, for shortcode bodies rendered through Markdown. */
export function inlineLinksToMarkdown(text: string): string {
  if (!text || !/\[link\b/i.test(text)) return text;
  return text.replace(
    LINK_PATTERN,
    (_whole, quoted: string | undefined, bare: string | undefined, label) => {
      const href = safeHref(quoted ?? bare ?? "");
      const clean = String(label).trim();
      return href ? `[${clean.replace(/[[\]]/g, "\\$&")}](<${href}>)` : clean;
    },
  );
}

function isRichTextArray(value: unknown[]): value is RichTextItem[] {
  return (
    value.length > 0 &&
    value.every(
      (item) =>
        item !== null &&
        typeof item === "object" &&
        typeof (item as RichTextItem).plain_text === "string" &&
        typeof (item as RichTextItem).type === "string",
    )
  );
}

function withText(
  item: RichTextItem,
  content: string,
  href: string | null | undefined,
): RichTextItem {
  const next: RichTextItem = { ...item, plain_text: content };
  if (item.type === "text") {
    next.text = {
      ...(item.text ?? {}),
      content,
      link: href ? { url: href } : (item.text?.link ?? null),
    };
  }
  if (href) next.href = href;
  return next;
}

/** Clean native links (redirect wrappers) on a single segment. */
function cleanSegment(item: RichTextItem): RichTextItem {
  const direct = typeof item.href === "string" ? item.href : null;
  const textLink = item.text?.link?.url;
  if (!direct && !textLink) return item;
  const next: RichTextItem = { ...item };
  if (direct) next.href = cleanHref(direct);
  if (textLink && item.text)
    next.text = { ...item.text, link: { url: cleanHref(textLink) } };
  return next;
}

/** Resolve shortcodes in one rich-text array (e.g. a paragraph's `rich_text`). */
export function resolveRichText(items: RichTextItem[]): RichTextItem[] {
  const cleaned = items.map(cleanSegment);
  const joined = cleaned.map((item) => item.plain_text ?? "").join("");
  if (!/\[link\b/i.test(joined) || BLOCK_SHORTCODE.test(joined)) return cleaned;

  // Segment offsets in the joined string.
  const offsets: number[] = [];
  let cursor = 0;
  for (const item of cleaned) {
    offsets.push(cursor);
    cursor += (item.plain_text ?? "").length;
  }
  const segmentAt = (position: number) => {
    let index = 0;
    while (index + 1 < offsets.length && offsets[index + 1] <= position)
      index += 1;
    return index;
  };

  // Ignore tags that start inside inline code.
  const matches = findLinks(joined).filter(
    (match) => cleaned[segmentAt(match.start)]?.annotations?.code !== true,
  );
  if (!matches.length) return cleaned;

  // Classify every character range: keep, drop (tag syntax), or label (link).
  type Range = { from: number; to: number; href?: string | null; drop?: true };
  const ranges: Range[] = [];
  let position = 0;
  for (const match of matches) {
    if (match.start > position)
      ranges.push({ from: position, to: match.start });
    ranges.push({ from: match.start, to: match.labelStart, drop: true });
    ranges.push({
      from: match.labelStart,
      to: match.labelEnd,
      href: match.href,
    });
    ranges.push({ from: match.labelEnd, to: match.end, drop: true });
    position = match.end;
  }
  if (position < joined.length)
    ranges.push({ from: position, to: joined.length });

  const output: RichTextItem[] = [];
  cleaned.forEach((item, index) => {
    const text = item.plain_text ?? "";
    const segStart = offsets[index];
    const segEnd = segStart + text.length;
    const splittable = item.type === "text";
    for (const range of ranges) {
      const from = Math.max(range.from, segStart);
      const to = Math.min(range.to, segEnd);
      if (to <= from) continue;
      if (range.drop) continue;
      if (!splittable) {
        // Mentions/equations are atomic: keep them once, linked if in a label.
        if (from === segStart)
          output.push(range.href ? { ...item, href: range.href } : item);
        continue;
      }
      output.push(
        withText(item, text.slice(from - segStart, to - segStart), range.href),
      );
    }
  });
  return output;
}

type Block = { type: string; children?: Block[] } & Record<string, unknown>;

function resolveDeep(value: unknown, skipKey?: string): unknown {
  if (Array.isArray(value)) {
    return isRichTextArray(value)
      ? resolveRichText(value)
      : value.map((entry) => resolveDeep(entry));
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        key === skipKey ? entry : resolveDeep(entry),
      ]),
    );
  }
  return value;
}

/** Resolve shortcodes and clean links throughout a Notion block tree. */
export function resolveInlineLinks<T extends Block>(blocks: T[]): T[] {
  return blocks.map((block) => {
    const data = block[block.type];
    const next: Record<string, unknown> = { ...block };
    if (data !== null && typeof data === "object") {
      // Code blocks keep their source verbatim (captions are still resolved).
      next[block.type] = resolveDeep(
        data,
        block.type === "code" ? "rich_text" : undefined,
      );
    }
    if (Array.isArray(block.children))
      next.children = resolveInlineLinks(block.children);
    return next as T;
  });
}

/** Unique outbound links in reading order, for a "Links in this story" list. */
export function collectLinks(
  blocks: Block[],
): Array<{ href: string; label: string; host: string }> {
  const seen = new Map<string, { href: string; label: string; host: string }>();
  const visitRich = (items: RichTextItem[]) => {
    let current: { href: string; label: string } | null = null;
    const flush = () => {
      if (!current) return;
      const label = current.label.trim();
      if (label && !seen.has(current.href)) {
        let host = "";
        try {
          host = new URL(current.href).hostname.replace(/^www\./, "");
        } catch {}
        seen.set(current.href, { href: current.href, label, host });
      }
      current = null;
    };
    for (const item of items) {
      const href =
        typeof item.href === "string" ? item.href : item.text?.link?.url;
      if (href && /^https?:\/\//i.test(href)) {
        if (current && current.href === href)
          current.label += item.plain_text ?? "";
        else {
          flush();
          current = { href, label: item.plain_text ?? "" };
        }
      } else flush();
    }
    flush();
  };
  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      if (isRichTextArray(value)) visitRich(value);
      else value.forEach(visit);
    } else if (value !== null && typeof value === "object") {
      Object.values(value).forEach(visit);
    }
  };
  const walk = (items: Block[]) => {
    for (const block of items) {
      if (block.type !== "code") visit(block[block.type]);
      if (Array.isArray(block.children)) walk(block.children);
    }
  };
  walk(blocks);
  return [...seen.values()];
}
