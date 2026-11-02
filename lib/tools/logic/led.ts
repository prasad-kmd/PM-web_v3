/**
 * Pure LED series-resistor logic.
 *
 * v1 used `parseFloat(x) || 0` and `parseInt(n) || 1`, hid invalid input, and
 * picked the first E24 value >= the mantissa without ever rounding to a lower
 * decade. This module validates inputs, requires a real voltage margin, and
 * always selects the next-higher E12/E24 standard resistor to protect the LED.
 */

export const E12_SERIES = [
  1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2,
] as const;

export const E24_SERIES = [
  1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0, 3.3, 3.6, 3.9,
  4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1,
] as const;

export const LED_PRESETS: readonly { label: string; value: string }[] = [
  { label: "Red · 2.0 V", value: "2.0" },
  { label: "Yellow · 2.1 V", value: "2.1" },
  { label: "Green · 2.2 V", value: "2.2" },
  { label: "Blue / white · 3.2 V", value: "3.2" },
  { label: "Infrared · 1.2 V", value: "1.2" },
] as const;

const WATTAGES = [0.125, 0.25, 0.5, 1, 2, 5] as const;

export type ResistorSeries = "E12" | "E24";

export type LedInput = {
  sourceVoltage: string;
  forwardVoltage: string;
  forwardCurrentMa: string;
  ledCount: string;
  series: ResistorSeries;
};

export type LedResult =
  | {
      ok: true;
      resistance: number;
      power: number;
      recommendedPower: number;
      voltageDrop: number;
      currentA: number;
      ledCount: number;
      e12: number;
      e24: number;
      standard: { series: ResistorSeries; value: number };
      formula: string;
    }
  | { ok: false; error: string };

function finite(text: string, label: string): number {
  const value = Number(text.trim());
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }
  return value;
}

function seriesValues(series: ResistorSeries): readonly number[] {
  return series === "E12" ? E12_SERIES : E24_SERIES;
}

/** Next-higher standard value in the chosen E-series, never a lower one. */
export function nearestStandardResistor(
  ohms: number,
  series: ResistorSeries,
): number {
  if (!Number.isFinite(ohms) || ohms <= 0) return 0;
  const values = seriesValues(series);
  const exponent = Math.floor(Math.log10(ohms));
  const decade = Math.pow(10, exponent);
  const mantissa = ohms / decade;
  const match = values.find((value) => value >= mantissa - 1e-12);
  if (match !== undefined) return match * decade;
  // Past 8.2/9.1, wrap to 1.0 in the next decade.
  return values[0] * decade * 10;
}

export function recommendedWattage(power: number): number {
  if (!Number.isFinite(power) || power <= 0) return WATTAGES[0];
  const target = power * 2;
  return WATTAGES.find((wattage) => wattage >= target) ?? Math.ceil(target);
}

export function calculateLedResistor(input: LedInput): LedResult {
  try {
    const sourceVoltage = finite(input.sourceVoltage, "Source voltage");
    const forwardVoltage = finite(input.forwardVoltage, "Forward voltage");
    const forwardCurrentMa = finite(input.forwardCurrentMa, "Forward current");
    const ledCount = finite(input.ledCount, "LED count");
    const series: ResistorSeries =
      input.series === "E12" ? "E12" : input.series === "E24" ? "E24" : "E24";

    if (sourceVoltage <= 0) {
      return { ok: false, error: "Source voltage must be greater than zero." };
    }
    if (forwardVoltage <= 0) {
      return { ok: false, error: "Forward voltage must be greater than zero." };
    }
    if (forwardCurrentMa <= 0) {
      return { ok: false, error: "Forward current must be greater than zero." };
    }
    if (!Number.isInteger(ledCount) || ledCount < 1) {
      return {
        ok: false,
        error: "LED count must be a whole number of at least 1.",
      };
    }
    if (input.series !== "E12" && input.series !== "E24") {
      return { ok: false, error: "Choose the E12 or E24 resistor series." };
    }

    const currentA = forwardCurrentMa / 1000;
    const voltageDrop = forwardVoltage * ledCount;
    const margin = sourceVoltage - voltageDrop;
    if (margin <= 0) {
      return {
        ok: false,
        error: `Source voltage must exceed the total forward voltage (${voltageDrop.toFixed(2)} V for ${ledCount} LED${ledCount === 1 ? "" : "s"}).`,
      };
    }
    const resistance = margin / currentA;
    const power = margin * currentA;
    if (!Number.isFinite(resistance) || !Number.isFinite(power)) {
      return { ok: false, error: "Calculation produced a non-finite value." };
    }
    const e12 = nearestStandardResistor(resistance, "E12");
    const e24 = nearestStandardResistor(resistance, "E24");
    const standardValue = series === "E12" ? e12 : e24;
    return {
      ok: true,
      resistance,
      power,
      recommendedPower: recommendedWattage(power),
      voltageDrop,
      currentA,
      ledCount,
      e12,
      e24,
      standard: { series, value: standardValue },
      formula: "R = (Vs − N × Vf) / If",
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Invalid circuit parameters.",
    };
  }
}
