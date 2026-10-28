"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { FileCodeIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCodeWriting } from "@animate-ui/react/primitives/code-block";
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
  const lineCount = plainLines.length;
  const typeable = lineCount > 0 && lineCount <= TYPING_MAX_LINES;

  // Typing switches on only after hydration and only for blocks still below
  // the fold, so the server HTML always carries the full code and nothing that
  // is already on screen blanks out.
  const [writing, setWriting] = useState(false);
  const blockRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!typeable) return;
    const node = blockRef.current;
    if (!node) return;
    if (node.getBoundingClientRect().top > window.innerHeight) setWriting(true);
  }, [typeable]);

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
          <CodeBlockCopyButton value={code} />
        </CodeBlockActions>
      </CodeBlockHeader>
      <CodeBlockContent
        lineNumbers={lineCount > 1}
        writing={written.writing}
        // Hold the final height while typing so the page never shifts.
        style={
          writing ? { minHeight: `calc(${lineCount}lh + 1.75rem)` } : undefined
        }
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
    </CodeBlock>
  );
}
