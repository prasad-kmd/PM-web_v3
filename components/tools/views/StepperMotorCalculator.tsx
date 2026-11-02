"use client";

import { DiscIcon, InformationCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMemo, useState } from "react";
import type { ToolViewProps } from "@/lib/tools/registry";
import {
  calculateStepperMotor,
  type StepperDrive,
} from "@/lib/tools/logic/stepper-motor";
import {
  ToolBadge,
  ToolCopyButton,
  ToolNumberField,
  ToolResultCard,
  ToolResultGrid,
  ToolSection,
  ToolSelectField,
  ToolStatus,
  ToolView,
  formatDecimal,
} from "./shared";

const DRIVE_ITEMS = [
  { value: "leadscrew", label: "Lead screw" },
  { value: "belt", label: "Belt & pulley" },
] as const;
const ANGLE_ITEMS = [
  { value: "1.8", label: "1.8° (200 full steps/rev)" },
  { value: "0.9", label: "0.9° (400 full steps/rev)" },
  { value: "7.5", label: "7.5° (48 full steps/rev)" },
] as const;
const MICROSTEP_ITEMS = ["1", "2", "4", "8", "16", "32", "64", "128"].map(
  (value) => ({ value, label: `1/${value} microstep` }),
);

export default function StepperMotorCalculator({ toolId }: ToolViewProps) {
  const [drive, setDrive] = useState<StepperDrive>("leadscrew");
  const [angle, setAngle] = useState("1.8");
  const [microstepping, setMicrostepping] = useState("16");
  const [lead, setLead] = useState("2");
  const [beltPitch, setBeltPitch] = useState("2");
  const [pulleyTeeth, setPulleyTeeth] = useState("20");

  const result = useMemo(
    () =>
      calculateStepperMotor({
        drive,
        stepAngleDegrees: Number(angle),
        microstepping: Number(microstepping),
        leadMmPerRev: Number(lead),
        beltPitchMm: Number(beltPitch),
        pulleyTeeth: Number(pulleyTeeth),
      }),
    [drive, angle, microstepping, lead, beltPitch, pulleyTeeth],
  );

  return (
    <ToolView>
      <ToolSection
        title="Stepper / CNC axis sizing"
        description="Strict motor and drive inputs replace the v1 fallback that silently turned a blank lead into 1 mm/rev."
        badge={<ToolBadge tone="neutral">Steps/mm</ToolBadge>}
        actions={
          <ToolCopyButton
            value={
              result.ok
                ? `steps/rev=${result.stepsPerRevolution}; steps/mm=${result.stepsPerMm}; mm/step=${result.mmPerStep}`
                : ""
            }
            label="Copy firmware settings"
          />
        }
      >
        <div className="tool-form-grid">
          <ToolSelectField
            label="Mechanical drive"
            items={DRIVE_ITEMS}
            value={drive}
            onValueChange={(value) => setDrive(value as StepperDrive)}
          />
          <ToolSelectField
            label="Step angle"
            items={ANGLE_ITEMS}
            value={angle}
            onValueChange={setAngle}
          />
          <ToolSelectField
            label="Microstepping"
            items={MICROSTEP_ITEMS}
            value={microstepping}
            onValueChange={setMicrostepping}
          />
          {drive === "leadscrew" ? (
            <ToolNumberField
              label="Screw lead"
              value={lead}
              onChange={setLead}
              unit="mm/rev"
              min={0}
              step="0.1"
              hint="Lead = pitch × starts, not thread pitch."
            />
          ) : (
            <>
              <ToolNumberField
                label="Belt pitch"
                value={beltPitch}
                onChange={setBeltPitch}
                unit="mm"
                min={0}
                step="0.1"
              />
              <ToolNumberField
                label="Pulley teeth"
                value={pulleyTeeth}
                onChange={setPulleyTeeth}
                unit="teeth"
                min={1}
                step="1"
              />
            </>
          )}
        </div>

        {result.ok ? (
          <>
            <ToolResultGrid className="tool-result-grid-wide">
              <ToolResultCard
                label="Steps per revolution"
                value={formatDecimal(result.stepsPerRevolution, 0)}
                unit="steps"
                detail={`${angle}° × 1/${microstepping}`}
                tone="success"
              />
              <ToolResultCard
                label="Firmware steps/mm"
                value={formatDecimal(result.stepsPerMm, 4)}
                unit="steps/mm"
                detail="M92 / rotation_distance / GRBL steps per mm"
              />
              <ToolResultCard
                label="Resolution"
                value={formatDecimal(result.mmPerStep, 6)}
                unit="mm/step"
              />
              <ToolResultCard
                label="Travel per revolution"
                value={formatDecimal(result.linearTravelPerRevolutionMm, 3)}
                unit="mm"
              />
            </ToolResultGrid>
            <ToolStatus tone="neutral">
              <HugeiconsIcon
                icon={DiscIcon}
                strokeWidth={2}
                size={14}
                aria-hidden
              />{" "}
              <span>
                {result.formula}. {result.note}
              </span>
            </ToolStatus>
            <ToolStatus tone="neutral">
              <HugeiconsIcon
                icon={InformationCircleIcon}
                strokeWidth={2}
                size={14}
                aria-hidden
              />{" "}
              <span>
                Golden case: 1.8° motor, 1/16 microstep and 2 mm lead gives
                3,200 steps/rev and 1,600 steps/mm.
              </span>
            </ToolStatus>
          </>
        ) : (
          <ToolStatus tone="error">{result.error}</ToolStatus>
        )}
        <span className="tool-hidden" aria-hidden="true">
          {toolId}
        </span>
      </ToolSection>
    </ToolView>
  );
}
