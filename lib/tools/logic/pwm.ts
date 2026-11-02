/**
 * Pure PWM-to-voltage logic.
 *
 * v1 used `parseFloat(x) || 0`, which hid invalid input and a zero peak as a
 * silent zero result. This module validates every input, bounds the duty cycle,
 * and reports impossible target voltages explicitly.
 */

export type PwmInput = {
  peakVoltage: string;
  dutyCycle: string | number;
  targetVoltage: string;
};

export type PwmResult =
  | {
      ok: true;
      peakVoltage: number;
      dutyCycle: number;
      averageVoltage: number;
      targetVoltage: number;
      requiredDuty: number;
      dutyPossible: boolean;
      register8: number;
      register10: number;
      note: string;
    }
  | { ok: false; error: string };

function finite(text: string | number, label: string): number {
  const value = typeof text === "number" ? text : Number(text.trim());
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }
  return value;
}

export function calculatePwm(input: PwmInput): PwmResult {
  try {
    const peakVoltage = finite(input.peakVoltage, "Peak voltage");
    const dutyCycle = finite(input.dutyCycle, "Duty cycle");
    const targetVoltage = finite(input.targetVoltage, "Target voltage");
    if (peakVoltage <= 0) {
      return { ok: false, error: "Peak voltage must be greater than zero." };
    }
    if (dutyCycle < 0 || dutyCycle > 100) {
      return {
        ok: false,
        error: "Duty cycle must be between 0% and 100%.",
      };
    }
    const averageVoltage = (peakVoltage * dutyCycle) / 100;
    const requiredDuty = (targetVoltage / peakVoltage) * 100;
    const dutyPossible = requiredDuty >= 0 && requiredDuty <= 100;
    const register8 = Math.round((dutyCycle / 100) * 255);
    const register10 = Math.round((dutyCycle / 100) * 1023);
    return {
      ok: true,
      peakVoltage,
      dutyCycle,
      averageVoltage,
      targetVoltage,
      requiredDuty,
      dutyPossible,
      register8,
      register10,
      note: "Assumes an ideal low-pass filter; a raw PWM pin remains a switching waveform.",
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invalid PWM parameters.",
    };
  }
}
