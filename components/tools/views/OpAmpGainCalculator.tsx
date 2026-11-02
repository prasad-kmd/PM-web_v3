"use client";

import { useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ChipIcon,
  InformationCircleIcon,
  RefreshCcwIcon,
} from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { calculateOpAmp, type OpAmpMode } from "@/lib/tools/logic/op-amp";

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

const MODE_ITEMS = [
  { value: "non-inverting", label: "Non-inverting (+)" },
  { value: "inverting", label: "Inverting (−)" },
] as const;

export default function OpAmpGainCalculator({ toolId }: ToolViewProps) {
  const [mode, setMode] = useState<OpAmpMode>("non-inverting");
  const [r1K, setR1K] = useState("1");
  const [rfK, setRfK] = useState("10");
  const [vin, setVin] = useState("1");
  const [railVoltage, setRailVoltage] = useState("");

  const result = useMemo(
    () =>
      calculateOpAmp({
        mode,
        r1K,
        rfK,
        vin,
        railVoltage,
      }),
    [mode, r1K, rfK, vin, railVoltage],
  );

  const reset = () => {
    setMode("non-inverting");
    setR1K("1");
    setRfK("10");
    setVin("1");
    setRailVoltage("");
  };

  const summary = result.ok
    ? [
        `Mode = ${result.mode}`,
        `Formula = ${result.formula}`,
        `Gain = ${formatDecimal(result.gain, 4)}`,
        `Ideal Vout = ${formatDecimal(result.voutIdeal, 4)} V`,
        `Clipped Vout = ${result.clipped ? `${formatDecimal(result.voutClipped ?? 0, 4)} V` : "not clipped"}`,
        `Rail = ${result.railVoltage ?? "—"} V`,
      ].join("\n")
    : "";

  return (
    <ToolView>
      <span className="tool-hidden">{toolId}</span>
      <ToolSection
        title="Op-amp gain calculator"
        description="Ideal gain with explicit sign, optional supply-rail clipping and strict validation."
        badge={<ToolBadge tone="neutral">{mode}</ToolBadge>}
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
          <ToolSelectField
            label="Configuration"
            items={MODE_ITEMS}
            value={mode}
            onValueChange={(value) => setMode(value as OpAmpMode)}
          />
          <ToolNumberField
            label="Input voltage"
            value={vin}
            onChange={setVin}
            placeholder="1"
            unit="V"
            step={0.1}
            error={result.ok ? null : result.error}
          />
          <ToolNumberField
            label="R1"
            value={r1K}
            onChange={setR1K}
            placeholder="1"
            unit="kΩ"
            min={0}
            step={0.1}
          />
          <ToolNumberField
            label="Feedback resistor Rf"
            value={rfK}
            onChange={setRfK}
            placeholder="10"
            unit="kΩ"
            min={0}
            step={0.1}
          />
          <ToolNumberField
            label="Supply rail (optional)"
            value={railVoltage}
            onChange={setRailVoltage}
            placeholder="e.g. 5"
            unit="V"
            min={0}
            step={0.1}
            hint="Leave blank to omit clipping."
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
        <ToolSection title="Gain results" description={result.formula}>
          <ToolResultGrid className="tool-result-grid-wide">
            <ToolResultCard
              label="Voltage gain"
              value={formatDecimal(result.gain, 4)}
              detail={result.formula}
            />
            <ToolResultCard
              label="Ideal output"
              value={`${formatDecimal(result.voutIdeal, 4)} V`}
              detail="Vin × Av"
            />
            <ToolResultCard
              label="Clipped output"
              value={
                result.clipped
                  ? `${formatDecimal(result.voutClipped ?? 0, 4)} V`
                  : "—"
              }
              detail={
                result.clipped
                  ? `Limited by ±${result.railVoltage} V rail`
                  : result.railVoltage
                    ? "Within supply rails"
                    : "No rail entered"
              }
              tone={result.clipped ? "warning" : "neutral"}
            />
          </ToolResultGrid>
          {result.clipped ? (
            <ToolStatus tone="warning">
              The ideal output exceeds the supply rail; a real op-amp will clip.
            </ToolStatus>
          ) : null}
          <ToolStatus tone="neutral">
            <HugeiconsIcon icon={ChipIcon} size={14} aria-hidden />
            Rf may be zero for a unity-gain buffer, but R1 must be greater than
            zero.
          </ToolStatus>
        </ToolSection>
      ) : null}
    </ToolView>
  );
}
