/**
 * P5b pure PID step-response simulation for the merged simulator/tuner tool.
 * The v1 simulator used an unbounded explicit Euler loop; the v1 tuner used a
 * a timer-based loop with the same maths, integral windup and no reduced-motion plan.
 * This module uses a bounded semi-implicit step, derivative on measurement,
 * conditional-integration anti-windup, output clamping and divergence guards.
 * References: integral-windup / anti-windup and conditional-integration notes.
 */

export type PidMode = "simulator" | "tuner";

export type PidSample = {
  timeSeconds: number;
  value: number;
  setpoint: number;
  control: number;
};

export type PidResult = {
  ok: true;
  mode: PidMode;
  samples: readonly PidSample[];
  finalValue: number;
  finalError: number;
  maxValue: number;
  overshootPercent: number;
  settlingTimeSeconds: number | null;
  antiWindupActivations: number;
  diverged: boolean;
  note: string;
};

export type PidError = { ok: false; error: string };

const DEFAULTS = {
  dtSeconds: 0.05,
  steps: 200,
  outputLimit: 20,
  integralLimit: 50,
  mass: 1,
  damping: 0.5,
  spring: 0.5,
} as const;

function isNonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function simulatePid(input: {
  mode?: PidMode;
  kp: number;
  ki: number;
  kd: number;
  setpoint: number;
  dtSeconds?: number;
  steps?: number;
  outputLimit?: number;
}): PidResult | PidError {
  const {
    mode = "simulator",
    kp,
    ki,
    kd,
    setpoint,
    dtSeconds = DEFAULTS.dtSeconds,
    steps = DEFAULTS.steps,
    outputLimit = DEFAULTS.outputLimit,
  } = input;
  if (![kp, ki, kd].every(isNonNegative)) {
    return { ok: false, error: "Kp, Ki and Kd must be non-negative." };
  }
  if (!Number.isFinite(setpoint)) {
    return { ok: false, error: "Setpoint must be a finite number." };
  }
  if (!Number.isFinite(dtSeconds) || dtSeconds <= 0 || dtSeconds > 0.5) {
    return { ok: false, error: "dt must be 0–0.5 s." };
  }
  if (!Number.isInteger(steps) || steps < 10 || steps > 500) {
    return { ok: false, error: "Steps must be an integer from 10 to 500." };
  }
  if (!Number.isFinite(outputLimit) || outputLimit <= 0) {
    return { ok: false, error: "Output limit must be positive." };
  }

  let position = 0;
  let velocity = 0;
  let integral = 0;
  let previousMeasurement = 0;
  let antiWindupActivations = 0;
  let diverged = false;
  const samples: PidSample[] = [];

  for (let step = 0; step < steps; step += 1) {
    const error = setpoint - position;
    const derivative = -kd * ((position - previousMeasurement) / dtSeconds);
    const candidateIntegral = clamp(
      integral + error * dtSeconds,
      -DEFAULTS.integralLimit,
      DEFAULTS.integralLimit,
    );
    const candidateOutput = kp * error + ki * candidateIntegral + derivative;
    const saturatingUp = candidateOutput > outputLimit && error > 0;
    const saturatingDown = candidateOutput < -outputLimit && error < 0;
    if (saturatingUp || saturatingDown) {
      antiWindupActivations += 1;
    } else {
      integral = candidateIntegral;
    }
    const control = clamp(
      kp * error + ki * integral + derivative,
      -outputLimit,
      outputLimit,
    );
    const acceleration =
      (control - DEFAULTS.damping * velocity - DEFAULTS.spring * position) /
      DEFAULTS.mass;
    velocity += acceleration * dtSeconds;
    position += velocity * dtSeconds;
    previousMeasurement = position;

    if (!Number.isFinite(position) || Math.abs(position) > 1e6) {
      diverged = true;
      break;
    }
    samples.push({
      timeSeconds: (step + 1) * dtSeconds,
      value: position,
      setpoint,
      control,
    });
  }

  const values = samples.map((sample) => sample.value);
  const maxValue = values.length ? Math.max(...values) : 0;
  const overshootPercent =
    setpoint > 0 ? Math.max(0, ((maxValue - setpoint) / setpoint) * 100) : 0;
  const tolerance = Math.max(0.02 * Math.abs(setpoint), 0.001);
  let settlingTimeSeconds: number | null = null;
  for (let i = 0; i < samples.length; i += 1) {
    if (
      samples
        .slice(i)
        .every((sample) => Math.abs(sample.value - setpoint) <= tolerance)
    ) {
      settlingTimeSeconds = samples[i].timeSeconds;
      break;
    }
  }

  return {
    ok: true,
    mode,
    samples,
    finalValue: samples.length ? samples[samples.length - 1].value : 0,
    finalError:
      setpoint - (samples.length ? samples[samples.length - 1].value : 0),
    maxValue,
    overshootPercent,
    settlingTimeSeconds,
    antiWindupActivations,
    diverged,
    note: "Bounded semi-implicit Euler, derivative on measurement, conditional integration, output clamping and divergence guard. No timer-based loop.",
  };
}
