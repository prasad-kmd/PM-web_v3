/**
 * Pure resistor colour-code logic.
 *
 * v1 mixed digit, multiplier, tolerance and temperature-coefficient tables in
 * one loose array, allowed invalid band choices, and used `parseInt` without a
 * radix for the band count. This module keeps an explicit, validated table,
 * separates the four band roles, and returns a clear error for illegal bands.
 */

export type BandRole = "digit" | "multiplier" | "tolerance" | "tempCoeff";

export type BandColor = {
  value: string;
  label: string;
  hex: string;
  digit: number | null;
  multiplier: number | null;
  tolerance: number | null;
  tempCoeff: number | null;
};

export const BAND_COLORS: readonly BandColor[] = [
  {
    value: "black",
    label: "Black",
    hex: "#000000",
    digit: 0,
    multiplier: 1,
    tolerance: null,
    tempCoeff: 250,
  },
  {
    value: "brown",
    label: "Brown",
    hex: "#78350f",
    digit: 1,
    multiplier: 10,
    tolerance: 1,
    tempCoeff: 100,
  },
  {
    value: "red",
    label: "Red",
    hex: "#dc2626",
    digit: 2,
    multiplier: 100,
    tolerance: 2,
    tempCoeff: 50,
  },
  {
    value: "orange",
    label: "Orange",
    hex: "#f97316",
    digit: 3,
    multiplier: 1000,
    tolerance: null,
    tempCoeff: 15,
  },
  {
    value: "yellow",
    label: "Yellow",
    hex: "#facc15",
    digit: 4,
    multiplier: 10000,
    tolerance: null,
    tempCoeff: 25,
  },
  {
    value: "green",
    label: "Green",
    hex: "#16a34a",
    digit: 5,
    multiplier: 100000,
    tolerance: 0.5,
    tempCoeff: 20,
  },
  {
    value: "blue",
    label: "Blue",
    hex: "#2563eb",
    digit: 6,
    multiplier: 1000000,
    tolerance: 0.25,
    tempCoeff: 10,
  },
  {
    value: "violet",
    label: "Violet",
    hex: "#8b5cf6",
    digit: 7,
    multiplier: 10000000,
    tolerance: 0.1,
    tempCoeff: 5,
  },
  {
    value: "grey",
    label: "Grey",
    hex: "#6b7280",
    digit: 8,
    multiplier: 100000000,
    tolerance: 0.05,
    tempCoeff: 1,
  },
  {
    value: "white",
    label: "White",
    hex: "#ffffff",
    digit: 9,
    multiplier: 1000000000,
    tolerance: null,
    tempCoeff: null,
  },
  {
    value: "gold",
    label: "Gold",
    hex: "#ca8a04",
    digit: null,
    multiplier: 0.1,
    tolerance: 5,
    tempCoeff: null,
  },
  {
    value: "silver",
    label: "Silver",
    hex: "#d1d5db",
    digit: null,
    multiplier: 0.01,
    tolerance: 10,
    tempCoeff: null,
  },
  {
    value: "none",
    label: "None",
    hex: "transparent",
    digit: null,
    multiplier: null,
    tolerance: 20,
    tempCoeff: null,
  },
] as const;

export type BandCount = 4 | 5 | 6;

export const BAND_ROLES: Record<BandCount, readonly BandRole[]> = {
  4: ["digit", "digit", "multiplier", "tolerance"],
  5: ["digit", "digit", "digit", "multiplier", "tolerance"],
  6: ["digit", "digit", "digit", "multiplier", "tolerance", "tempCoeff"],
} as const;

export const BAND_ROLE_LABELS: Record<BandCount, readonly string[]> = {
  4: ["Digit 1", "Digit 2", "Multiplier", "Tolerance"],
  5: ["Digit 1", "Digit 2", "Digit 3", "Multiplier", "Tolerance"],
  6: [
    "Digit 1",
    "Digit 2",
    "Digit 3",
    "Multiplier",
    "Tolerance",
    "Temp. coefficient",
  ],
} as const;

export function defaultBandSelection(bandCount: BandCount): string[] {
  if (bandCount === 4) {
    return ["brown", "black", "red", "gold", "brown", "red"];
  }
  return ["brown", "black", "black", "red", "brown", "red"];
}

export function allowedColors(role: BandRole): readonly BandColor[] {
  return BAND_COLORS.filter((color) => {
    if (role === "digit") return color.digit !== null;
    if (role === "multiplier") return color.multiplier !== null;
    if (role === "tolerance") return color.tolerance !== null;
    return color.tempCoeff !== null;
  });
}

export function formatResistance(ohms: number): string {
  if (!Number.isFinite(ohms) || ohms < 0) return "—";
  if (ohms === 0) return "0 Ω";
  if (ohms >= 1e9) return `${Number((ohms / 1e9).toFixed(3))} GΩ`;
  if (ohms >= 1e6) return `${Number((ohms / 1e6).toFixed(3))} MΩ`;
  if (ohms >= 1e3) return `${Number((ohms / 1e3).toFixed(3))} kΩ`;
  if (ohms < 1) return `${Number(ohms.toFixed(4))} Ω`;
  return `${Number(ohms.toFixed(2))} Ω`;
}

export type ResistorDecodeResult =
  | {
      ok: true;
      ohms: number;
      formatted: string;
      digits: number[];
      multiplier: number;
      tolerancePercent: number | null;
      tempCoeffPpm: number | null;
      minOhms: number | null;
      maxOhms: number | null;
      bandLabels: string[];
      note: string;
    }
  | { ok: false; error: string };

function findColor(value: string): BandColor | undefined {
  return BAND_COLORS.find((color) => color.value === value);
}

export function decodeResistorBands(
  bandCount: BandCount,
  selected: readonly string[],
): ResistorDecodeResult {
  if (![4, 5, 6].includes(bandCount)) {
    return { ok: false, error: "Band count must be 4, 5 or 6." };
  }
  const roles = BAND_ROLES[bandCount];
  if (selected.length < roles.length) {
    return { ok: false, error: "Select a colour for every band." };
  }
  const colors: BandColor[] = [];
  for (let index = 0; index < roles.length; index += 1) {
    const color = findColor(selected[index]);
    if (!color) {
      return { ok: false, error: `Band ${index + 1} has an unknown colour.` };
    }
    colors.push(color);
  }

  const digitColors = colors.filter((_, index) => roles[index] === "digit");
  const multiplierColor = colors.find(
    (_, index) => roles[index] === "multiplier",
  );
  const toleranceColor = colors.find(
    (_, index) => roles[index] === "tolerance",
  );
  const tempCoeffColor = colors.find(
    (_, index) => roles[index] === "tempCoeff",
  );

  if (digitColors.some((color) => color.digit === null)) {
    return { ok: false, error: "A digit band uses a non-digit colour." };
  }
  if (!multiplierColor || multiplierColor.multiplier === null) {
    return { ok: false, error: "The multiplier band is invalid." };
  }
  if (!toleranceColor || toleranceColor.tolerance === null) {
    return { ok: false, error: "The tolerance band is invalid." };
  }
  if (tempCoeffColor && tempCoeffColor.tempCoeff === null) {
    return { ok: false, error: "The temperature-coefficient band is invalid." };
  }

  const digits = digitColors.map((color) => color.digit as number);
  const significant = digits.reduce((total, digit, index) => {
    const power = digits.length - index - 1;
    return total + digit * 10 ** power;
  }, 0);
  const ohms = significant * (multiplierColor.multiplier as number);
  if (!Number.isFinite(ohms) || ohms < 0) {
    return { ok: false, error: "Decoded resistance is not finite." };
  }
  const tolerancePercent = toleranceColor.tolerance as number;
  const tempCoeffPpm = tempCoeffColor
    ? (tempCoeffColor.tempCoeff as number)
    : null;
  const minOhms = ohms * (1 - tolerancePercent / 100);
  const maxOhms = ohms * (1 + tolerancePercent / 100);

  return {
    ok: true,
    ohms,
    formatted: formatResistance(ohms),
    digits,
    multiplier: multiplierColor.multiplier as number,
    tolerancePercent,
    tempCoeffPpm,
    minOhms,
    maxOhms,
    bandLabels: colors.map((color) => color.label),
    note: `${bandCount}-band resistor: ${digits.length} significant digits, then multiplier, tolerance${tempCoeffPpm ? " and temperature coefficient" : ""}.`,
  };
}
