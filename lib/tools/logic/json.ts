/**
 * Pure JSON formatting logic for the Tool Bench.
 *
 * v1 defect fixed: `parseInt(e.target.value)` had no radix and no NaN guard,
 * so a bad indent value could reach `JSON.stringify`. Indentation is now a
 * closed set parsed with radix 10 and clamped to a safe default.
 */

export const JSON_INDENT_OPTIONS = [0, 2, 4, 8] as const;
export type JsonIndent = (typeof JSON_INDENT_OPTIONS)[number];

export type JsonFormatResult =
  | { ok: true; output: string; minified: boolean }
  | { ok: false; error: string };

export function parseJsonIndent(
  value: string | number | null | undefined,
): JsonIndent {
  const parsed =
    typeof value === "number"
      ? value
      : Number.parseInt(String(value ?? ""), 10);
  return JSON_INDENT_OPTIONS.includes(parsed as JsonIndent)
    ? (parsed as JsonIndent)
    : 2;
}

export function formatJson(
  input: string,
  indent: JsonIndent,
): JsonFormatResult {
  if (!input.trim()) return { ok: true, output: "", minified: indent === 0 };
  try {
    const parsed: unknown = JSON.parse(input);
    const output = JSON.stringify(
      parsed,
      null,
      indent === 0 ? undefined : indent,
    );
    return { ok: true, output: output ?? "", minified: indent === 0 };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invalid JSON",
    };
  }
}

export function minifyJson(input: string): JsonFormatResult {
  return formatJson(input, 0);
}
