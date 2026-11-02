/**
 * P5b pure battery runtime estimation.
 * Peukert's law in its rated-hour form: t = H · (C / (I · H))^k.
 * C must be the capacity at the rated H-hour discharge, I is in amperes and k
 * is dimensionless. When k = 1 this collapses to t = C / I. Efficiency and the
 * reserve margin are explicit so their assumptions cannot be hidden.
 * Reference: Peukert's law, Wikipedia and battery-runtime references.
 */

export type BatteryResult = {
  ok: true;
  theoreticalHours: number;
  usableHours: number;
  formatted: string;
  days: number;
  effectiveCapacityAh: number;
  ratedHours: number;
  efficiencyPercent: number;
  reservePercent: number;
  method: "ideal" | "peukert";
  note: string;
};

export type BatteryError = { ok: false; error: string };

function isPositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}
function isPercent(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 100;
}

export function calculateBatteryLife(input: {
  capacityMah: number;
  loadMa: number;
  reservePercent?: number;
  usePeukert?: boolean;
  peukertExponent?: number;
  ratedHours?: number;
  efficiencyPercent?: number;
}): BatteryResult | BatteryError {
  const {
    capacityMah,
    loadMa,
    reservePercent = 0,
    usePeukert = false,
    peukertExponent = 1,
    ratedHours = 20,
    efficiencyPercent = 100,
  } = input;
  if (!isPositive(capacityMah) || !isPositive(loadMa)) {
    return { ok: false, error: "Capacity and load current must be positive." };
  }
  if (!isPercent(reservePercent) || !isPercent(efficiencyPercent)) {
    return { ok: false, error: "Reserve and efficiency must be 0–100%." };
  }
  if (efficiencyPercent === 0) {
    return { ok: false, error: "Efficiency must be greater than 0%." };
  }
  if (!isPositive(ratedHours)) {
    return { ok: false, error: "Rated discharge time must be positive." };
  }
  if (
    !Number.isFinite(peukertExponent) ||
    peukertExponent < 1 ||
    peukertExponent > 2
  ) {
    return { ok: false, error: "Peukert exponent must be between 1 and 2." };
  }

  const capacityAh = capacityMah / 1000;
  const loadA = loadMa / 1000;
  const eta = efficiencyPercent / 100;
  const reserve = reservePercent / 100;
  let theoreticalHours: number;
  let method: BatteryResult["method"];
  if (usePeukert) {
    theoreticalHours =
      ratedHours * (capacityAh / (loadA * ratedHours)) ** peukertExponent;
    method = "peukert";
  } else {
    theoreticalHours = capacityAh / loadA;
    method = "ideal";
  }
  const usableHours = theoreticalHours * eta * (1 - reserve);
  const totalMinutes = Math.max(0, Math.round(usableHours * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const effectiveCapacityAh = theoreticalHours * loadA;

  return {
    ok: true,
    theoreticalHours,
    usableHours,
    formatted: `${hours}h ${minutes}m`,
    days: usableHours / 24,
    effectiveCapacityAh,
    ratedHours,
    efficiencyPercent,
    reservePercent,
    method,
    note: "Peukert is meaningful only away from the rated discharge rate; verify chemistry, temperature and ageing with the datasheet.",
  };
}
