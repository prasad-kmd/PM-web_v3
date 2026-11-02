/**
 * Pure CSS-unit logic.
 *
 * v1 used `parseFloat(x) || default` everywhere, so a legitimate `0` base font
 * size or viewport width silently became 16 / 1920 / 1080. This module parses
 * explicitly, rejects non-positive context values, and never guesses.
 */

export type CssUnit = "px" | "rem" | "em" | "percent" | "vw" | "vh";

export const CSS_UNITS: readonly { value: CssUnit; label: string }[] = [
  { value: "px", label: "Pixels (px)" },
  { value: "rem", label: "Root em (rem)" },
  { value: "em", label: "Parent em (em)" },
  { value: "percent", label: "Percent (%)" },
  { value: "vw", label: "Viewport width (vw)" },
  { value: "vh", label: "Viewport height (vh)" },
] as const;

export type CssContextInput = {
  px: string;
  base: string;
  viewportWidth: string;
  viewportHeight: string;
};

export type CssConversionResult =
  | {
      ok: true;
      values: Record<CssUnit, number>;
      formatted: Record<CssUnit, string>;
      css: string;
    }
  | { ok: false; error: string };

function parseFinite(text: string, label: string): number {
  const trimmed = text.trim();
  if (!trimmed) throw new Error(`${label} is required.`);
  const value = Number(trimmed);
  if (!Number.isFinite(value))
    throw new Error(`${label} must be a finite number.`);
  return value;
}

function parsePositive(text: string, label: string): number {
  const value = parseFinite(text, label);
  if (value <= 0) throw new Error(`${label} must be greater than zero.`);
  return value;
}

export function formatCssNumber(value: number, decimals = 3): string {
  if (!Number.isFinite(value)) return "—";
  if (Object.is(value, -0) || value === 0) return "0";
  return Number(value.toFixed(decimals)).toString();
}

export function convertCssUnits(input: CssContextInput): CssConversionResult {
  try {
    const px = parseFinite(input.px, "Pixel value");
    const base = parsePositive(input.base, "Base font size");
    const viewportWidth = parsePositive(input.viewportWidth, "Viewport width");
    const viewportHeight = parsePositive(
      input.viewportHeight,
      "Viewport height",
    );

    const values: Record<CssUnit, number> = {
      px,
      rem: px / base,
      // Assumes the parent font size equals the root font size. A real `em`
      // depends on the parent element; the view makes that assumption visible.
      em: px / base,
      percent: (px / base) * 100,
      vw: (px / viewportWidth) * 100,
      vh: (px / viewportHeight) * 100,
    };

    for (const value of Object.values(values)) {
      if (!Number.isFinite(value)) {
        return { ok: false, error: "Conversion produced a non-finite value." };
      }
    }

    const formatted: Record<CssUnit, string> = {
      px: formatCssNumber(values.px, 3),
      rem: formatCssNumber(values.rem, 3),
      em: formatCssNumber(values.em, 3),
      percent: formatCssNumber(values.percent, 1),
      vw: formatCssNumber(values.vw, 3),
      vh: formatCssNumber(values.vh, 3),
    };

    const css = [
      ".element {",
      `  width: ${formatted.vw}vw;`,
      `  font-size: ${formatted.rem}rem;`,
      `  padding: ${formatted.vh}vh;`,
      "}",
    ].join("\n");

    return { ok: true, values, formatted, css };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invalid CSS context.",
    };
  }
}
