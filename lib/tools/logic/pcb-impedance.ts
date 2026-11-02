/**
 * Pure IPC-2141 impedance logic.
 *
 * v1 used `parseFloat(x) || 0`, allowed a zero/negative trace thickness, and
 * used `1.9h` for symmetric stripline where the IPC-2141 form is
 * `1.9(2h + t)`. This module validates every dimension, uses the corrected
 * stripline geometry, and reports when the empirical validity range is exceeded.
 *
 * Microstrip: Z0 = 87 / sqrt(er + 1.41) · ln(5.98h / (0.8w + t))
 * Stripline:  Z0 = 60 / sqrt(er)       · ln(1.9(2h + t) / (0.8w + t))
 */

export type PcbTraceType = "microstrip" | "stripline";

export type PcbImpedanceInput = {
  type: PcbTraceType;
  dielectric: string;
  heightMm: string;
  widthMm: string;
  thicknessMm: string;
};

export type PcbImpedanceResult =
  | {
      ok: true;
      type: PcbTraceType;
      z0: number;
      z0Text: string;
      whRatio: number;
      erValid: boolean;
      geometryValid: boolean;
      formula: string;
      warning: string | null;
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

export function calculatePcbImpedance(
  input: PcbImpedanceInput,
): PcbImpedanceResult {
  try {
    const er = finite(input.dielectric, "Dielectric constant");
    const h = finite(input.heightMm, "Dielectric height");
    const w = finite(input.widthMm, "Trace width");
    const t = finite(input.thicknessMm, "Trace thickness");
    if (er <= 1 || er >= 15) {
      return {
        ok: false,
        error:
          "Dielectric constant must be between 1 and 15 for this approximation.",
      };
    }
    if (h <= 0) {
      return {
        ok: false,
        error: "Dielectric height must be greater than zero.",
      };
    }
    if (w <= 0) {
      return { ok: false, error: "Trace width must be greater than zero." };
    }
    if (t < 0) {
      return { ok: false, error: "Trace thickness cannot be negative." };
    }
    if (input.type !== "microstrip" && input.type !== "stripline") {
      return { ok: false, error: "Choose microstrip or stripline." };
    }
    const denominator = 0.8 * w + t;
    if (denominator <= 0) {
      return { ok: false, error: "Effective trace geometry is not positive." };
    }
    const numerator =
      input.type === "microstrip" ? 5.98 * h : 1.9 * (2 * h + t);
    const logArgument = numerator / denominator;
    if (logArgument <= 0) {
      return {
        ok: false,
        error: "Geometry produces a non-positive logarithm.",
      };
    }
    const z0 =
      (input.type === "microstrip"
        ? 87 / Math.sqrt(er + 1.41)
        : 60 / Math.sqrt(er)) * Math.log(logArgument);
    if (!Number.isFinite(z0) || z0 <= 0) {
      return {
        ok: false,
        error: "Impedance could not be computed for this geometry.",
      };
    }

    const whRatio = w / h;
    const erValid = er > 1 && er < 15;
    const geometryValid = whRatio > 0.1 && whRatio < 3;
    const warning =
      erValid && geometryValid
        ? null
        : `Outside the IPC-2141 comfort range (0.1 < w/h < 3, 1 < εr < 15). w/h = ${whRatio.toFixed(2)}.`;

    return {
      ok: true,
      type: input.type,
      z0,
      z0Text: z0.toFixed(2),
      whRatio,
      erValid,
      geometryValid,
      formula:
        input.type === "microstrip"
          ? "Z0 = 87 / √(εr + 1.41) · ln(5.98h / (0.8w + t))"
          : "Z0 = 60 / √εr · ln(1.9(2h + t) / (0.8w + t))",
      warning,
      note:
        input.type === "stripline"
          ? "Symmetric stripline: h is the distance from the trace to each reference plane."
          : "Surface microstrip: h is the dielectric height to the single reference plane.",
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Invalid impedance parameters.",
    };
  }
}
