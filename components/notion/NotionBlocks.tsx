// Adapted from PM-Web_V2 (AGPL-3.0); URL checks and v3 styles adjusted.
import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import katex from "katex";
import type { ThemedToken } from "shiki";
import type { ContentType, NotionBlock } from "@/lib/notion-cms";
import { highlightCode, type HighlightedCode } from "@/lib/highlighting/shiki";
import { CopyCodeButton } from "@/components/notion/CopyCodeButton";
import { MermaidDiagram } from "@/components/notion/MermaidDiagram";
import { NotionQuiz, type QuizSpec } from "@/components/notion/NotionQuiz";
import { TabbedContent } from "@/components/notion/TabbedContent";

type RecordValue = Record<string, unknown>;

function record(value: unknown): RecordValue | null {
  return value !== null && typeof value === "object"
    ? (value as RecordValue)
    : null;
}

function textValue(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value
    .map((part) => {
      const item = record(part);
      return typeof item?.plain_text === "string"
        ? item.plain_text
        : typeof record(item?.text)?.content === "string"
          ? (record(item?.text)?.content as string)
          : "";
    })
    .join("");
}

function safeHref(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const href = value.trim();
  if (
    /^(https?:|mailto:|tel:)/i.test(href) ||
    (href.startsWith("/") && !href.startsWith("//") && !href.includes("\\")) ||
    href.startsWith("#")
  ) {
    return href;
  }
  return null;
}

/**
 * Shiki emits font styles as a bitmask (italic = 1, bold = 2, underline = 4).
 * Turn the set bits into inline styles for the token span.
 */
function tokenStyle(token: ThemedToken): CSSProperties {
  const style: CSSProperties = {};
  if (token.color) style.color = token.color;
  const fontStyle = token.fontStyle ?? 0;
  if (fontStyle & 1) style.fontStyle = "italic";
  if (fontStyle & 2) style.fontWeight = 600;
  if (fontStyle & 4) style.textDecoration = "underline";
  return style;
}

/**
 * Code blocks are highlighted ahead of rendering, keyed by Notion block id, so
 * the block tree itself can stay a synchronous render.
 */
type HighlightMap = Map<string, HighlightedCode>;

function codeSource(block: NotionBlock): string {
  const data = record(block[block.type]);
  return textValue(data?.rich_text);
}

/** Walks the whole block tree and pre-highlights every code block it finds. */
async function collectHighlights(blocks: NotionBlock[]): Promise<HighlightMap> {
  const entries: Array<[string, Promise<HighlightedCode | null>]> = [];

  const visit = (items: NotionBlock[]) => {
    for (const block of items) {
      if (block.type === "code") {
        const data = record(block.code);
        const language =
          typeof data?.language === "string" ? data.language : "plain text";
        // Mermaid fences are rendered as live diagrams, not code.
        if (language.toLowerCase() !== "mermaid") {
          entries.push([block.id, highlightCode(codeSource(block), language)]);
        }
      }
      if (block.children?.length) visit(block.children);
    }
  };

  visit(blocks);

  const highlights: HighlightMap = new Map();
  await Promise.all(
    entries.map(async ([id, pending]) => {
      const highlighted = await pending;
      if (highlighted) highlights.set(id, highlighted);
    }),
  );
  return highlights;
}

function ShikiCode({ highlighted }: { highlighted: HighlightedCode }) {
  return (
    <pre
      className="overflow-x-auto p-4 text-[13px] leading-6"
      style={{
        backgroundColor: highlighted.background,
        color: highlighted.foreground,
      }}
    >
      <code className={`language-${highlighted.language}`}>
        {highlighted.lines.map((line, lineIndex) => (
          // Lines only change when the source changes, so the index is a
          // stable key here.
          <span key={lineIndex} className="block">
            {line.map((token, tokenIndex) => (
              <span key={tokenIndex} style={tokenStyle(token)}>
                {token.content}
              </span>
            ))}
          </span>
        ))}
      </code>
    </pre>
  );
}

function renderMarkdown(source: string): string {
  const raw = marked.parse(source, { async: false }) as string;
  return sanitizeHtml(raw, {
    allowedTags: [
      "a",
      "b",
      "blockquote",
      "br",
      "code",
      "del",
      "em",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "hr",
      "i",
      "img",
      "li",
      "ol",
      "p",
      "pre",
      "s",
      "strong",
      "table",
      "tbody",
      "td",
      "th",
      "thead",
      "tr",
      "u",
      "ul",
    ],
    allowedAttributes: {
      a: ["href", "rel"],
      code: ["class"],
      img: ["alt", "src"],
      th: ["align"],
      td: ["align"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    disallowedTagsMode: "discard",
  });
}

function parseQuiz(text: string, id: string): ReactNode | null {
  const match = text.match(/^\s*\[quiz\]([\s\S]*?)\[\/quiz\]\s*$/i);
  if (!match) return null;
  try {
    const parsed: unknown = JSON.parse(match[1].trim());
    const root = record(parsed);
    const rawQuestions = Array.isArray(parsed) ? parsed : root?.questions;
    if (!Array.isArray(rawQuestions) || rawQuestions.length === 0)
      throw new Error("Missing questions");
    const questions = rawQuestions.flatMap((rawQuestion) => {
      const question = record(rawQuestion);
      if (
        typeof question?.question !== "string" ||
        !Array.isArray(question.options) ||
        !question.options.every((option) => typeof option === "string") ||
        typeof question.answer !== "number" ||
        question.answer < 0 ||
        question.answer >= question.options.length
      )
        return [];
      return [
        {
          question: question.question,
          options: question.options as string[],
          answer: question.answer,
          ...(typeof question.explanation === "string"
            ? { explanation: question.explanation }
            : {}),
        },
      ];
    });
    if (questions.length !== rawQuestions.length)
      throw new Error("Invalid question format");
    const quiz: QuizSpec = {
      id,
      ...(typeof root?.title === "string" ? { title: root.title } : {}),
      questions,
    };
    return <NotionQuiz quiz={quiz} />;
  } catch {
    return (
      <aside
        className="my-5 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-foreground"
        role="status"
      >
        This quiz block contains invalid JSON or an unsupported question format.
      </aside>
    );
  }
}

function renderShortcode(text: string, id: string): ReactNode | null {
  const quiz = parseQuiz(text, id);
  if (quiz) return quiz;

  const button = text.match(
    /^\s*\[button\s+href=(['"])(.*?)\1\s*\]([\s\S]*?)\[\/button\]\s*$/i,
  );
  if (button) {
    const href = safeHref(button[2]);
    if (!href) return null;
    return (
      <p key={id} className="my-6">
        <a
          href={href}
          target={href.startsWith("http") ? "_blank" : undefined}
          rel={href.startsWith("http") ? "noreferrer noopener" : undefined}
          className="inline-flex items-center gap-3 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {button[3].trim() || "Open link"}
          <span aria-hidden="true">→</span>
        </a>
      </p>
    );
  }

  const tabsMatch = text.match(/^\s*\[tabs\s*\]([\s\S]*?)\[\/tabs\s*\]\s*$/i);
  if (tabsMatch) {
    const tabs: Array<{ title: string; html: string }> = [];
    const tabPattern =
      /\[tab\s+title=(['"])(.*?)\1\s*\]([\s\S]*?)\[\/tab\s*\]/gi;
    for (const tab of tabsMatch[1].matchAll(tabPattern)) {
      tabs.push({ title: tab[2].trim(), html: renderMarkdown(tab[3].trim()) });
    }
    return tabs.length ? <TabbedContent key={id} tabs={tabs} /> : null;
  }
  return null;
}

function renderText(items: unknown): ReactNode {
  if (!Array.isArray(items)) return null;
  return items.map((raw, index) => {
    const item = record(raw);
    if (!item) return null;
    const annotations = record(item.annotations) ?? {};
    const text = typeof item.plain_text === "string" ? item.plain_text : "";
    if (item.type === "equation") {
      const expression = record(item.equation)?.expression;
      if (typeof expression === "string") {
        return (
          <span
            key={`equation-${index}`}
            className="inline-block max-w-full overflow-x-auto align-middle"
            dangerouslySetInnerHTML={{
              __html: katex.renderToString(expression, {
                throwOnError: false,
                trust: false,
                strict: "ignore",
              }),
            }}
          />
        );
      }
    }
    const directHref =
      typeof item.href === "string" ? item.href : record(item.href)?.url;
    const textLink = record(record(item.text)?.link)?.url;
    const link = safeHref(directHref ?? textLink);
    const colorClass = ""; // Rich text follows the DesktopOS semantic palette.

    let content: ReactNode = text;
    if (annotations.code === true) {
      content = (
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em] text-primary">
          {content}
        </code>
      );
    }
    if (annotations.italic === true) content = <em>{content}</em>;
    if (annotations.strikethrough === true) content = <s>{content}</s>;
    if (annotations.underline === true) content = <u>{content}</u>;
    if (annotations.bold === true) content = <strong>{content}</strong>;
    if (link) {
      content = (
        <a
          href={link}
          target={link.startsWith("http") ? "_blank" : undefined}
          rel={link.startsWith("http") ? "noreferrer noopener" : undefined}
          className="text-primary underline decoration-primary/35 underline-offset-4 transition-colors hover:decoration-primary"
        >
          {content}
        </a>
      );
    }

    return (
      <span
        className={colorClass}
        key={typeof item.plain_text === "string" ? `${index}-${text}` : index}
      >
        {content}
      </span>
    );
  });
}

function renderGithubAlert(text: string, id: string): ReactNode | null {
  const match = text.match(
    /^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*([\s\S]*)$/i,
  );
  if (!match) return null;
  const kind = match[1].toUpperCase();
  const styles: Record<string, string> = {
    NOTE: "border-blue-500/50 bg-blue-500/5",
    TIP: "border-emerald-500/50 bg-emerald-500/5",
    IMPORTANT: "border-primary/50 bg-primary/5",
    WARNING: "border-amber-500/50 bg-amber-500/5",
    CAUTION: "border-destructive/50 bg-destructive/5",
  };
  return (
    <aside
      key={id}
      className={`my-5 rounded-r-lg border-l-2 px-4 py-3 ${styles[kind]}`}
    >
      <p className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
        {kind}
      </p>
      <div
        className="notion-markdown text-sm leading-6 text-foreground/90"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(match[2].trim()) }}
      />
    </aside>
  );
}

function blockData(block: NotionBlock): RecordValue {
  return record(block[block.type]) ?? {};
}

type AssetContext = { type: ContentType; pageId: string };

function assetUrl(
  block: NotionBlock,
  kind: "image" | "file",
  context: AssetContext,
): string | null {
  const data = blockData(block);
  const source = record(data[kind]) ?? data;
  const external = record(source.external);
  const file = record(source.file);
  const externalUrl = external?.url;
  if (typeof externalUrl === "string" && /^https?:\/\//i.test(externalUrl)) {
    return externalUrl;
  }
  if (typeof file?.url === "string" || typeof source.url === "string") {
    return `/api/notion-image?type=block&id=${encodeURIComponent(block.id)}&collection=${context.type}&page=${encodeURIComponent(context.pageId)}`;
  }
  return null;
}

function captionText(data: RecordValue): string {
  return textValue(data.caption);
}

function renderListItem(
  block: NotionBlock,
  highlights: HighlightMap,
  context: AssetContext,
): ReactNode {
  const data = blockData(block);
  return (
    <li
      key={block.id}
      className="pl-1 leading-7 text-foreground/90 marker:text-primary"
    >
      {renderText(data.rich_text)}
      {block.children?.length ? (
        <div className="mt-2">
          <Blocks
            blocks={block.children}
            highlights={highlights}
            context={context}
          />
        </div>
      ) : null}
    </li>
  );
}

function renderBlock(
  block: NotionBlock,
  highlights: HighlightMap,
  context: AssetContext,
): ReactNode {
  const data = blockData(block);
  const children = block.children;
  const nested = children?.length ? (
    <Blocks blocks={children} highlights={highlights} context={context} />
  ) : null;
  const text = renderText(data.rich_text);

  switch (block.type) {
    case "paragraph": {
      const plainText = textValue(data.rich_text);
      const alert = renderGithubAlert(plainText, block.id);
      if (alert)
        return (
          <div key={block.id}>
            {alert}
            {nested}
          </div>
        );
      const shortcode = renderShortcode(plainText, block.id);
      if (shortcode)
        return (
          <div key={block.id}>
            {shortcode}
            {nested}
          </div>
        );
      return (
        <div key={block.id} className="space-y-3">
          {text ? <p className="leading-8 text-foreground/90">{text}</p> : null}
          {nested}
        </div>
      );
    }
    case "heading_1":
      return (
        <h2
          key={block.id}
          id={block.id}
          className="scroll-mt-24 pt-5 font-sans text-3xl font-semibold tracking-tight text-foreground"
        >
          {text}
        </h2>
      );
    case "heading_2":
      return (
        <h3
          key={block.id}
          id={block.id}
          className="scroll-mt-24 pt-4 font-sans text-2xl font-semibold tracking-tight text-foreground"
        >
          {text}
        </h3>
      );
    case "heading_3":
      return (
        <h4
          key={block.id}
          id={block.id}
          className="scroll-mt-24 pt-3 font-sans text-xl font-semibold tracking-tight text-foreground"
        >
          {text}
        </h4>
      );
    case "quote": {
      const alert = renderGithubAlert(textValue(data.rich_text), block.id);
      if (alert)
        return (
          <div key={block.id}>
            {alert}
            {nested}
          </div>
        );
      return (
        <blockquote
          key={block.id}
          className="border-l-2 border-primary/50 py-1 pl-5 text-lg leading-8 text-muted-foreground"
        >
          {text}
          {nested}
        </blockquote>
      );
    }
    case "callout":
      return (
        <aside
          key={block.id}
          className="rounded-xl border border-border bg-muted/50 px-5 py-4 leading-7 text-foreground"
        >
          {text}
          {nested}
        </aside>
      );
    case "to_do": {
      const checked = data.checked === true;
      return (
        <div key={block.id} className="flex gap-3 leading-7 text-foreground/90">
          <span
            aria-hidden="true"
            className={`mt-1.5 flex size-4 shrink-0 items-center justify-center rounded border ${checked ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
          >
            {checked ? <span className="text-[10px] font-bold">✓</span> : null}
          </span>
          <div className={checked ? "text-muted-foreground line-through" : ""}>
            {text}
            {nested}
          </div>
        </div>
      );
    }
    case "code": {
      const language =
        typeof data.language === "string" ? data.language : "plain text";
      const code = textValue(data.rich_text);
      if (language.toLowerCase() === "mermaid") {
        return (
          <MermaidDiagram
            key={block.id}
            chart={code}
            caption={captionText(data)}
          />
        );
      }
      const highlighted = highlights.get(block.id);
      const surface = highlighted?.background ?? "#282c34";
      return (
        <figure
          key={block.id}
          className="group overflow-hidden rounded-xl border border-border"
          style={{ backgroundColor: surface }}
        >
          <figcaption className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
              {highlighted?.language ?? language}
            </span>
            <CopyCodeButton code={code} />
          </figcaption>
          {highlighted ? (
            <ShikiCode highlighted={highlighted} />
          ) : (
            <pre
              className="overflow-x-auto p-4 text-[13px] leading-6"
              style={{ backgroundColor: surface, color: "#abb2bf" }}
            >
              <code
                className={`language-${language.toLowerCase().replace(/[^a-z0-9_-]/g, "-")}`}
              >
                {code}
              </code>
            </pre>
          )}
        </figure>
      );
    }
    case "equation": {
      const expression =
        typeof data.expression === "string" ? data.expression : "";
      return (
        <div
          key={block.id}
          className="my-5 overflow-x-auto rounded-lg bg-muted/40 px-4 py-4 text-center text-foreground"
          aria-label="Mathematical equation"
          dangerouslySetInnerHTML={{
            __html: katex.renderToString(expression, {
              displayMode: true,
              throwOnError: false,
              trust: false,
              strict: "ignore",
            }),
          }}
        />
      );
    }
    case "image": {
      const src = assetUrl(block, "image", context);
      const alt = captionText(data) || "Image in Notion document";
      if (!src) return null;
      return (
        <figure key={block.id} className="space-y-2">
          <Image
            src={src}
            alt={alt}
            width={1600}
            height={1200}
            sizes="(max-width: 768px) 100vw, 900px"
            unoptimized
            loading="lazy"
            className="h-auto max-h-[38rem] w-full rounded-xl border border-border bg-muted/30 object-contain"
          />
          {captionText(data) ? (
            <figcaption className="text-center text-xs text-muted-foreground">
              {captionText(data)}
            </figcaption>
          ) : null}
        </figure>
      );
    }
    case "file":
    case "pdf":
    case "audio": {
      const src = assetUrl(block, "file", context);
      if (!src) return null;
      const name =
        typeof data.name === "string"
          ? data.name
          : block.type === "audio"
            ? "Audio recording"
            : "Open attached file";
      if (block.type === "audio") {
        return (
          <figure
            key={block.id}
            className="my-5 rounded-xl border border-border bg-card p-4"
          >
            <figcaption className="mb-3 text-sm font-medium text-foreground">
              {captionText(data) || name}
            </figcaption>
            <audio controls preload="none" src={src} className="w-full">
              Your browser does not support embedded audio.
            </audio>
          </figure>
        );
      }
      return (
        <a
          key={block.id}
          href={src}
          target="_blank"
          rel="noreferrer noopener"
          className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground transition-colors hover:bg-muted/60"
        >
          <span className="min-w-0 truncate font-medium">{name}</span>
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-primary">
            {block.type === "pdf" ? "Open PDF" : "Open file"}
          </span>
        </a>
      );
    }
    case "video":
    case "bookmark":
    case "embed":
    case "link_preview": {
      const external = record(data.external);
      const file = record(data.file);
      const url = safeHref(data.url ?? external?.url ?? file?.url);
      if (!url) return null;
      const title = captionText(data) || url.replace(/^https?:\/\//, "");
      let youtubeEmbed: string | null = null;
      try {
        const parsedUrl = new URL(url);
        const videoId =
          parsedUrl.hostname === "youtu.be"
            ? parsedUrl.pathname.slice(1)
            : parsedUrl.hostname.includes("youtube.com")
              ? parsedUrl.searchParams.get("v") ||
                parsedUrl.pathname
                  .match(/\/embed\/([^/]+)|\/shorts\/([^/]+)/)
                  ?.slice(1)
                  .find(Boolean) ||
                null
              : null;
        if (videoId && /^[\w-]{6,20}$/.test(videoId))
          youtubeEmbed = `https://www.youtube.com/embed/${videoId}`;
      } catch {
        youtubeEmbed = null;
      }
      if (block.type === "video" && youtubeEmbed) {
        return (
          <figure
            key={block.id}
            className="my-7 overflow-hidden rounded-xl border border-border bg-card"
          >
            <div className="aspect-video">
              <iframe
                src={youtubeEmbed}
                title={title}
                className="h-full w-full"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            {captionText(data) ? (
              <figcaption className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
                {captionText(data)}
              </figcaption>
            ) : null}
          </figure>
        );
      }
      return (
        <a
          key={block.id}
          href={url}
          target="_blank"
          rel="noreferrer noopener"
          className="my-5 flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-4 transition-colors hover:bg-muted/60"
        >
          <span className="min-w-0">
            <span className="block text-[10px] font-mono uppercase tracking-[0.16em] text-primary">
              {block.type === "bookmark" ? "Bookmark" : "External resource"}
            </span>
            <span className="mt-1 block break-words text-sm font-medium text-foreground">
              {title}
            </span>
          </span>
          <span aria-hidden="true" className="shrink-0 text-primary">
            ↗
          </span>
        </a>
      );
    }
    case "child_page": {
      const title = typeof data.title === "string" ? data.title : "Linked page";
      return (
        <p
          key={block.id}
          className="my-3 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground"
        >
          Related page:{" "}
          <span className="font-medium text-foreground">{title}</span>
        </p>
      );
    }
    case "child_database": {
      const title =
        typeof data.title === "string" ? data.title : "Linked database";
      return (
        <p
          key={block.id}
          className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground"
        >
          Linked database:{" "}
          <span className="font-medium text-foreground">{title}</span>
        </p>
      );
    }
    case "divider":
      return (
        <hr key={block.id} className="my-2 border-0 border-t border-border" />
      );
    case "toggle":
      return (
        <details
          key={block.id}
          className="group rounded-lg border border-border px-4 py-3"
        >
          <summary className="cursor-pointer list-none font-medium text-foreground marker:hidden focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
            {text}
          </summary>
          {nested ? (
            <div className="mt-3 space-y-3 border-t border-border pt-3">
              {nested}
            </div>
          ) : null}
        </details>
      );
    case "column_list":
      return (
        <div key={block.id} className="grid gap-6 md:grid-cols-2">
          {children?.map((column) => (
            <div key={column.id} className="min-w-0 space-y-4">
              {column.children?.length ? (
                <Blocks
                  blocks={column.children}
                  highlights={highlights}
                  context={context}
                />
              ) : null}
            </div>
          ))}
        </div>
      );
    case "table": {
      const rows = children ?? [];
      if (!rows.length) return null;
      return (
        <div
          key={block.id}
          className="overflow-x-auto rounded-xl border border-border"
        >
          <table className="w-full border-collapse text-left text-sm">
            <tbody>
              {rows.map((row, rowIndex) => {
                const cells = record(row.table_row)?.cells;
                return (
                  <tr
                    key={row.id}
                    className={
                      rowIndex === 0 ? "bg-muted/60" : "border-t border-border"
                    }
                  >
                    {Array.isArray(cells)
                      ? cells.map((cell, cellIndex) => {
                          const Cell = rowIndex === 0 ? "th" : "td";
                          return (
                            <Cell
                              key={`${row.id}-${cellIndex}`}
                              className="min-w-32 px-4 py-3 align-top font-normal leading-6 text-foreground/90"
                            >
                              {renderText(cell)}
                            </Cell>
                          );
                        })
                      : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }
    case "table_of_contents":
      return null;
    default:
      return nested ? <div key={block.id}>{nested}</div> : null;
  }
}

/**
 * Synchronous renderer for a list of blocks. Highlights are resolved before
 * rendering (see `NotionBlocks`) and passed down through the whole tree.
 */
function Blocks({
  blocks,
  highlights,
  context,
}: {
  blocks: NotionBlock[];
  highlights: HighlightMap;
  context: AssetContext;
}) {
  const content: ReactNode[] = [];
  let index = 0;

  while (index < blocks.length) {
    const block = blocks[index];
    if (
      block.type === "bulleted_list_item" ||
      block.type === "numbered_list_item"
    ) {
      const listType = block.type;
      const grouped: NotionBlock[] = [];
      while (index < blocks.length && blocks[index].type === listType) {
        grouped.push(blocks[index]);
        index += 1;
      }
      const List = listType === "bulleted_list_item" ? "ul" : "ol";
      content.push(
        <List
          key={`${block.id}-list`}
          className={`space-y-2 pl-6 ${listType === "bulleted_list_item" ? "list-disc" : "list-decimal"}`}
        >
          {grouped.map((item) => renderListItem(item, highlights, context))}
        </List>,
      );
      continue;
    }
    content.push(renderBlock(block, highlights, context));
    index += 1;
  }

  return <div className="space-y-5">{content}</div>;
}

/**
 * Renders a Notion block tree. Code blocks are highlighted with Shiki up front
 * so the tree itself can render synchronously on the server.
 */
export async function NotionBlocks({
  blocks,
  type,
  pageId,
}: {
  blocks: NotionBlock[];
  type: ContentType;
  pageId: string;
}) {
  const highlights = await collectHighlights(blocks);
  return (
    <Blocks
      blocks={blocks}
      highlights={highlights}
      context={{ type, pageId }}
    />
  );
}
