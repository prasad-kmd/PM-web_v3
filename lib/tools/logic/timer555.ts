/**
 * Pure 555-timer logic.
 *
 * v1 hid bad input with `parseFloat(x) * scale || 0` and used rounded 1.44 /
 * 1.1 constants. This module validates every component, keeps explicit unit
 * scaling, and derives timing from ln(2) / ln(3) so the astable period and
 * high/low times are internally consistent.
 */

export type TimerMode = "astable" | "monostable";

export type Timer555Input = {
  mode: TimerMode;
  /** Astable: R1, R2 in kΩ and C in µF. */
  r1K?: string;
  r2K?: string;
  cUf?: string;
  /** Monostable: R in kΩ and C in µF. */
  rK?: string;
  monoCUf?: string;
};

export type Timer555Result =
  | {
      ok: true;
      mode: TimerMode;
      frequencyHz: number | null;
      periodSeconds: number | null;
      timeHighSeconds: number | null;
      timeLowSeconds: number | null;
      dutyPercent: number | null;
      pulseWidthSeconds: number | null;
      note: string;
    }
  | { ok: false; error: string };

const K_TO_OHM = 1000;
const UF_TO_F = 1e-6;

function finitePositive(text: string | undefined, label: string): number {
  const value = Number((text ?? "").trim());
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive finite number.`);
  }
  return value;
}

export function formatFrequencyHz(hz: number): string {
  if (!Number.isFinite(hz) || hz <= 0) return "—";
  if (hz >= 1e6) return `${Number((hz / 1e6).toFixed(3))} MHz`;
  if (hz >= 1e3) return `${Number((hz / 1e3).toFixed(3))} kHz`;
  return `${Number(hz.toFixed(3))} Hz`;
}

export function formatTimeSeconds(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  if (seconds >= 1) return `${Number(seconds.toFixed(3))} s`;
  if (seconds >= 1e-3) return `${Number((seconds * 1e3).toFixed(3))} ms`;
  if (seconds >= 1e-6) return `${Number((seconds * 1e6).toFixed(3))} µs`;
  return `${Number((seconds * 1e9).toFixed(3))} ns`;
}

export function calculate555(input: Timer555Input): Timer555Result {
  try {
    if (input.mode === "astable") {
      const r1 = finitePositive(input.r1K, "R1") * K_TO_OHM;
      const r2 = finitePositive(input.r2K, "R2") * K_TO_OHM;
      const c = finitePositive(input.cUf, "Capacitor C") * UF_TO_F;
      const timeHigh = Math.LN2 * (r1 + r2) * c;
      const timeLow = Math.LN2 * r2 * c;
      const period = timeHigh + timeLow;
      const frequency = 1 / period;
      const dutyPercent = (timeHigh / period) * 100;
      if (
        ![timeHigh, timeLow, period, frequency, dutyPercent].every(
          Number.isFinite,
        )
      ) {
        return {
          ok: false,
          error: "Astable timing produced a non-finite value.",
        };
      }
      return {
        ok: true,
        mode: "astable",
        frequencyHz: frequency,
        periodSeconds: period,
        timeHighSeconds: timeHigh,
        timeLowSeconds: timeLow,
        dutyPercent,
        pulseWidthSeconds: null,
        note: "Standard astable duty is always above 50%; add a diode across R2 for 50% or less.",
      };
    }
    if (input.mode === "monostable") {
      const r = finitePositive(input.rK, "Timing resistor R") * K_TO_OHM;
      const c = finitePositive(input.monoCUf, "Timing capacitor C") * UF_TO_F;
      const pulseWidth = Math.log(3) * r * c;
      if (!Number.isFinite(pulseWidth)) {
        return {
          ok: false,
          error: "Monostable timing produced a non-finite value.",
        };
      }
      return {
        ok: true,
        mode: "monostable",
        frequencyHz: null,
        periodSeconds: null,
        timeHighSeconds: null,
        timeLowSeconds: null,
        dutyPercent: null,
        pulseWidthSeconds: pulseWidth,
        note: "Pulse width uses ln(3) ≈ 1.0986, the exact 2/3 Vcc charge time.",
      };
    }
    return { ok: false, error: "Choose astable or monostable mode." };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invalid 555 parameters.",
    };
  }
}
