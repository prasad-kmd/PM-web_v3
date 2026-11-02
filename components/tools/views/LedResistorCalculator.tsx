"use client";

import { LightbulbIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMemo, useState } from "react";
import type { ToolViewProps } from "@/lib/tools/registry";
import {
  LED_PRESETS,
  calculateLedResistor,
  type ResistorSeries,
} from "@/lib/tools/logic/led";
import {
  ToolCopyButton,
  ToolNumberField,
  ToolOption,
  ToolResultCard,
  ToolResultGrid,
  ToolSection,
  ToolSelectField,
  ToolStatus,
  ToolView,
  ToolBadge,
  formatDecimal,
} from "./shared";

const PRESET_ITEMS = [
  { value: "custom", label: "Custom forward voltage" },
  ...LED_PRESETS.map((entry) => ({
    value: entry.value,
    label: entry.label,
  })),
];

const SERIES_ITEMS = [
  { value: "E12", label: "E12 · 12 values per decade" },
  { value: "E24", label: "E24 · 24 values per decade" },
];

export default function LedResistorCalculator({ toolId }: ToolViewProps) {
  const [sourceVoltage, setSourceVoltage] = useState("5");
  const [forwardVoltage, setForwardVoltage] = useState("2.0");
  const [preset, setPreset] = useState("2.0");
  const [forwardCurrentMa, setForwardCurrentMa] = useState("20");
  const [ledCount, setLedCount] = useState("1");
  const [series, setSeries] = useState<ResistorSeries>("E24");

  const result = useMemo(
    () =>
      calculateLedResistor({
        sourceVoltage,
        forwardVoltage,
        forwardCurrentMa,
        ledCount,
        series,
      }),
    [sourceVoltage, forwardVoltage, forwardCurrentMa, ledCount, series],
  );

  const handlePreset = (next: string) => {
    setPreset(next);
    if (next !== "custom") setForwardVoltage(next);
  };

  const handleForwardVoltage = (next: string) => {
    setForwardVoltage(next);
    setPreset("custom");
  };

  return (
    <ToolView>
      <ToolSection
        title="Circuit parameters"
        description="Ohm's law for LEDs in series. The suggested standard resistor is always the next-higher E-series value."
        actions={
          <ToolCopyButton
            value={result.ok ? formatDecimal(result.resistance, 2) : ""}
            label="Copy resistance"
          />
        }
      >
        <div className="tool-form-grid">
          <ToolNumberField
            label="Source voltage"
            value={sourceVoltage}
            onChange={setSourceVoltage}
            unit="V"
          />
          <ToolNumberField
            label="Forward voltage"
            value={forwardVoltage}
            onChange={handleForwardVoltage}
            unit="V"
            hint="Voltage drop per LED."
          />
          <ToolSelectField
            label="LED preset"
            items={PRESET_ITEMS}
            value={preset}
            onValueChange={handlePreset}
          />
          <ToolNumberField
            label="Forward current"
            value={forwardCurrentMa}
            onChange={setForwardCurrentMa}
            unit="mA"
          />
          <ToolNumberField
            label="LEDs in series"
            value={ledCount}
            onChange={setLedCount}
            min={1}
            step={1}
          />
          <ToolSelectField
            label="Resistor series"
            items={SERIES_ITEMS}
            value={series}
            onValueChange={(next) => setSeries(next as ResistorSeries)}
          />
        </div>

        {result.ok ? (
          <>
            <ToolResultGrid className="tool-result-grid-wide">
              <ToolResultCard
                label="Required resistance"
                value={formatDecimal(result.resistance, 2)}
                unit="Ω"
                detail={result.formula}
                tone="success"
              />
              <ToolResultCard
                label={`Standard ${result.standard.series}`}
                value={formatDecimal(result.standard.value, 2)}
                unit="Ω"
                detail="Next-higher preferred value"
              />
              <ToolResultCard
                label="Resistor power"
                value={formatDecimal(result.power, 3)}
                unit="W"
              />
              <ToolResultCard
                label="Recommended rating"
                value={formatDecimal(result.recommendedPower, 3)}
                unit="W"
                detail="At least 2× dissipation"
                tone="warning"
              />
              <ToolResultCard
                label="Total LED drop"
                value={formatDecimal(result.voltageDrop, 2)}
                unit="V"
              />
              <ToolResultCard
                label="Current"
                value={formatDecimal(result.currentA * 1000, 1)}
                unit="mA"
              />
            </ToolResultGrid>
            <ToolOption
              label="Series rounding"
              hint={`E12 → ${formatDecimal(result.e12, 2)} Ω · E24 → ${formatDecimal(result.e24, 2)} Ω`}
            >
              <ToolBadge tone="neutral">{result.standard.series}</ToolBadge>
            </ToolOption>
            <ToolStatus tone="neutral">
              <HugeiconsIcon
                icon={LightbulbIcon}
                strokeWidth={2}
                size={14}
                aria-hidden
              />{" "}
              <span>
                Using a lower resistor would raise the LED current above the
                configured value.
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
