"use client";

import { useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  InformationCircleIcon,
  PulseIcon,
  RefreshCcwIcon,
} from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import {
  calculatePcbImpedance,
  type PcbTraceType,
} from "@/lib/tools/logic/pcb-impedance";

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

const TYPE_ITEMS = [
  { value: "microstrip", label: "Surface microstrip" },
  { value: "stripline", label: "Symmetric stripline" },
] as const;

export default function PcbImpedanceCalculator({ toolId }: ToolViewProps) {
  const [type, setType] = useState<PcbTraceType>("microstrip");
  const [dielectric, setDielectric] = useState("4.3");
  const [heightMm, setHeightMm] = useState("0.2");
  const [widthMm, setWidthMm] = useState("0.33");
  const [thicknessMm, setThicknessMm] = useState("0.035");

  const result = useMemo(
    () =>
      calculatePcbImpedance({
        type,
        dielectric,
        heightMm,
        widthMm,
        thicknessMm,
      }),
    [type, dielectric, heightMm, widthMm, thicknessMm],
  );

  const reset = () => {
    setType("microstrip");
    setDielectric("4.3");
    setHeightMm("0.2");
    setWidthMm("0.33");
    setThicknessMm("0.035");
  };

  const summary = result.ok
    ? [
        `Trace type = ${result.type}`,
        `Z0 = ${result.z0Text} Ω`,
        `w/h = ${formatDecimal(result.whRatio, 4)}`,
        `Formula = ${result.formula}`,
        `Geometry valid = ${result.geometryValid}`,
        `εr valid = ${result.erValid}`,
        result.warning ? `Warning = ${result.warning}` : "Warning = none",
        result.note,
      ].join("\n")
    : "";

  return (
    <ToolView>
      <span className="tool-hidden">{toolId}</span>
      <ToolSection
        title="PCB impedance calculator"
        description="IPC-2141 microstrip / symmetric-stripline estimate with validity warnings."
        badge={<ToolBadge tone="neutral">{type}</ToolBadge>}
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
            label="Trace type"
            items={TYPE_ITEMS}
            value={type}
            onValueChange={(value) => setType(value as PcbTraceType)}
          />
          <ToolNumberField
            label="Dielectric constant εr"
            value={dielectric}
            onChange={setDielectric}
            placeholder="4.3"
            step={0.1}
            error={result.ok ? null : result.error}
          />
          <ToolNumberField
            label="Dielectric height h"
            value={heightMm}
            onChange={setHeightMm}
            placeholder="0.2"
            unit="mm"
            min={0}
            step={0.01}
            hint={
              type === "stripline"
                ? "Distance to each reference plane."
                : "Height to the single reference plane."
            }
          />
          <ToolNumberField
            label="Trace width w"
            value={widthMm}
            onChange={setWidthMm}
            placeholder="0.33"
            unit="mm"
            min={0}
            step={0.01}
          />
          <ToolNumberField
            label="Trace thickness t"
            value={thicknessMm}
            onChange={setThicknessMm}
            placeholder="0.035"
            unit="mm"
            min={0}
            step={0.001}
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
          title="Characteristic impedance"
          description={result.formula}
        >
          <ToolResultGrid className="tool-result-grid-wide">
            <ToolResultCard
              label="Z0"
              value={`${result.z0Text} Ω`}
              detail="Single-ended characteristic impedance"
              tone={result.geometryValid ? "neutral" : "warning"}
            />
            <ToolResultCard
              label="w/h ratio"
              value={formatDecimal(result.whRatio, 4)}
              detail="Comfort range 0.1–3.0"
            />
            <ToolResultCard
              label="εr"
              value={dielectric}
              detail="Comfort range 1–15"
            />
            <ToolResultCard
              label="Geometry check"
              value={result.geometryValid ? "In range" : "Out of range"}
              detail={
                result.geometryValid
                  ? "IPC-2141 comfort range"
                  : "Treat as rough estimate"
              }
              tone={result.geometryValid ? "success" : "warning"}
            />
          </ToolResultGrid>
          {result.warning ? (
            <ToolStatus tone="warning">{result.warning}</ToolStatus>
          ) : null}
          <ToolStatus tone="neutral">
            <HugeiconsIcon icon={PulseIcon} size={14} aria-hidden />
            Symmetric stripline uses 1.9(2h + t), not 1.9h; h is measured to
            each plane.
          </ToolStatus>
          <ToolStatus tone="neutral">
            <HugeiconsIcon icon={InformationCircleIcon} size={14} aria-hidden />
            Closed-form estimate only; confirm controlled-impedance nets with
            your fabricator’s stack-up and coupons.
          </ToolStatus>
        </ToolSection>
      ) : null}
    </ToolView>
  );
}
