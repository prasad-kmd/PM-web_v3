/**
 * Plain-text sanitising for OG query parameters (adapted from v1's
 * ReDoS-safe state machine: a single linear pass, no backtracking regex).
 */
export function stripTags(input: string): string {
  let output = "";
  let inTag = false;
  for (const char of input) {
    if (char === "<") inTag = true;
    else if (char === ">" && inTag) inTag = false;
    else if (!inTag) output += char;
  }
  return output;
}

export function cleanText(
  value: string | null | undefined,
  max: number,
): string {
  if (!value) return "";
  const text = stripTags(value.slice(0, max * 4))
    .replace(
      /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069]/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
  return truncate(text, max);
}

/** Truncate on a word boundary with an ellipsis. */
export function truncate(text: string, max: number): string {
  const chars = Array.from(text);
  if (chars.length <= max) return text;
  const cut = chars.slice(0, max - 1).join("");
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.–—-]+$/, "")}…`;
}
