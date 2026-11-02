/**
 * P5b pure linear sensor scaling for 4–20 mA, 0–10 V or ADC-count ranges.
 * The v1 page extrapolated values outside the input range without any warning
 * or clamp; this module makes clamping explicit and preserves the raw value.
 */

export type SensorResult = {
  ok: true;
  rawScaled: number;
  scaled: number;
  clamped: boolean;
  slope: number;
  offset: number;
  positionPercent: number;
  note: string;
};

export type SensorError = { ok: false; error: string };

function isFiniteNumber(value: number): boolean {
  return Number.isFinite(value);
}
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function calculateSensorScaling(input: {
  inputMin: number;
  inputMax: number;
  engineeringMin: number;
  engineeringMax: number;
  inputValue: number;
  clampToRange?: boolean;
}): SensorResult | SensorError {
  const {
    inputMin,
    inputMax,
    engineeringMin,
    engineeringMax,
    inputValue,
    clampToRange = true,
  } = input;
  const values = [
    inputMin,
    inputMax,
    engineeringMin,
    engineeringMax,
    inputValue,
  ];
  if (!values.every(isFiniteNumber)) {
    return { ok: false, error: "All scaling values must be finite numbers." };
  }
  if (inputMin === inputMax) {
    return { ok: false, error: "Input minimum and maximum cannot be equal." };
  }

  const slope = (engineeringMax - engineeringMin) / (inputMax - inputMin);
  const offset = engineeringMin - slope * inputMin;
  const rawScaled = slope * inputValue + offset;
  const low = Math.min(engineeringMin, engineeringMax);
  const high = Math.max(engineeringMin, engineeringMax);
  const scaled = clampToRange ? clamp(rawScaled, low, high) : rawScaled;
  const positionPercent =
    ((inputValue - inputMin) / (inputMax - inputMin)) * 100;

  return {
    ok: true,
    rawScaled,
    scaled,
    clamped: clampToRange && scaled !== rawScaled,
    slope,
    offset,
    positionPercent,
    note: "y = m·x + b, with m = Δengineering / Δinput and b = engineeringMin − m·inputMin.",
  };
}
