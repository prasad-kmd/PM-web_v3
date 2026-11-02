/**
 * Pure HTML entity encode/decode logic for the Tool Bench.
 *
 * v1 defect fixed: decoding used `DOMParser(...).textContent`, which parses
 * `<div>` back into an element and loses the literal markup the user asked
 * for. Decoding is now an explicit, non-parsing entity map that keeps decoded
 * `<` and `>` as text. Numeric decimal/hex references and repeated (nested)
 * encoding are handled without `eval` or DOM parsing.
 */

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: "\u00a0",
  copy: "©",
  reg: "®",
  trade: "™",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  bull: "•",
  middot: "·",
  euro: "€",
  pound: "£",
  yen: "¥",
  cent: "¢",
  deg: "°",
  plusmn: "±",
  times: "×",
  divide: "÷",
  frac12: "½",
  frac14: "¼",
  frac34: "¾",
  sect: "§",
  para: "¶",
  micro: "µ",
  alpha: "α",
  beta: "β",
  gamma: "γ",
  delta: "δ",
  pi: "π",
  sigma: "σ",
  omega: "ω",
  larr: "←",
  rarr: "→",
  uarr: "↑",
  darr: "↓",
  harr: "↔",
};

const ENTITY_PATTERN = /&(#x[0-9a-f]+|#[0-9]+|[a-z][a-z0-9]*);/gi;
const MAX_DECODE_PASSES = 5;

function codePointToString(code: number): string | null {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return null;
  // Lone surrogates cannot be represented as a valid UTF-16 string here.
  if (code >= 0xd800 && code <= 0xdfff) return null;
  try {
    return String.fromCodePoint(code);
  } catch {
    return null;
  }
}

function decodeEntity(entity: string): string | null {
  if (entity.startsWith("#x") || entity.startsWith("#X")) {
    return codePointToString(Number.parseInt(entity.slice(2), 16));
  }
  if (entity.startsWith("#")) {
    return codePointToString(Number.parseInt(entity.slice(1), 10));
  }
  return NAMED_ENTITIES[entity.toLowerCase()] ?? null;
}

export function encodeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return character;
    }
  });
}

/**
 * Decode named and numeric entities as text. `passes > 1` resolves nested
 * encodings such as `&amp;lt;div&amp;gt;` → `&lt;div&gt;` → `<div>`.
 * Unknown or malformed entities are left unchanged.
 */
export function decodeHtml(input: string, passes = 1): string {
  const count = Math.min(
    Math.max(Number.isFinite(passes) ? Math.trunc(passes) : 1, 1),
    MAX_DECODE_PASSES,
  );
  let result = input;
  for (let pass = 0; pass < count; pass += 1) {
    const next = result.replace(ENTITY_PATTERN, (match, entity: string) => {
      return decodeEntity(entity) ?? match;
    });
    if (next === result) break;
    result = next;
  }
  return result;
}
