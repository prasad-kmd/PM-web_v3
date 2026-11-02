/**
 * P5b pure stepper / lead-screw / belt-drive maths.
 * The v1 page used loose numeric parsing with fallback defaults, so a blank lead became 1 mm/rev
 * and a blank microstep silently became 1. This module validates every input.
 */

export type StepperDrive = "leadscrew" | "belt";

export type StepperResult = {
  ok: true;
  drive: StepperDrive;
  stepsPerRevolution: number;
  stepsPerMm: number;
  mmPerStep: number;
  linearTravelPerRevolutionMm: number;
  formula: string;
  note: string;
};

export type StepperError = { ok: false; error: string };

function isPositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}
function isPositiveInteger(value: number): boolean {
  return isPositive(value) && Number.isInteger(value);
}

export function calculateStepperMotor(input: {
  drive: StepperDrive;
  stepAngleDegrees: number;
  microstepping: number;
  leadMmPerRev?: number;
  beltPitchMm?: number;
  pulleyTeeth?: number;
}): StepperResult | StepperError {
  const {
    drive,
    stepAngleDegrees,
    microstepping,
    leadMmPerRev,
    beltPitchMm,
    pulleyTeeth,
  } = input;
  if (!isPositive(stepAngleDegrees)) {
    return { ok: false, error: "Step angle must be a positive number." };
  }
  if (!isPositiveInteger(microstepping)) {
    return { ok: false, error: "Microstepping must be a positive integer." };
  }
  if (drive !== "leadscrew" && drive !== "belt") {
    return { ok: false, error: "Choose a lead screw or belt drive." };
  }

  const stepsPerRevolution = (360 / stepAngleDegrees) * microstepping;
  let linearTravelPerRevolutionMm: number;
  let formula: string;
  let note: string;
  if (drive === "leadscrew") {
    if (!isPositive(leadMmPerRev ?? NaN)) {
      return { ok: false, error: "Screw lead must be a positive number." };
    }
    linearTravelPerRevolutionMm = leadMmPerRev!;
    formula = "steps/mm = (360 / θ) × microsteps / lead";
    note =
      "Lead = pitch × starts; use lead, not pitch, for multi-start screws.";
  } else {
    if (
      !isPositive(beltPitchMm ?? NaN) ||
      !isPositiveInteger(pulleyTeeth ?? NaN)
    ) {
      return {
        ok: false,
        error: "Belt pitch and positive integer pulley teeth are required.",
      };
    }
    linearTravelPerRevolutionMm = beltPitchMm! * pulleyTeeth!;
    formula = "steps/mm = (360 / θ) × microsteps / (belt pitch × teeth)";
    note = "Belt circumference per revolution is belt pitch × pulley teeth.";
  }

  const stepsPerMm = stepsPerRevolution / linearTravelPerRevolutionMm;
  return {
    ok: true,
    drive,
    stepsPerRevolution,
    stepsPerMm,
    mmPerStep: 1 / stepsPerMm,
    linearTravelPerRevolutionMm,
    formula,
    note,
  };
}
