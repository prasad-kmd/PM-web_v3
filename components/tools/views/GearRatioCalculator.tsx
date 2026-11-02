"use client";

import { CogIcon, InformationCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMemo, useState } from "react";
import type { ToolViewProps } from "@/lib/tools/registry";
import { calculateGearRatio } from "@/lib/tools/logic/gear-ratio";
import {
  ToolBadge,
  ToolCopyButton,
  ToolNumberField,
  ToolResultCard,
  ToolResultGrid,
  ToolSection,
  ToolStatus,
  ToolView,
  formatDecimal,
} from "./shared";

export default function GearRatioCalculator({ toolId }: ToolViewProps) {
  const [driver, setDriver] = useState("12");
  const [driven, setDriven] = useState("36");
  const [speed, setSpeed] = useState("1500");
  const [torque, setTorque] = useState("5");
  const [efficiency, setEfficiency] = useState("100");

  const result = useMemo(
    () =>
      calculateGearRatio({
        driverTeeth: Number(driver),
        drivenTeeth: Number(driven),
        inputSpeedRpm: Number(speed),
        inputTorqueNm: Number(torque),
        efficiencyPercent: Number(efficiency),
      }),
    [driver, driven, speed, torque, efficiency],
  );

  return (
    <ToolView>
      <ToolSection
        title="Single-stage ratio"
        description="A reduction divides speed and multiplies torque. The v1 help formula divided torque; that direction is corrected here and efficiency is explicit."
        badge={<ToolBadge tone="neutral">Direction fixed</ToolBadge>}
        actions={
          <ToolCopyButton
            value={
              result.ok
                ? `ratio=${result.ratio}; speed=${result.speedOutRpm} rpm; torque=${result.torqueOutNm} N·m`
                : ""
            }
            label="Copy drivetrain summary"
          />
        }
      >
        <div className="tool-form-grid">
          <ToolNumberField
            label="Driver teeth N1"
            value={driver}
            onChange={setDriver}
            unit="teeth"
            min={1}
            step="1"
          />
          <ToolNumberField
            label="Driven teeth N2"
            value={driven}
            onChange={setDriven}
            unit="teeth"
            min={1}
            step="1"
          />
          <ToolNumberField
            label="Input speed"
            value={speed}
            onChange={setSpeed}
            unit="rpm"
            min={0}
            step="1"
          />
          <ToolNumberField
            label="Input torque"
            value={torque}
            onChange={setTorque}
            unit="N·m"
            min={0}
            step="0.1"
          />
          <ToolNumberField
            label="Drivetrain efficiency"
            value={efficiency}
            onChange={setEfficiency}
            unit="%"
            min={0}
            max={100}
            step="1"
            hint="100% is the ideal lossless case."
          />
        </div>

        {result.ok ? (
          <>
            <ToolResultGrid className="tool-result-grid-wide">
              <ToolResultCard
                label="Ratio"
                value={formatDecimal(result.ratio, 3)}
                unit=": 1"
                detail={result.direction}
                tone="success"
              />
              <ToolResultCard
                label="Output speed"
                value={formatDecimal(result.speedOutRpm, 2)}
                unit="rpm"
                detail="Input speed ÷ ratio"
              />
              <ToolResultCard
                label="Output torque"
                value={formatDecimal(result.torqueOutNm, 3)}
                unit="N·m"
                detail="Input torque × ratio × efficiency"
              />
              <ToolResultCard
                label="Power out"
                value={formatDecimal(result.powerOutW, 1)}
                unit="W"
                detail={`From ${formatDecimal(result.powerInW, 1)} W input`}
              />
            </ToolResultGrid>
            <ToolStatus tone="neutral">
              <HugeiconsIcon
                icon={CogIcon}
                strokeWidth={2}
                size={14}
                aria-hidden
              />{" "}
              <span>{result.note}</span>
            </ToolStatus>
            <ToolStatus tone="neutral">
              <HugeiconsIcon
                icon={InformationCircleIcon}
                strokeWidth={2}
                size={14}
                aria-hidden
              />{" "}
              <span>
                Output rotation reverses for an external gear pair; belt and
                chain drives preserve direction.
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
