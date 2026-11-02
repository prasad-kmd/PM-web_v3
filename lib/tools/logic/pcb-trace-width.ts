/**
 * Pure IPC-2221 trace-width logic.
 *
 * v1 used `parseFloat(x) || 0`, hard-coded the external/internal constants in
 * the view, and approximated 1 oz copper as 1.37 mils. This module validates
 * inputs, keeps the published constants in one place, uses 1.378 mils per oz,
 * and reports a 20% design margin.
 *
 * Formula: I = k · ΔT^b · A^c, with A in square mils.
 */

export type PcbLayer = "external" | "internal";

export const IPC2221 = {
  b: 0.44,
  c: 0.725,
  kExternal: 0.048,
  kInternal: 0.024,
  ozToMils: 1.378,
  milToMm: 0.0254,
  designMargin: 0.2,
} as const;

export type PcbTraceWidthInput = {
  current: string;
  copperOz: string;
  tempRise: string;
  layer: PcbLayer;
};

export type PcbTraceWidthResult =
  | {
      ok: true;
      areaMil2: number;
      widthMil: number;
      widthMm: number;
      recommendedWidthMm: number;
      thicknessMil: number;
      k: number;
      layer: PcbLayer;
      formula: string;
      note: string;
    }
  | { ok: false; error: string };

function finitePositive(text: string, label: string): number {
  const value = Number(text.trim());
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive finite number.`);
  }
  return value;
}

export function calculatePcbTraceWidth(
  input: PcbTraceWidthInput,
): PcbTraceWidthResult {
  try {
    const current = finitePositive(input.current, "Target current");
    const copperOz = finitePositive(input.copperOz, "Copper weight");
    const tempRise = finitePositive(input.tempRise, "Temperature rise");
    if (input.layer !== "external" && input.layer !== "internal") {
      return { ok: false, error: "Choose external or internal layer." };
    }
    const k =
      input.layer === "external" ? IPC2221.kExternal : IPC2221.kInternal;
    const areaMil2 = Math.pow(
      current / (k * Math.pow(tempRise, IPC2221.b)),
      1 / IPC2221.c,
    );
    const thicknessMil = copperOz * IPC2221.ozToMils;
    const widthMil = areaMil2 / thicknessMil;
    const widthMm = widthMil * IPC2221.milToMm;
    const recommendedWidthMm = widthMm * (1 + IPC2221.designMargin);
    if (
      ![areaMil2, thicknessMil, widthMil, widthMm, recommendedWidthMm].every(
        Number.isFinite,
      ) ||
      areaMil2 <= 0 ||
      widthMil <= 0
    ) {
      return {
        ok: false,
        error: "IPC-2221 calculation produced an invalid width.",
      };
    }
    return {
      ok: true,
      areaMil2,
      widthMil,
      widthMm,
      recommendedWidthMm,
      thicknessMil,
      k,
      layer: input.layer,
      formula: "A = (I / (k · ΔT^0.44))^(1/0.725); width = A / thickness",
      note: `k = ${k} (${input.layer}); 1 oz/ft² ≈ ${IPC2221.ozToMils} mils. IPC-2221 is a legacy curve fit; IPC-2152 may allow narrower traces.`,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Invalid trace-width parameters.",
    };
  }
}
