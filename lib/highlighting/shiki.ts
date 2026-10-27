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

/** Shiki theme used for every code block. Matches the dark code surfaces. */
export const CODE_THEME = "one-dark-pro";

/** Language used when a block does not name a supported grammar. */
export const FALLBACK_LANGUAGE = "plaintext";

export type HighlightedCode = {
  /** Language actually used for the render (after alias resolution). */
  language: string;
  /** Theme background colour for the block surface. */
  background: string;
  /** Theme foreground colour for uncoloured text. */
  foreground: string;
  /** One entry per source line, each holding the coloured spans of that line. */
  lines: ThemedToken[][];
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
      themes: [CODE_THEME],
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
      theme: CODE_THEME,
    });

    return {
      language: resolved ? lang : FALLBACK_LANGUAGE,
      background: result.bg ?? "#282c34",
      foreground: result.fg ?? "#abb2bf",
      lines: result.tokens,
    };
  } catch (error) {
    console.error("Shiki highlighting failed:", error);
    return null;
  }
}
