"use client";

import { useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  InformationCircleIcon,
  RefreshCcwIcon,
  ZapIcon,
} from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import type { ResistorSeries } from "@/lib/tools/logic/led";
import { calculateVoltageDivider } from "@/lib/tools/logic/voltage-divider";
import { formatResistance } from "@/lib/tools/logic/resistor-color-code";

import type { ToolViewProps } from "@/lib/tools/registry";

import {
  ToolActions,
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

const SERIES_ITEMS = [
  { value: "E12", label: "E12 (10% series)" },
  { value: "E24", label: "E24 (5% series)" },
] as const;

const TOLERANCE_ITEMS = [
  { value: "0.1", label: "±0.1%" },
  { value: "0.5", label: "±0.5%" },
  { value: "1", label: "±1%" },
  { value: "2", label: "±2%" },
  { value: "5", label: "±5%" },
  { value: "10", label: "±10%" },
] as const;

export default function VoltageDividerDesigner({ toolId }: ToolViewProps) {
  const [vin, setVin] = useState("5");
  const [vout, setVout] = useState("3.3");
  const [currentMa, setCurrentMa] = useState("1");
  const [series, setSeries] = useState<ResistorSeries>("E24");
  const [tolerancePercent, setTolerancePercent] = useState("1");

  const result = useMemo(
    () =>
      calculateVoltageDivider({
        vin,
        vout,
        currentMa,
        series,
        tolerancePercent,
      }),
    [vin, vout, currentMa, series, tolerancePercent],
  );

  const reset = () => {
    setVin("5");
    setVout("3.3");
    setCurrentMa("1");
    setSeries("E24");
    setTolerancePercent("1");
  };

  const summary = result.ok
    ? [
        `Vin = ${result.vin} V`,
        `Target Vout = ${result.targetVout} V`,
        `Series = ${result.series}`,
        `Ideal R1 = ${formatResistance(result.idealR1)}`,
        `Ideal R2 = ${formatResistance(result.idealR2)}`,
        `Chosen R1 = ${formatResistance(result.r1)}`,
        `Chosen R2 = ${formatResistance(result.r2)}`,
        `Actual Vout = ${formatDecimal(result.actualVout, 4)} V`,
        `Error = ${formatDecimal(result.voltageErrorPercent, 3)}%`,
        `Current = ${formatDecimal(result.actualCurrentMa, 3)} mA`,
        `Total power = ${formatDecimal(result.power.totalWatts * 1000, 3)} mW`,
        `Tolerance range = ${formatDecimal(result.tolerance.minVout, 4)}–${formatDecimal(result.tolerance.maxVout, 4)} V`,
      ].join("\n")
    : "";

  return (
    <ToolView>
      <span className="tool-hidden">{toolId}</span>
      <ToolSection
        title="Voltage divider designer"
        description="Balanced full E-series search with numeric power and tolerance analysis."
        badge={<ToolBadge tone="neutral">{series}</ToolBadge>}
        actions={
          <ToolActions>
            <ToolCopyButton value={summary} disabled={!result.ok} />
            <Button variant="outline" size="sm" onClick={reset}>
              <HugeiconsIcon icon={RefreshCcwIcon} size={14} />
              Reset
            </Button>
          </ToolActions>
        }
      >
        <div className="tool-form-grid">
          <ToolNumberField
            label="Input voltage"
            value={vin}
            onChange={setVin}
            placeholder="5"
            unit="V"
            min={0}
            step={0.1}
            error={result.ok ? null : result.error}
          />
          <ToolNumberField
            label="Target output"
            value={vout}
            onChange={setVout}
            placeholder="3.3"
            unit="V"
            min={0}
            step={0.1}
          />
          <ToolNumberField
            label="Target divider current"
            value={currentMa}
            onChange={setCurrentMa}
            placeholder="1"
            unit="mA"
            min={0}
            step={0.1}
          />
          <ToolSelectField
            label="Resistor series"
            items={SERIES_ITEMS}
            value={series}
            onValueChange={(value) => setSeries(value as ResistorSeries)}
          />
          <ToolSelectField
            label="Resistor tolerance"
            items={TOLERANCE_ITEMS}
            value={tolerancePercent}
            onValueChange={setTolerancePercent}
          />
        </div>
        {!result.ok ? (
          <ToolStatus tone="error">{result.error}</ToolStatus>
        ) : (
          <ToolStatus tone="neutral">
            <HugeiconsIcon icon={InformationCircleIcon} size={14} aria-hidden />
            {result.note}
          </ToolStatus>
        )}
      </ToolSection>

      {result.ok ? (
        <ToolSection
          title="Design results"
          description={`Searched ${result.candidatesChecked.toLocaleString()} standard-value pairs.`}
        >
          <ToolResultGrid className="tool-result-grid-wide">
            <ToolResultCard
              label="Chosen R1"
              value={formatResistance(result.r1)}
              detail={`Ideal ${formatResistance(result.idealR1)}`}
            />
            <ToolResultCard
              label="Chosen R2"
              value={formatResistance(result.r2)}
              detail={`Ideal ${formatResistance(result.idealR2)}`}
            />
            <ToolResultCard
              label="Actual output"
              value={`${formatDecimal(result.actualVout, 4)} V`}
              detail={`Target ${result.targetVout} V`}
            />
            <ToolResultCard
              label="Output error"
              value={`${formatDecimal(result.voltageErrorPercent, 3)}%`}
              detail="Relative to target Vout"
              tone={result.voltageErrorPercent > 5 ? "warning" : "neutral"}
            />
            <ToolResultCard
              label="Divider current"
              value={`${formatDecimal(result.actualCurrentMa, 3)} mA`}
              detail={`Target ${formatDecimal(result.targetCurrentA * 1000, 3)} mA`}
            />
            <ToolResultCard
              label="Total dissipation"
              value={`${formatDecimal(result.power.totalWatts * 1000, 3)} mW`}
              detail={`R1 ${formatDecimal(result.power.r1Watts * 1000, 3)} mW · R2 ${formatDecimal(result.power.r2Watts * 1000, 3)} mW`}
            />
            <ToolResultCard
              label="Tolerance min"
              value={`${formatDecimal(result.tolerance.minVout, 4)} V`}
              detail={`±${result.tolerance.percent}% worst case`}
            />
            <ToolResultCard
              label="Tolerance max"
              value={`${formatDecimal(result.tolerance.maxVout, 4)} V`}
              detail={`±${result.tolerance.percent}% worst case`}
            />
          </ToolResultGrid>
          {result.voltageErrorPercent > 5 ? (
            <ToolStatus tone="warning">
              Output error exceeds 5%; consider E24, a trimmer, or a buffered
              reference.
            </ToolStatus>
          ) : null}
          <ToolStatus tone="neutral">
            <HugeiconsIcon icon={ZapIcon} size={14} aria-hidden />
            Power uses numeric resistance in ohms, not formatted kΩ strings.
          </ToolStatus>
        </ToolSection>
      ) : null}
    </ToolView>
  );
}
