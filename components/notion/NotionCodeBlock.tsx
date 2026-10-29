"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { FileCodeIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCodeWriting } from "@animate-ui/react/primitives/code-block";
import { Button } from "@/components/ui/button";
import type { CodeToken } from "@/lib/highlighting/shiki";
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockLanguage,
  CodeBlockLine,
  CodeBlockTitle,
} from "@/components/ui/code-block";

/** Blocks up to this many lines type themselves out once; longer ones never do. */
const TYPING_MAX_LINES = 12;

type NotionCodeBlockProps = {
  /** Raw source, used by the copy button. */
  code: string;
  /** Language label shown in the header. */
  language: string;
  /** Optional title (the Notion caption, e.g. a file name). */
  title?: string;
  /** Shiki lines. `null` when highlighting was unavailable. */
  lines: CodeToken[][] | null;
};

function tokenStyle(token: CodeToken): CSSProperties | undefined {
  if (!token.color && !token.dark && !token.italic && !token.bold)
    return undefined;
  const style: CSSProperties & Record<`--${string}`, string> = {};
  if (token.color) style["--code-light"] = token.color;
  if (token.dark) style["--code-dark"] = token.dark;
  if (token.italic) style.fontStyle = "italic";
  if (token.bold) style.fontWeight = 600;
  return style;
}

/**
 * Cuts the token lines down to the first `length` characters of the source
 * (newlines count as one), so the typing effect reveals Shiki's colours as it
 * goes instead of re-highlighting partial code.
 */
function sliceLines(lines: CodeToken[][], length: number): CodeToken[][] {
  const out: CodeToken[][] = [];
  let left = length;
  for (const line of lines) {
    if (left < 0) break;
    const next: CodeToken[] = [];
    for (const token of line) {
      if (left <= 0) break;
      const content = token.content.slice(0, left);
      left -= content.length;
      next.push(content === token.content ? token : { ...token, content });
    }
    out.push(next);
    left -= 1; // the newline after this line
  }
  return out;
}

export function NotionCodeBlock({
  code,
  language,
  title,
  lines,
}: NotionCodeBlockProps) {
  const source = useMemo(
    () =>
      lines
        ? lines.map((line) => line.map((t) => t.content).join("")).join("\n")
        : code,
    [lines, code],
  );
  const plainLines = useMemo<CodeToken[][]>(
    () =>
      lines ??
      source.split("\n").map((text) => (text ? [{ content: text }] : [])),
    [lines, source],
  );
  const [expanded, setExpanded] = useState(false);
  const [wrap, setWrap] = useState(false);
  const [overflow, setOverflow] = useState(false);
  const contentId = useId();
  const contentRef = useRef<HTMLPreElement>(null);
  const lineCount = plainLines.length;
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const update = () => setOverflow(content.scrollHeight > 320);
    const observer = new ResizeObserver(update);
    observer.observe(content);
    if (content.firstElementChild) observer.observe(content.firstElementChild);
    update();
    return () => observer.disconnect();
  }, [wrap, source]);
  const typeable = lineCount > 0 && lineCount <= TYPING_MAX_LINES;

  // Typing switches on only after hydration and only for blocks still below
  // the fold, so the server HTML always carries the full code and nothing that
  // is already on screen blanks out.
  const [writing, setWriting] = useState(false);
  const blockRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!typeable || wrap || (contentRef.current?.scrollHeight || 0) > 320)
      return;
    const node = blockRef.current;
    if (!node) return;
    if (
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
      node.getBoundingClientRect().top > window.innerHeight
    )
      setWriting(true);
  }, [typeable, wrap]);

  const written = useCodeWriting<HTMLDivElement>(
    source,
    {
      writing,
      duration: Math.min(2600, 500 + source.length * 9),
      cadence: "natural",
      inView: true,
      inViewOnce: true,
      // Start just before the block scrolls in, so the clear never shows.
      inViewMargin: "0px 0px 64px 0px",
    },
    blockRef,
  );

  const visible =
    writing && !written.done
      ? sliceLines(plainLines, written.code.length)
      : plainLines;

  return (
    <CodeBlock ref={written.ref} className="notion-code my-6">
      <CodeBlockHeader>
        {title ? (
          <CodeBlockTitle>
            <HugeiconsIcon icon={FileCodeIcon} strokeWidth={2} />
            {title}
          </CodeBlockTitle>
        ) : null}
        <CodeBlockLanguage>{language}</CodeBlockLanguage>
        <CodeBlockActions>
          <Button
            variant="ghost"
            size="sm"
            aria-pressed={wrap}
            onClick={() => setWrap((value) => !value)}
          >
            Wrap
          </Button>
          <CodeBlockCopyButton value={code} />
        </CodeBlockActions>
      </CodeBlockHeader>
      <CodeBlockContent
        id={contentId}
        ref={contentRef}
        wrap={wrap}
        lineNumbers={lineCount > 1}
        writing={written.writing}
        // Hold the final height while typing so the page never shifts.
        style={{
          maxHeight: expanded ? undefined : 320,
          minHeight: writing
            ? `min(320px, calc(${lineCount}lh + 1.75rem))`
            : undefined,
        }}
        aria-label={title ? `${title} (${language})` : `${language} code`}
      >
        {visible.map((line, index) => (
          // Lines only change when the source changes, so the index is a
          // stable key here.
          <CodeBlockLine key={index}>
            {line.length
              ? line.map((token, tokenIndex) => (
                  <span key={tokenIndex} style={tokenStyle(token)}>
                    {token.content}
                  </span>
                ))
              : null}
          </CodeBlockLine>
        ))}
      </CodeBlockContent>
      {overflow ? (
        <div className="flex justify-center border-t border-border p-2">
          <Button
            variant="ghost"
            size="sm"
            aria-expanded={expanded}
            aria-controls={contentId}
            onClick={() => {
              if (expanded) {
                const block = blockRef.current;
                const scroller = block?.closest<HTMLElement>(".window-body");
                if (
                  block &&
                  block.getBoundingClientRect().top <
                    (scroller?.getBoundingClientRect().top || 0)
                )
                  block.scrollIntoView({ block: "start", behavior: "instant" });
              }
              setExpanded((value) => !value);
            }}
          >
            {expanded ? "Collapse code" : "Expand code"}
          </Button>
        </div>
      ) : null}
    </CodeBlock>
  );
}
