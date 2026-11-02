/**
 * Pure WCAG 2.1 contrast logic.
 *
 * v1 returned luminance 0 for an invalid hex and still printed a plausible
 * ratio. This module validates the hex first and returns an explicit error,
 * so a typo can never masquerade as an accessibility result.
 */

export type Rgb = { r: number; g: number; b: number; hex: string };

export const WCAG_THRESHOLDS = {
  aaNormal: 4.5,
  aaLarge: 3,
  aaaNormal: 7,
  aaaLarge: 4.5,
} as const;

export type ContrastResult =
  | {
      ok: true;
      foreground: Rgb;
      background: Rgb;
      foregroundLuminance: number;
      backgroundLuminance: number;
      ratio: number;
      ratioText: string;
      compliance: {
        aaNormal: boolean;
        aaLarge: boolean;
        aaaNormal: boolean;
        aaaLarge: boolean;
      };
    }
  | { ok: false; error: string };

export function parseHexColor(input: string): Rgb | null {
  const text = input.trim().replace(/^#/, "");
  let expanded = text;
  if (/^[0-9a-f]{3}$/i.test(text)) {
    expanded = text
      .split("")
      .map((char) => char + char)
      .join("");
  }
  if (!/^[0-9a-f]{6}$/i.test(expanded)) return null;
  const r = Number.parseInt(expanded.slice(0, 2), 16);
  const g = Number.parseInt(expanded.slice(2, 4), 16);
  const b = Number.parseInt(expanded.slice(4, 6), 16);
  return { r, g, b, hex: `#${expanded.toUpperCase()}` };
}

function linearChannel(value: number): number {
  const srgb = value / 255;
  // WCAG 2.1 relative luminance uses the 0.03928 threshold.
  return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(rgb: Rgb): number {
  return (
    0.2126 * linearChannel(rgb.r) +
    0.7152 * linearChannel(rgb.g) +
    0.0722 * linearChannel(rgb.b)
  );
}

export function contrastRatio(
  foreground: string,
  background: string,
): ContrastResult {
  const fg = parseHexColor(foreground);
  const bg = parseHexColor(background);
  if (!fg) {
    return {
      ok: false,
      error: "Foreground must be a 3- or 6-digit hex colour.",
    };
  }
  if (!bg) {
    return {
      ok: false,
      error: "Background must be a 3- or 6-digit hex colour.",
    };
  }
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  if (!Number.isFinite(ratio)) {
    return { ok: false, error: "Contrast ratio could not be computed." };
  }
  return {
    ok: true,
    foreground: fg,
    background: bg,
    foregroundLuminance: l1,
    backgroundLuminance: l2,
    ratio,
    ratioText: ratio.toFixed(2),
    compliance: {
      aaNormal: ratio >= WCAG_THRESHOLDS.aaNormal,
      aaLarge: ratio >= WCAG_THRESHOLDS.aaLarge,
      aaaNormal: ratio >= WCAG_THRESHOLDS.aaaNormal,
      aaaLarge: ratio >= WCAG_THRESHOLDS.aaaLarge,
    },
  };
}
