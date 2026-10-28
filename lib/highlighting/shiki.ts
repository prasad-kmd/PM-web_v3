// Adapted from PM-Web_V2 (AGPL-3.0); see THIRD_PARTY_NOTICES.md.
import {
  bundledLanguages,
  createHighlighter,
  type BundledLanguage,
  type Highlighter,
  type ThemedToken,
  type TokensResult,
} from "shiki";

/**
 * Server-side syntax highlighting with Shiki.
 *
 * The highlighter is created once per server process and languages are loaded
 * lazily, so a page only pays for the grammars it actually renders. Only the
 * server imports this module: the theme runs at build/request time and the
 * result is handed to React as plain token data (no HTML strings, no XSS
 * surface, no client-side highlighter bundle).
 */

/**
 * Light and dark Shiki themes. Every token carries both colours (`color` and
 * `dark`), and the code block swaps to the dark one under `.dark`, so code
 * follows the workspace appearance instead of sitting on a fixed dark surface.
 * The GitHub "default" pair keeps comments readable on the muted surface.
 */
export const CODE_THEMES = {
  light: "github-light-default",
  dark: "github-dark-default",
} as const;

/** Language used when a block does not name a supported grammar. */
export const FALLBACK_LANGUAGE = "plaintext";

/** One coloured run of text. Plain data, so it can cross to client components. */
export type CodeToken = {
  content: string;
  /** Light theme colour. */
  color?: string;
  /** Dark theme colour. */
  dark?: string;
  italic?: boolean;
  bold?: boolean;
};

export type HighlightedCode = {
  /** Language actually used for the render (after alias resolution). */
  language: string;
  /** One entry per source line, each holding the coloured runs of that line. */
  lines: CodeToken[][];
};

/**
 * Notion (and hand-written markdown) use plenty of names and aliases that do
 * not match Shiki's canonical language ids, so normalise the common ones
 * before asking the highlighter for a grammar.
 */
const LANGUAGE_ALIASES: Record<string, string> = {
  "c#": "csharp",
  "c++": "cpp",
  "f#": "fsharp",
  "vb.net": "vb",
  "visual basic": "vb",
  "objective-c": "objective-c",
  "plain text": "plaintext",
  plain: FALLBACK_LANGUAGE,
  text: FALLBACK_LANGUAGE,
  txt: FALLBACK_LANGUAGE,
  none: FALLBACK_LANGUAGE,
  shell: "shellscript",
  sh: "shellscript",
  zsh: "shellscript",
  bash: "shellscript",
  console: "shellscript",
  ps: "powershell",
  ps1: "powershell",
  yml: "yaml",
  docker: "dockerfile",
  htm: "html",
  js: "javascript",
  jsx: "jsx",
  md: "markdown",
  node: "javascript",
  py: "python",
  rb: "ruby",
  rs: "rust",
  ts: "typescript",
  tsx: "tsx",
  golang: "go",
  jsonc: "json",
  make: "makefile",
  protobuf: "proto",
};

let highlighterPromise: Promise<Highlighter> | null = null;

/** Returns the shared highlighter, creating it on first use. */
function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [CODE_THEMES.light, CODE_THEMES.dark],
      // Languages are loaded on demand by `resolveLanguage`.
      langs: [],
    });
  }
  return highlighterPromise;
}

const isBundledLanguage = (value: string): value is BundledLanguage =>
  Object.hasOwn(bundledLanguages, value);

/**
 * Maps a block's language label onto a grammar Shiki can run, loading it if
 * necessary. Returns `null` when the label is unknown, so callers fall back to
 * plain text instead of failing the whole render.
 */
async function resolveLanguage(
  highlighter: Highlighter,
  language: string,
): Promise<BundledLanguage | null> {
  const requested = language.trim().toLowerCase();
  if (!requested) return null;

  const candidate = LANGUAGE_ALIASES[requested] ?? requested;
  if (highlighter.getLoadedLanguages().includes(candidate)) {
    return candidate as BundledLanguage;
  }
  if (!isBundledLanguage(candidate)) return null;

  try {
    await highlighter.loadLanguage(candidate);
    return candidate;
  } catch {
    return null;
  }
}

/** Reduces a dual-theme Shiki token to the few fields the renderer needs. */
function toCodeToken(token: ThemedToken): CodeToken {
  const style = token.htmlStyle ?? {};
  const out: CodeToken = { content: token.content };
  const color = style.color ?? token.color;
  if (color) out.color = color;
  if (style["--shiki-dark"]) out.dark = style["--shiki-dark"];
  const fontStyle = token.fontStyle ?? 0;
  if (style["font-style"] === "italic" || fontStyle & 1) out.italic = true;
  if (style["font-weight"] === "bold" || fontStyle & 2) out.bold = true;
  return out;
}

/** Trims a leading/trailing blank line but keeps inner indentation intact. */
function normalizeSource(code: string): string {
  return code.replace(/^\n+/, "").replace(/\s+$/, "");
}

/**
 * Highlights `code` and returns the token data needed to render it.
 * Never throws: an unsupported language falls back to plain text and an empty
 * block simply returns `null`.
 */
export async function highlightCode(
  code: string,
  language: string,
): Promise<HighlightedCode | null> {
  const source = normalizeSource(code);
  if (!source) return null;

  try {
    const highlighter = await getHighlighter();
    const resolved = await resolveLanguage(highlighter, language);
    const lang = resolved ?? FALLBACK_LANGUAGE;

    const result: TokensResult = highlighter.codeToTokens(source, {
      lang,
      themes: CODE_THEMES,
    });

    return {
      language: resolved ? lang : FALLBACK_LANGUAGE,
      lines: result.tokens.map((line) => line.map(toCodeToken)),
    };
  } catch (error) {
    console.error("Shiki highlighting failed:", error);
    return null;
  }
}
