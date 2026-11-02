/**
 * Pure op-amp gain logic.
 *
 * v1 used `parseFloat(x) || 0`, only checked R1 > 0, and never considered
 * supply-rail clipping. This module validates R1, Rf, Vin and optional rails,
 * keeps the inverting sign explicit, and reports clipping.
 */

export type OpAmpMode = "non-inverting" | "inverting";

export type OpAmpInput = {
  mode: OpAmpMode;
  r1K: string;
  rfK: string;
  vin: string;
  railVoltage?: string;
};

export type OpAmpResult =
  | {
      ok: true;
      mode: OpAmpMode;
      gain: number;
      voutIdeal: number;
      voutClipped: number | null;
      clipped: boolean;
      railVoltage: number | null;
      formula: string;
      note: string;
    }
  | { ok: false; error: string };

function finite(text: string, label: string): number {
  const value = Number(text.trim());
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }
  return value;
}

export function calculateOpAmp(input: OpAmpInput): OpAmpResult {
  try {
    const r1 = finite(input.r1K, "R1");
    const rf = finite(input.rfK, "Rf");
    const vin = finite(input.vin, "Input voltage");
    if (r1 <= 0) {
      return { ok: false, error: "R1 must be greater than zero." };
    }
    if (rf < 0) {
      return { ok: false, error: "Rf cannot be negative." };
    }
    let railVoltage: number | null = null;
    if (input.railVoltage !== undefined && input.railVoltage.trim() !== "") {
      railVoltage = finite(input.railVoltage, "Supply rail");
      if (railVoltage <= 0) {
        return { ok: false, error: "Supply rail must be greater than zero." };
      }
    }
    if (input.mode !== "non-inverting" && input.mode !== "inverting") {
      return { ok: false, error: "Choose inverting or non-inverting mode." };
    }

    const gain = input.mode === "non-inverting" ? 1 + rf / r1 : -(rf / r1);
    const voutIdeal = vin * gain;
    if (!Number.isFinite(gain) || !Number.isFinite(voutIdeal)) {
      return {
        ok: false,
        error: "Gain calculation produced a non-finite value.",
      };
    }
    const clipped = railVoltage !== null && Math.abs(voutIdeal) > railVoltage;
    const voutClipped = clipped
      ? Math.sign(voutIdeal) * (railVoltage as number)
      : null;
    return {
      ok: true,
      mode: input.mode,
      gain,
      voutIdeal,
      voutClipped,
      clipped,
      railVoltage,
      formula:
        input.mode === "non-inverting" ? "Av = 1 + Rf / R1" : "Av = −Rf / R1",
      note: "Ideal op-amp model; real outputs clip at the supply rails and depend on bandwidth, slew rate and load.",
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Invalid op-amp parameters.",
    };
  }
}
