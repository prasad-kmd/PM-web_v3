/**
 * Pure unit-conversion logic for the Precision Unit Converter.
 *
 * Fixes the v1 defects: the mile factor was 1609.34 instead of 1609.344, and
 * `factor || 1` silently replaced a zero/missing factor with 1. Every linear
 * factor is now explicit and validated as a positive finite number.
 * Temperature uses an affine conversion through Celsius, not a factor.
 */

export type UnitCategory =
  "length" | "mass" | "temperature" | "pressure" | "energy" | "torque";

export type UnitDefinition = {
  value: string;
  label: string;
  /** Factor to the category's base SI unit. Null for affine temperature. */
  factor: number | null;
  kind: "linear" | "temperature";
};

export const UNIT_CATEGORIES: readonly {
  value: UnitCategory;
  label: string;
}[] = [
  { value: "length", label: "Length" },
  { value: "mass", label: "Mass" },
  { value: "temperature", label: "Temperature" },
  { value: "pressure", label: "Pressure" },
  { value: "energy", label: "Energy" },
  { value: "torque", label: "Torque" },
] as const;

const linear = (
  value: string,
  label: string,
  factor: number,
): UnitDefinition => ({ value, label, factor, kind: "linear" });

const temperature = (value: string, label: string): UnitDefinition => ({
  value,
  label,
  factor: null,
  kind: "temperature",
});

export const UNIT_DATA: Record<UnitCategory, readonly UnitDefinition[]> = {
  length: [
    linear("m", "Metres (m)", 1),
    linear("km", "Kilometres (km)", 1000),
    linear("cm", "Centimetres (cm)", 0.01),
    linear("mm", "Millimetres (mm)", 0.001),
    linear("in", "Inches (in)", 0.0254),
    linear("ft", "Feet (ft)", 0.3048),
    linear("yd", "Yards (yd)", 0.9144),
    linear("mi", "Miles (mi)", 1609.344),
  ],
  mass: [
    linear("kg", "Kilograms (kg)", 1),
    linear("g", "Grams (g)", 0.001),
    linear("mg", "Milligrams (mg)", 0.000001),
    linear("lb", "Pounds (lb)", 0.45359237),
    linear("oz", "Ounces (oz)", 0.028349523125),
  ],
  temperature: [
    temperature("c", "Celsius (°C)"),
    temperature("f", "Fahrenheit (°F)"),
    temperature("k", "Kelvin (K)"),
  ],
  pressure: [
    linear("pa", "Pascal (Pa)", 1),
    linear("kpa", "Kilopascal (kPa)", 1000),
    linear("bar", "Bar", 100000),
    linear("psi", "PSI", 6894.757293168),
    linear("atm", "Atmosphere (atm)", 101325),
  ],
  energy: [
    linear("j", "Joule (J)", 1),
    linear("kj", "Kilojoule (kJ)", 1000),
    linear("mj", "Megajoule (MJ)", 1000000),
    linear("cal", "Calories (cal)", 4.184),
    linear("kcal", "Kilocalories (kcal)", 4184),
    linear("wh", "Watt-hour (Wh)", 3600),
    linear("kwh", "Kilowatt-hour (kWh)", 3600000),
  ],
  torque: [
    linear("nm", "Newton-metre (N·m)", 1),
    linear("lbft", "Pound-foot (lb·ft)", 1.3558179483314004),
    linear("kgm", "Kilogram-metre (kg·m)", 9.80665),
  ],
} as const;

export type UnitConversionResult =
  | {
      ok: true;
      value: number;
      formatted: string;
      fromLabel: string;
      toLabel: string;
    }
  | { ok: false; error: string };

export function parseNumericInput(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

export function formatUnitValue(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (Object.is(value, -0) || value === 0) return "0";
  const magnitude = Math.abs(value);
  if (magnitude >= 1e12 || magnitude < 1e-6) {
    return value.toExponential(6).replace(/\.?0+e/, "e");
  }
  return Number(value.toPrecision(10)).toString();
}

/** Convert through a base unit; rejects non-positive or non-finite factors. */
export function convertLinear(
  value: number,
  fromFactor: number,
  toFactor: number,
): number | null {
  if (
    !Number.isFinite(value) ||
    !Number.isFinite(fromFactor) ||
    !Number.isFinite(toFactor) ||
    fromFactor <= 0 ||
    toFactor <= 0
  ) {
    return null;
  }
  const result = (value * fromFactor) / toFactor;
  return Number.isFinite(result) ? result : null;
}

function toCelsius(value: number, unit: string): number | null {
  if (unit === "c") return value;
  if (unit === "f") return ((value - 32) * 5) / 9;
  if (unit === "k") return value - 273.15;
  return null;
}

function fromCelsius(celsius: number, unit: string): number | null {
  if (unit === "c") return celsius;
  if (unit === "f") return (celsius * 9) / 5 + 32;
  if (unit === "k") return celsius + 273.15;
  return null;
}

export function convertUnit(
  category: UnitCategory,
  from: string,
  to: string,
  rawValue: string,
): UnitConversionResult {
  const input = parseNumericInput(rawValue);
  if (input === null) {
    return { ok: false, error: "Enter a finite numeric value." };
  }
  const units = UNIT_DATA[category];
  if (!units) {
    return { ok: false, error: "Unknown unit category." };
  }
  const fromUnit = units.find((unit) => unit.value === from);
  const toUnit = units.find((unit) => unit.value === to);
  if (!fromUnit || !toUnit) {
    return { ok: false, error: "Choose a unit from the selected category." };
  }
  if (fromUnit.kind === "temperature" || toUnit.kind === "temperature") {
    if (fromUnit.kind !== "temperature" || toUnit.kind !== "temperature") {
      return {
        ok: false,
        error: "Temperature units cannot mix with linear units.",
      };
    }
    const celsius = toCelsius(input, from);
    const result = celsius === null ? null : fromCelsius(celsius, to);
    if (result === null || !Number.isFinite(result)) {
      return { ok: false, error: "Temperature conversion failed." };
    }
    return {
      ok: true,
      value: result,
      formatted: formatUnitValue(result),
      fromLabel: fromUnit.label,
      toLabel: toUnit.label,
    };
  }

  const result = convertLinear(
    input,
    fromUnit.factor ?? Number.NaN,
    toUnit.factor ?? Number.NaN,
  );
  if (result === null) {
    return {
      ok: false,
      error: "Invalid conversion factor; nothing was guessed.",
    };
  }
  return {
    ok: true,
    value: result,
    formatted: formatUnitValue(result),
    fromLabel: fromUnit.label,
    toLabel: toUnit.label,
  };
}
