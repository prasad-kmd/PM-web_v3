"use client";

import { useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  GaugeIcon,
  InformationCircleIcon,
  RefreshCcwIcon,
  RulerIcon,
} from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import {
  IPC2221,
  calculatePcbTraceWidth,
  type PcbLayer,
} from "@/lib/tools/logic/pcb-trace-width";

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

const LAYER_ITEMS = [
  { value: "external", label: "External (outer layer)" },
  { value: "internal", label: "Internal (buried)" },
] as const;

export default function PcbTraceWidth({ toolId }: ToolViewProps) {
  const [current, setCurrent] = useState("1");
  const [copperOz, setCopperOz] = useState("1");
  const [tempRise, setTempRise] = useState("10");
  const [layer, setLayer] = useState<PcbLayer>("external");

  const result = useMemo(
    () =>
      calculatePcbTraceWidth({
        current,
        copperOz,
        tempRise,
        layer,
      }),
    [current, copperOz, tempRise, layer],
  );

  const reset = () => {
    setCurrent("1");
    setCopperOz("1");
    setTempRise("10");
    setLayer("external");
  };

  const summary = result.ok
    ? [
        `Layer = ${result.layer}`,
        `k = ${result.k}`,
        `Area = ${formatDecimal(result.areaMil2, 3)} mil²`,
        `Thickness = ${formatDecimal(result.thicknessMil, 3)} mil`,
        `Minimum width = ${formatDecimal(result.widthMil, 3)} mil / ${formatDecimal(result.widthMm, 4)} mm`,
        `Recommended width (+20%) = ${formatDecimal(result.recommendedWidthMm, 4)} mm`,
      ].join("\n")
    : "";

  return (
    <ToolView>
      <span className="tool-hidden">{toolId}</span>
      <ToolSection
        title="PCB trace width"
        description="IPC-2221 current-carrying width with 1.378 mil/oz copper and a 20% margin."
        badge={<ToolBadge tone="neutral">{layer}</ToolBadge>}
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
            label="Target current"
            value={current}
            onChange={setCurrent}
            placeholder="1"
            unit="A"
            min={0}
            step={0.1}
            error={result.ok ? null : result.error}
          />
          <ToolNumberField
            label="Copper weight"
            value={copperOz}
            onChange={setCopperOz}
            placeholder="1"
            unit="oz/ft²"
            min={0}
            step={0.25}
          />
          <ToolNumberField
            label="Allowed temperature rise"
            value={tempRise}
            onChange={setTempRise}
            placeholder="10"
            unit="°C"
            min={0}
            step={1}
          />
          <ToolSelectField
            label="Layer"
            items={LAYER_ITEMS}
            value={layer}
            onValueChange={(value) => setLayer(value as PcbLayer)}
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
        <ToolSection title="Required geometry" description={result.formula}>
          <ToolResultGrid className="tool-result-grid-wide">
            <ToolResultCard
              label="Minimum width"
              value={`${formatDecimal(result.widthMm, 4)} mm`}
              detail={`${formatDecimal(result.widthMil, 3)} mil`}
            />
            <ToolResultCard
              label="Recommended width"
              value={`${formatDecimal(result.recommendedWidthMm, 4)} mm`}
              detail={`+${IPC2221.designMargin * 100}% design margin`}
            />
            <ToolResultCard
              label="Cross-section"
              value={`${formatDecimal(result.areaMil2, 3)} mil²`}
              detail="Required copper area"
            />
            <ToolResultCard
              label="Copper thickness"
              value={`${formatDecimal(result.thicknessMil, 3)} mil`}
              detail={`${formatDecimal(Number(copperOz), 3)} oz/ft²`}
            />
            <ToolResultCard
              label="k constant"
              value={String(result.k)}
              detail={`b = ${IPC2221.b}, c = ${IPC2221.c}`}
            />
            <ToolResultCard
              label="Layer"
              value={result.layer}
              detail="External traces dissipate heat more readily"
            />
          </ToolResultGrid>
          <ToolStatus tone="neutral">
            <HugeiconsIcon icon={RulerIcon} size={14} aria-hidden />1 oz/ft² ≈{" "}
            {IPC2221.ozToMils} mils = 35 µm; width uses the exact 0.0254 mm/mil
            conversion.
          </ToolStatus>
          <ToolStatus tone="neutral">
            <HugeiconsIcon icon={GaugeIcon} size={14} aria-hidden />
            IPC-2221 is a legacy curve fit; IPC-2152 or a thermal solver may
            allow narrower traces.
          </ToolStatus>
        </ToolSection>
      ) : null}
    </ToolView>
  );
}
