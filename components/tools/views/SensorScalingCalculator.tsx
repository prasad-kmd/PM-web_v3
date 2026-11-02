"use client";

import {
  InformationCircleIcon,
  PulseIcon,
  ScaleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMemo, useState } from "react";
import type { ToolViewProps } from "@/lib/tools/registry";
import { calculateSensorScaling } from "@/lib/tools/logic/sensor-scaling";
import {
  ToolBadge,
  ToolCheckboxField,
  ToolNumberField,
  ToolResultCard,
  ToolResultGrid,
  ToolSection,
  ToolStatus,
  ToolView,
  formatDecimal,
} from "./shared";

export default function SensorScalingCalculator({ toolId }: ToolViewProps) {
  const [inMin, setInMin] = useState("4");
  const [inMax, setInMax] = useState("20");
  const [outMin, setOutMin] = useState("0");
  const [outMax, setOutMax] = useState("100");
  const [inputValue, setInputValue] = useState("12");
  const [clampToRange, setClampToRange] = useState(true);

  const result = useMemo(
    () =>
      calculateSensorScaling({
        inputMin: Number(inMin),
        inputMax: Number(inMax),
        engineeringMin: Number(outMin),
        engineeringMax: Number(outMax),
        inputValue: Number(inputValue),
        clampToRange,
      }),
    [inMin, inMax, outMin, outMax, inputValue, clampToRange],
  );

  return (
    <ToolView>
      <ToolSection
        title="Analog sensor scaling"
        description="4–20 mA / 0–10 V / ADC ranges mapped to engineering units, with explicit out-of-range clamping."
        badge={<ToolBadge tone="neutral">Linear map</ToolBadge>}
      >
        <div className="tool-form-grid">
          <ToolNumberField
            label="Input minimum"
            value={inMin}
            onChange={setInMin}
            unit="mA / V / counts"
            step="0.1"
          />
          <ToolNumberField
            label="Input maximum"
            value={inMax}
            onChange={setInMax}
            unit="mA / V / counts"
            step="0.1"
          />
          <ToolNumberField
            label="Engineering minimum"
            value={outMin}
            onChange={setOutMin}
            unit="units"
            step="0.1"
          />
          <ToolNumberField
            label="Engineering maximum"
            value={outMax}
            onChange={setOutMax}
            unit="units"
            step="0.1"
          />
          <ToolNumberField
            label="Test input"
            value={inputValue}
            onChange={setInputValue}
            unit="input"
            step="0.1"
          />
          <ToolCheckboxField
            label="Clamp out-of-range inputs"
            hint="Report the raw extrapolated value too."
            checked={clampToRange}
            onChange={setClampToRange}
          />
        </div>

        {result.ok ? (
          <>
            <ToolResultGrid className="tool-result-grid-wide">
              <ToolResultCard
                label="Scaled value"
                value={formatDecimal(result.scaled, 4)}
                unit="units"
                detail={
                  result.clamped
                    ? "Clamped to engineering range"
                    : "Inside range"
                }
                tone={result.clamped ? "warning" : "success"}
              />
              <ToolResultCard
                label="Raw extrapolated value"
                value={formatDecimal(result.rawScaled, 4)}
                unit="units"
              />
              <ToolResultCard
                label="Slope m"
                value={formatDecimal(result.slope, 4)}
                unit="units/input"
              />
              <ToolResultCard
                label="Offset b"
                value={formatDecimal(result.offset, 4)}
                unit="units"
              />
            </ToolResultGrid>
            <ToolStatus tone="neutral">
              <HugeiconsIcon
                icon={ScaleIcon}
                strokeWidth={2}
                size={14}
                aria-hidden
              />{" "}
              <span>{result.note}</span>
            </ToolStatus>
            <ToolStatus tone="neutral">
              <HugeiconsIcon
                icon={PulseIcon}
                strokeWidth={2}
                size={14}
                aria-hidden
              />{" "}
              <span>
                Golden 4–20 mA → 0–100 bar: 12 mA gives 50 bar; 2 mA clamps to 0
                and 22 mA clamps to 100.
              </span>
            </ToolStatus>
          </>
        ) : (
          <ToolStatus tone="error">{result.error}</ToolStatus>
        )}
        <ToolStatus tone="warning">
          <HugeiconsIcon
            icon={InformationCircleIcon}
            strokeWidth={2}
            size={14}
            aria-hidden
          />{" "}
          <span>
            Input equal to the minimum or maximum cannot define a slope; zero
            values are valid and are not replaced by a fallback.
          </span>
        </ToolStatus>
        <span className="tool-hidden" aria-hidden="true">
          {toolId}
        </span>
      </ToolSection>
    </ToolView>
  );
}
