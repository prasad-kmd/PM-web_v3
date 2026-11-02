"use client";

import { useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ActivityIcon,
  InformationCircleIcon,
  RefreshCcwIcon,
} from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import {
  calculate555,
  formatFrequencyHz,
  formatTimeSeconds,
  type TimerMode,
} from "@/lib/tools/logic/timer555";

import type { ToolViewProps } from "@/lib/tools/registry";

import {
  ToolActions,
  ToolBadge,
  ToolCopyButton,
  ToolResultCard,
  ToolResultGrid,
  ToolSection,
  ToolSelectField,
  ToolNumberField,
  ToolStatus,
  ToolView,
  formatDecimal,
} from "./shared";

const MODE_ITEMS = [
  { value: "astable", label: "Astable (free-running)" },
  { value: "monostable", label: "Monostable (one-shot)" },
] as const;

export default function Timer555Calculator({ toolId }: ToolViewProps) {
  const [mode, setMode] = useState<TimerMode>("astable");
  const [r1K, setR1K] = useState("10");
  const [r2K, setR2K] = useState("10");
  const [cUf, setCUf] = useState("10");
  const [rK, setRK] = useState("10");
  const [monoCUf, setMonoCUf] = useState("10");

  const result = useMemo(
    () =>
      calculate555({
        mode,
        r1K,
        r2K,
        cUf,
        rK,
        monoCUf,
      }),
    [mode, r1K, r2K, cUf, rK, monoCUf],
  );

  const reset = () => {
    setMode("astable");
    setR1K("10");
    setR2K("10");
    setCUf("10");
    setRK("10");
    setMonoCUf("10");
  };

  const summary = result.ok
    ? result.mode === "astable"
      ? [
          `Mode: astable`,
          `f = ${formatFrequencyHz(result.frequencyHz ?? 0)}`,
          `T = ${formatTimeSeconds(result.periodSeconds ?? 0)}`,
          `tH = ${formatTimeSeconds(result.timeHighSeconds ?? 0)}`,
          `tL = ${formatTimeSeconds(result.timeLowSeconds ?? 0)}`,
          `Duty = ${formatDecimal(result.dutyPercent ?? 0, 2)}%`,
        ].join("\n")
      : [
          `Mode: monostable`,
          `Pulse width = ${formatTimeSeconds(result.pulseWidthSeconds ?? 0)}`,
        ].join("\n")
    : "";

  return (
    <ToolView>
      <span className="tool-hidden">{toolId}</span>
      <ToolSection
        title="555 timer calculator"
        description="Astable and monostable timing from validated R/C values."
        badge={<ToolBadge tone="neutral">ln(2) / ln(3)</ToolBadge>}
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
        <ToolSelectField
          label="Circuit mode"
          hint="Astable oscillates continuously; monostable emits one timed pulse."
          value={mode}
          items={MODE_ITEMS}
          onValueChange={(value) => setMode(value as TimerMode)}
          className="tool-inline-option"
        />
        {mode === "astable" ? (
          <div className="tool-form-grid">
            <ToolNumberField
              label="R1"
              value={r1K}
              onChange={setR1K}
              placeholder="10"
              unit="kΩ"
              min={0}
              step={0.1}
            />
            <ToolNumberField
              label="R2"
              value={r2K}
              onChange={setR2K}
              placeholder="10"
              unit="kΩ"
              min={0}
              step={0.1}
            />
            <ToolNumberField
              label="Timing capacitor C"
              value={cUf}
              onChange={setCUf}
              placeholder="10"
              unit="µF"
              min={0}
              step={0.1}
            />
          </div>
        ) : (
          <div className="tool-form-grid">
            <ToolNumberField
              label="Timing resistor R"
              value={rK}
              onChange={setRK}
              placeholder="10"
              unit="kΩ"
              min={0}
              step={0.1}
            />
            <ToolNumberField
              label="Timing capacitor C"
              value={monoCUf}
              onChange={setMonoCUf}
              placeholder="10"
              unit="µF"
              min={0}
              step={0.1}
            />
          </div>
        )}
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
          title="Timing results"
          description="Exact RC timing, plus derived frequency and duty."
        >
          {result.mode === "astable" ? (
            <ToolResultGrid className="tool-result-grid-wide">
              <ToolResultCard
                label="Frequency"
                value={formatFrequencyHz(result.frequencyHz ?? 0)}
                detail="1 / (ln2 · (R1 + 2R2) · C)"
              />
              <ToolResultCard
                label="Period"
                value={formatTimeSeconds(result.periodSeconds ?? 0)}
                detail="tH + tL"
              />
              <ToolResultCard
                label="Output high"
                value={formatTimeSeconds(result.timeHighSeconds ?? 0)}
                detail="ln2 · (R1 + R2) · C"
              />
              <ToolResultCard
                label="Output low"
                value={formatTimeSeconds(result.timeLowSeconds ?? 0)}
                detail="ln2 · R2 · C"
              />
              <ToolResultCard
                label="Duty cycle"
                value={`${formatDecimal(result.dutyPercent ?? 0, 2)}%`}
                detail="tH / T"
              />
            </ToolResultGrid>
          ) : (
            <ToolResultGrid className="tool-result-grid-wide">
              <ToolResultCard
                label="Pulse width"
                value={formatTimeSeconds(result.pulseWidthSeconds ?? 0)}
                detail="ln3 · R · C"
              />
              <ToolResultCard
                label="Output frequency"
                value="—"
                detail="One-shot mode has no repeating frequency"
              />
              <ToolResultCard
                label="Duty cycle"
                value="—"
                detail="Not applicable to a single pulse"
              />
            </ToolResultGrid>
          )}
          <ToolStatus tone="neutral">
            <HugeiconsIcon icon={ActivityIcon} size={14} aria-hidden />
            Standard astable duty is always above 50%; a diode across R2 is
            required for 50% or less.
          </ToolStatus>
        </ToolSection>
      ) : null}
    </ToolView>
  );
}
