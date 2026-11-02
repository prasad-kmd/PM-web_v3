"use client";

import { ActivityIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMemo, useState } from "react";
import type { ToolViewProps } from "@/lib/tools/registry";
import { calculatePwm } from "@/lib/tools/logic/pwm";
import {
  ToolCopyButton,
  ToolNumberField,
  ToolOption,
  ToolResultCard,
  ToolResultGrid,
  ToolSection,
  ToolStatus,
  ToolView,
  ToolBadge,
  formatDecimal,
} from "./shared";

export default function PwmVoltageConverter({ toolId }: ToolViewProps) {
  const [peakVoltage, setPeakVoltage] = useState("5");
  const [dutyCycle, setDutyCycle] = useState("50");
  const [targetVoltage, setTargetVoltage] = useState("2.5");

  const result = useMemo(
    () =>
      calculatePwm({
        peakVoltage,
        dutyCycle,
        targetVoltage,
      }),
    [peakVoltage, dutyCycle, targetVoltage],
  );

  return (
    <ToolView>
      <ToolSection
        title="PWM parameters"
        description="Average voltage is proportional to duty cycle. Invalid duty and peak values are reported, not silently zeroed."
        actions={
          <ToolCopyButton
            value={result.ok ? formatDecimal(result.averageVoltage, 3) : ""}
            label="Copy average voltage"
          />
        }
      >
        <div className="tool-form-grid">
          <ToolNumberField
            label="Peak voltage"
            value={peakVoltage}
            onChange={setPeakVoltage}
            unit="V"
            hint="Logic-high voltage; must be greater than zero."
          />
          <ToolNumberField
            label="Duty cycle"
            value={dutyCycle}
            onChange={setDutyCycle}
            unit="%"
            min={0}
            max={100}
            step="0.1"
            hint="Between 0% and 100%."
          />
          <ToolNumberField
            label="Target voltage"
            value={targetVoltage}
            onChange={setTargetVoltage}
            unit="V"
            hint="Find the duty needed to reach this average."
          />
        </div>

        {result.ok ? (
          <>
            <ToolResultGrid className="tool-result-grid-wide">
              <ToolResultCard
                label="Average voltage"
                value={formatDecimal(result.averageVoltage, 3)}
                unit="V"
                detail={`${formatDecimal(result.dutyCycle, 1)}% of ${formatDecimal(result.peakVoltage, 2)} V`}
                tone="success"
              />
              <ToolResultCard
                label="Required duty"
                value={
                  result.dutyPossible
                    ? formatDecimal(result.requiredDuty, 2)
                    : "Impossible"
                }
                unit={result.dutyPossible ? "%" : undefined}
                detail={
                  result.dutyPossible
                    ? `For ${formatDecimal(result.targetVoltage, 2)} V`
                    : "Target is outside 0–100% duty"
                }
                tone={result.dutyPossible ? "neutral" : "warning"}
              />
              <ToolResultCard
                label="8-bit register"
                value={String(result.register8)}
                unit="/ 255"
              />
              <ToolResultCard
                label="10-bit register"
                value={String(result.register10)}
                unit="/ 1023"
              />
            </ToolResultGrid>
            <ToolOption label="Output model" hint={result.note}>
              <ToolBadge tone="neutral">Ideal filter</ToolBadge>
            </ToolOption>
            <ToolStatus tone="neutral">
              <HugeiconsIcon
                icon={ActivityIcon}
                strokeWidth={2}
                size={14}
                aria-hidden
              />{" "}
              <span>
                Register values are rounded to the nearest integer for the
                selected resolution.
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
