/**
 * Pure voltage-divider design logic.
 *
 * v1 hid zero/invalid input with `parseFloat(x) || 0`, defaulted a zero target
 * current to 1 mA, searched only the nearest ±1 standard values, and then
 * computed power from formatted strings like "1.60 kΩ" (parseFloat → 1.6).
 * This module validates everything, searches the full E12/E24 grid, and keeps
 * numeric resistance for power and tolerance analysis.
 */

import { E12_SERIES, E24_SERIES, type ResistorSeries } from "./led";

export type VoltageDividerInput = {
  vin: string;
  vout: string;
  currentMa: string;
  series: ResistorSeries;
  tolerancePercent: string;
};

export type VoltageDividerResult =
  | {
      ok: true;
      vin: number;
      targetVout: number;
      targetCurrentA: number;
      idealRtotal: number;
      idealR1: number;
      idealR2: number;
      r1: number;
      r2: number;
      series: ResistorSeries;
      actualVout: number;
      voltageErrorPercent: number;
      actualCurrentMa: number;
      power: {
        r1Watts: number;
        r2Watts: number;
        totalWatts: number;
      };
      tolerance: {
        percent: number;
        minVout: number;
        maxVout: number;
      };
      candidatesChecked: number;
      score: number;
      note: string;
    }
  | { ok: false; error: string };

const DECADES = [1, 10, 100, 1000, 10000, 100000, 1000000] as const;

function standardValues(series: ResistorSeries): number[] {
  const base = series === "E12" ? E12_SERIES : E24_SERIES;
  const values: number[] = [];
  for (const decade of DECADES) {
    for (const mantissa of base) values.push(mantissa * decade);
  }
  return values;
}

function finitePositive(text: string, label: string): number {
  const value = Number(text.trim());
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive finite number.`);
  }
  return value;
}

function finiteNonNegative(text: string, label: string): number {
  const value = Number(text.trim());
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a non-negative finite number.`);
  }
  return value;
}

export function calculateVoltageDivider(
  input: VoltageDividerInput,
): VoltageDividerResult {
  try {
    const vin = finitePositive(input.vin, "Input voltage");
    const targetVout = finitePositive(input.vout, "Target output voltage");
    const targetCurrentA =
      finitePositive(input.currentMa, "Target current") / 1000;
    const tolerancePercent = finiteNonNegative(
      input.tolerancePercent,
      "Resistor tolerance",
    );
    if (tolerancePercent >= 100) {
      return { ok: false, error: "Resistor tolerance must be below 100%." };
    }
    if (targetVout >= vin) {
      return {
        ok: false,
        error: "Target output must be lower than the input voltage.",
      };
    }
    if (input.series !== "E12" && input.series !== "E24") {
      return { ok: false, error: "Choose the E12 or E24 resistor series." };
    }

    const idealRtotal = vin / targetCurrentA;
    const idealR2 = (targetVout * idealRtotal) / vin;
    const idealR1 = idealRtotal - idealR2;
    const values = standardValues(input.series);
    const tol = tolerancePercent / 100;

    let best = {
      r1: values[0],
      r2: values[0],
      actualVout: 0,
      voltageError: Number.POSITIVE_INFINITY,
      currentError: Number.POSITIVE_INFINITY,
      score: Number.POSITIVE_INFINITY,
    };
    let candidatesChecked = 0;
    for (const r1 of values) {
      for (const r2 of values) {
        candidatesChecked += 1;
        const actualVout = vin * (r2 / (r1 + r2));
        const actualCurrentA = vin / (r1 + r2);
        const voltageError = Math.abs(actualVout - targetVout);
        const currentError = Math.abs(actualCurrentA - targetCurrentA);
        const score = voltageError / targetVout + currentError / targetCurrentA;
        if (
          score < best.score - 1e-12 ||
          (Math.abs(score - best.score) <= 1e-12 &&
            voltageError < best.voltageError)
        ) {
          best = {
            r1,
            r2,
            actualVout,
            voltageError,
            currentError,
            score,
          };
        }
      }
    }

    const { r1, r2, actualVout } = best;
    const actualCurrentA = vin / (r1 + r2);
    const voltageErrorPercent =
      (Math.abs(actualVout - targetVout) / targetVout) * 100;
    const power = {
      r1Watts: (vin - actualVout) ** 2 / r1,
      r2Watts: actualVout ** 2 / r2,
      totalWatts: vin ** 2 / (r1 + r2),
    };
    const minVout =
      (vin * (r2 * (1 - tol))) / (r1 * (1 + tol) + r2 * (1 - tol));
    const maxVout =
      (vin * (r2 * (1 + tol))) / (r1 * (1 - tol) + r2 * (1 + tol));

    if (
      ![
        idealRtotal,
        idealR1,
        idealR2,
        actualVout,
        voltageErrorPercent,
        power.totalWatts,
        minVout,
        maxVout,
      ].every(Number.isFinite)
    ) {
      return { ok: false, error: "Design produced a non-finite value." };
    }

    return {
      ok: true,
      vin,
      targetVout,
      targetCurrentA,
      idealRtotal,
      idealR1,
      idealR2,
      r1,
      r2,
      series: input.series,
      actualVout,
      voltageErrorPercent,
      actualCurrentMa: actualCurrentA * 1000,
      power,
      tolerance: {
        percent: tolerancePercent,
        minVout,
        maxVout,
      },
      candidatesChecked,
      score: best.score,
      note: "Full E-series grid searched, balancing relative output-voltage and divider-current error; ties prefer the closer voltage match.",
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Invalid divider parameters.",
    };
  }
}
