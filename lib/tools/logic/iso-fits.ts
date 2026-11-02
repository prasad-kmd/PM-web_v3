/**
 * P5a pure ISO 286 hole-basis fit lookup for common H holes and f/g/h/p shafts.
 * Values are micrometres (µm). The size step uses the "up to and including"
 * boundary rule, e.g. 30 mm belongs to the over-18-through-30 row.
 * Reference tables: IT6–IT9 widths and g6/h6/p6 deviations verified against
 * published ISO 286 charts. No parseInt() without radix and no || 0 fallbacks.
 */

export const ISO_SIZE_RANGES = [
  3, 6, 10, 18, 30, 50, 80, 120, 180, 250, 315, 400, 500,
] as const;

export const IT_TOLERANCE_UM: Record<6 | 7 | 8 | 9, readonly number[]> = {
  6: [6, 8, 9, 11, 13, 16, 19, 22, 25, 29, 32, 36, 40],
  7: [10, 12, 15, 18, 21, 25, 30, 35, 40, 46, 52, 57, 63],
  8: [14, 18, 22, 27, 33, 39, 46, 54, 63, 72, 81, 89, 97],
  9: [25, 30, 36, 43, 52, 62, 74, 87, 100, 115, 130, 140, 155],
};

type ShaftLetter = "f" | "g" | "h" | "p";

/** Fundamental deviation in µm: upper es for f/g/h, lower ei for p. */
export const SHAFT_FUNDAMENTAL_DEVIATION_UM: Record<
  ShaftLetter,
  readonly number[]
> = {
  f: [-6, -10, -13, -16, -20, -25, -30, -36, -43, -50, -56, -62, -68],
  g: [-2, -4, -5, -6, -7, -9, -10, -12, -14, -15, -17, -18, -20],
  h: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  p: [6, 12, 15, 18, 22, 26, 32, 37, 43, 50, 56, 62, 68],
};

export type IsoFitResult = {
  ok: true;
  diameterMm: number;
  rangeLabel: string;
  holeClass: string;
  shaftClass: string;
  hole: { min: number; max: number };
  shaft: { min: number; max: number };
  clearance: { min: number; max: number };
  fitType: "Clearance" | "Transition" | "Interference";
  note: string;
};

export type IsoFitError = { ok: false; error: string };

export function isoRangeIndex(diameterMm: number): number {
  for (let i = 0; i < ISO_SIZE_RANGES.length; i += 1) {
    if (diameterMm <= ISO_SIZE_RANGES[i]) return i;
  }
  return -1;
}

function parseClass(
  value: string,
  kind: "hole" | "shaft",
): { letter: string; grade: 6 | 7 | 8 | 9 } | null {
  const match = /^([A-Za-z])(\d+)$/.exec(value.trim());
  if (!match) return null;
  const grade = Number.parseInt(match[2], 10) as 6 | 7 | 8 | 9;
  if (![6, 7, 8, 9].includes(grade)) return null;
  if (kind === "hole" && match[1].toUpperCase() !== "H") return null;
  if (
    kind === "shaft" &&
    !["f", "g", "h", "p"].includes(match[1].toLowerCase())
  ) {
    return null;
  }
  return { letter: match[1].toLowerCase(), grade };
}

export function calculateIsoFit(input: {
  diameterMm: number;
  holeClass: string;
  shaftClass: string;
}): IsoFitResult | IsoFitError {
  const d = input.diameterMm;
  if (!Number.isFinite(d) || d <= 0 || d > 500) {
    return { ok: false, error: "Nominal diameter must be 0–500 mm." };
  }
  const hole = parseClass(input.holeClass, "hole");
  const shaft = parseClass(input.shaftClass, "shaft");
  if (!hole || !shaft) {
    return {
      ok: false,
      error: "Use an H6–H9 hole and an f/g/h/p shaft in IT6–IT9.",
    };
  }
  const idx = isoRangeIndex(d);
  const holeTol = IT_TOLERANCE_UM[hole.grade][idx];
  const shaftTol = IT_TOLERANCE_UM[shaft.grade][idx];
  const deviation =
    SHAFT_FUNDAMENTAL_DEVIATION_UM[shaft.letter as ShaftLetter][idx];
  if (
    !Number.isFinite(holeTol) ||
    !Number.isFinite(shaftTol) ||
    !Number.isFinite(deviation)
  ) {
    return { ok: false, error: "No ISO 286 table entry for this diameter." };
  }

  const holeMin = 0;
  const holeMax = holeTol;
  let shaftMin: number;
  let shaftMax: number;
  if (shaft.letter === "f" || shaft.letter === "g" || shaft.letter === "h") {
    shaftMax = deviation;
    shaftMin = shaftMax - shaftTol;
  } else {
    shaftMin = deviation;
    shaftMax = shaftMin + shaftTol;
  }

  const minClearance = holeMin - shaftMax;
  const maxClearance = holeMax - shaftMin;
  let fitType: IsoFitResult["fitType"];
  if (minClearance >= 0) fitType = "Clearance";
  else if (maxClearance <= 0) fitType = "Interference";
  else fitType = "Transition";

  const lower = idx === 0 ? 0 : ISO_SIZE_RANGES[idx - 1];
  const upper = ISO_SIZE_RANGES[idx];
  return {
    ok: true,
    diameterMm: d,
    rangeLabel: `over ${lower}–${upper} mm`,
    holeClass: `H${hole.grade}`,
    shaftClass: `${shaft.letter}${shaft.grade}`,
    hole: { min: holeMin, max: holeMax },
    shaft: { min: shaftMin, max: shaftMax },
    clearance: { min: minClearance, max: maxClearance },
    fitType,
    note: "Diametral limits in µm. Form, surface finish and temperature are not included.",
  };
}
