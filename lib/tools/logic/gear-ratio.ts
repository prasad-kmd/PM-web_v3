/**
 * P5a pure single-stage gear / belt / chain ratio maths.
 * The v1 help text showed τout = τin / ratio while the code used τin × ratio.
 * The code was correct for an ideal reduction; this module makes the direction
 * explicit and adds an efficiency factor. Speed is independent of efficiency.
 */

export type GearResult = {
  ok: true;
  ratio: number;
  speedOutRpm: number;
  torqueOutNm: number;
  powerInW: number;
  powerOutW: number;
  direction: "reduction" | "direct" | "overdrive";
  note: string;
};

export type GearError = { ok: false; error: string };

function isPositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function isNonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

export function calculateGearRatio(input: {
  driverTeeth: number;
  drivenTeeth: number;
  inputSpeedRpm: number;
  inputTorqueNm: number;
  efficiencyPercent?: number;
}): GearResult | GearError {
  const {
    driverTeeth,
    drivenTeeth,
    inputSpeedRpm,
    inputTorqueNm,
    efficiencyPercent = 100,
  } = input;
  if (
    !isPositive(driverTeeth) ||
    !isPositive(drivenTeeth) ||
    !Number.isInteger(driverTeeth) ||
    !Number.isInteger(drivenTeeth)
  ) {
    return { ok: false, error: "Tooth counts must be positive integers." };
  }
  if (!isNonNegative(inputSpeedRpm) || !isNonNegative(inputTorqueNm)) {
    return { ok: false, error: "Speed and torque must be non-negative." };
  }
  if (
    !Number.isFinite(efficiencyPercent) ||
    efficiencyPercent <= 0 ||
    efficiencyPercent > 100
  ) {
    return { ok: false, error: "Efficiency must be 0–100%." };
  }

  const eta = efficiencyPercent / 100;
  const ratio = drivenTeeth / driverTeeth;
  const speedOutRpm = inputSpeedRpm / ratio;
  const torqueOutNm = inputTorqueNm * ratio * eta;
  const powerInW = (inputTorqueNm * inputSpeedRpm * 2 * Math.PI) / 60;
  const powerOutW = powerInW * eta;

  return {
    ok: true,
    ratio,
    speedOutRpm,
    torqueOutNm,
    powerInW,
    powerOutW,
    direction: ratio > 1 ? "reduction" : ratio < 1 ? "overdrive" : "direct",
    note: "Ideal teeth ratio; output torque is multiplied by ratio × efficiency.",
  };
}
