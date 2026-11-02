/**
 * P5a pure geometry: area moment of inertia for common cross-sections.
 * All dimensions are millimetres. Ixx / Iyy are in mm^4 and area is mm^2.
 * No persistence, no PDF/canvas export, and no silent parseFloat fallbacks.
 */

export type MoiShape = "rectangle" | "circle" | "ibeam";

export type MoiResult = {
  ok: true;
  shape: MoiShape;
  ixx: number;
  iyy: number;
  area: number;
  formula: string;
  note: string;
};

export type MoiError = { ok: false; error: string };

function isPositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

export function calculateMomentOfInertia(input: {
  shape: MoiShape;
  width?: number;
  height?: number;
  diameter?: number;
  flangeWidth?: number;
  flangeThickness?: number;
  webHeight?: number;
  webThickness?: number;
}): MoiResult | MoiError {
  if (input.shape === "rectangle") {
    const b = input.width;
    const h = input.height;
    if (!isPositive(b ?? NaN) || !isPositive(h ?? NaN)) {
      return { ok: false, error: "Enter a positive width and height." };
    }
    return {
      ok: true,
      shape: "rectangle",
      ixx: (b! * h! ** 3) / 12,
      iyy: (h! * b! ** 3) / 12,
      area: b! * h!,
      formula: "Ixx = b·h³ / 12; Iyy = h·b³ / 12",
      note: "b is the horizontal width and h is the vertical height.",
    };
  }

  if (input.shape === "circle") {
    const d = input.diameter;
    if (!isPositive(d ?? NaN)) {
      return { ok: false, error: "Enter a positive diameter." };
    }
    return {
      ok: true,
      shape: "circle",
      ixx: (Math.PI * d! ** 4) / 64,
      iyy: (Math.PI * d! ** 4) / 64,
      area: (Math.PI * d! ** 2) / 4,
      formula: "Ixx = Iyy = π·d⁴ / 64",
      note: "Solid circular section about a centroidal diameter.",
    };
  }

  if (input.shape === "ibeam") {
    const B = input.flangeWidth;
    const tf = input.flangeThickness;
    const Hw = input.webHeight;
    const tw = input.webThickness;
    if (
      !isPositive(B ?? NaN) ||
      !isPositive(tf ?? NaN) ||
      !isPositive(Hw ?? NaN) ||
      !isPositive(tw ?? NaN)
    ) {
      return { ok: false, error: "Enter positive flange and web dimensions." };
    }
    if (B! <= tw!) {
      return {
        ok: false,
        error: "Flange width must be greater than web thickness.",
      };
    }
    const H = Hw! + 2 * tf!;
    return {
      ok: true,
      shape: "ibeam",
      ixx: (B! * H ** 3) / 12 - ((B! - tw!) * Hw! ** 3) / 12,
      iyy: (2 * (tf! * B! ** 3)) / 12 + (Hw! * tw! ** 3) / 12,
      area: 2 * B! * tf! + Hw! * tw!,
      formula: "Ixx = [B·H³ − (B−tw)·Hw³] / 12; Iyy = 2·tf·B³/12 + Hw·tw³/12",
      note: "Symmetric I-section with overall height H = Hw + 2·tf.",
    };
  }

  return { ok: false, error: "Unknown section shape." };
}

export function formatSecondMoment(value: number): string {
  return value.toExponential(4);
}
