/**
 * Pure guard logic for the Regex Architect.
 *
 * v1 defect fixed: `new RegExp` and `exec` ran on the React render thread with
 * no time or iteration cap, so a pattern such as `(a+)+$` could freeze the
 * window. The view now runs matching in a short-lived Blob worker and
 * terminates it after `timeoutMs`; flags, pattern length, test-string length,
 * match count and zero-length iteration are all bounded here.
 */

export const REGEX_FLAGS = "dgimsuvy" as const;
export const REGEX_FLAG_SET = new Set<string>(REGEX_FLAGS);

export const REGEX_LIMITS = {
  maxPatternLength: 1000,
  maxTestLength: 20_000,
  maxMatches: 500,
  timeoutMs: 300,
} as const;

export type RegexMatch = {
  index: number;
  value: string;
  groups: (string | undefined)[];
  namedGroups?: Record<string, string | undefined>;
};

export type RegexEvaluation = {
  matches: RegexMatch[];
  error: string | null;
  timedOut: boolean;
  truncated: boolean;
};

export type FlagValidation = {
  flags: string;
  error: string | null;
};

export function sanitizeFlags(raw: string): FlagValidation {
  const seen = new Set<string>();
  let flags = "";
  for (const character of raw) {
    if (!REGEX_FLAG_SET.has(character)) {
      return {
        flags: "",
        error: `Unsupported flag "${character}". Allowed: ${REGEX_FLAGS}.`,
      };
    }
    if (!seen.has(character)) {
      seen.add(character);
      flags += character;
    }
  }
  return { flags, error: null };
}

export type HighlightSegment = {
  type: "text" | "match" | "zero";
  value: string;
  index: number;
  matchNumber?: number;
};

/** Build non-overlapping highlight segments, including zero-length markers. */
export function buildHighlightSegments(
  text: string,
  matches: readonly RegexMatch[],
): HighlightSegment[] {
  const segments: HighlightSegment[] = [];
  const sorted = [...matches].sort(
    (a, b) => a.index - b.index || a.value.length - b.value.length,
  );
  let cursor = 0;
  let matchNumber = 0;

  for (const match of sorted) {
    if (match.index < cursor || match.index > text.length) continue;
    if (match.index > cursor) {
      segments.push({
        type: "text",
        value: text.slice(cursor, match.index),
        index: cursor,
      });
      cursor = match.index;
    }
    matchNumber += 1;
    if (match.value.length === 0) {
      segments.push({
        type: "zero",
        value: "",
        index: match.index,
        matchNumber,
      });
      continue;
    }
    const end = Math.min(match.index + match.value.length, text.length);
    segments.push({
      type: "match",
      value: text.slice(match.index, end),
      index: match.index,
      matchNumber,
    });
    cursor = end;
  }

  if (cursor < text.length) {
    segments.push({ type: "text", value: text.slice(cursor), index: cursor });
  }
  return segments;
}
