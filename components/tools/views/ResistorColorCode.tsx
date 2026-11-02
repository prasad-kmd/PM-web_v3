"use client";

import { useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  InformationCircleIcon,
  RefreshCcwIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import {
  BAND_COLORS,
  BAND_ROLES,
  BAND_ROLE_LABELS,
  allowedColors,
  decodeResistorBands,
  defaultBandSelection,
  formatResistance,
  type BandCount,
  type BandRole,
} from "@/lib/tools/logic/resistor-color-code";

import type { ToolViewProps } from "@/lib/tools/registry";

import {
  ToolActions,
  ToolBadge,
  ToolBandField,
  ToolCopyButton,
  ToolResistorDiagram,
  ToolResultCard,
  ToolResultGrid,
  ToolSection,
  ToolSelectField,
  ToolStatus,
  ToolView,
  formatDecimal,
  type ToolColorSwatchItem,
  type ToolResistorBand,
} from "./shared";

const BAND_COUNT_ITEMS = [
  { value: "4", label: "4 bands" },
  { value: "5", label: "5 bands" },
  { value: "6", label: "6 bands" },
] as const;

function swatchItems(role: BandRole): ToolColorSwatchItem[] {
  return allowedColors(role).map((color) => ({
    value: color.value,
    label: color.label,
    hex: color.hex,
  }));
}

export default function ResistorColorCode({ toolId }: ToolViewProps) {
  const [bandCount, setBandCount] = useState<BandCount>(4);
  const [selected, setSelected] = useState<string[]>(defaultBandSelection(4));

  const roles = BAND_ROLES[bandCount];
  const roleLabels = BAND_ROLE_LABELS[bandCount];
  const result = useMemo(
    () => decodeResistorBands(bandCount, selected.slice(0, roles.length)),
    [bandCount, selected, roles.length],
  );

  const bandVisuals: ToolResistorBand[] = roles.map((_, index) => {
    const color =
      BAND_COLORS.find((item) => item.value === selected[index]) ??
      BAND_COLORS[0];
    return { hex: color.hex, label: color.label };
  });
  const diagramLabel = `${bandCount}-band resistor: ${bandVisuals
    .map((band) => band.label)
    .join(", ")}`;

  const changeBandCount = (value: string) => {
    const next = Number.parseInt(value, 10) as BandCount;
    if (next !== 4 && next !== 5 && next !== 6) return;
    setBandCount(next);
    setSelected(defaultBandSelection(next));
  };

  const changeBand = (index: number, value: string) => {
    setSelected((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
  };

  const reset = () => {
    setBandCount(4);
    setSelected(defaultBandSelection(4));
  };

  const summary = result.ok
    ? [
        `Bands = ${bandCount}`,
        `Sequence = ${result.bandLabels.join(" · ")}`,
        `Resistance = ${result.formatted}`,
        `Digits = ${result.digits.join("")}`,
        `Multiplier = ×${result.multiplier}`,
        `Tolerance = ±${result.tolerancePercent}%`,
        `Range = ${formatResistance(result.minOhms ?? 0)} – ${formatResistance(result.maxOhms ?? 0)}`,
        `TCR = ${result.tempCoeffPpm ?? "—"} ppm/K`,
      ].join("\n")
    : "";

  return (
    <ToolView>
      <span className="tool-hidden">{toolId}</span>
      <ToolSection
        title="Resistor colour code"
        description="Decode 4-, 5- and 6-band resistors with an accessible neutral diagram."
        badge={<ToolBadge tone="neutral">{bandCount} bands</ToolBadge>}
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
          label="Band count"
          hint="Switching the count loads a valid default sequence."
          items={BAND_COUNT_ITEMS}
          value={String(bandCount)}
          onValueChange={changeBandCount}
          className="tool-inline-option"
        />
        <ToolResistorDiagram bands={bandVisuals} label={diagramLabel} />
        <div className="tool-band-fields">
          {roles.map((role, index) => (
            <ToolBandField
              key={`${bandCount}-${index}`}
              label={roleLabels[index]}
              items={swatchItems(role)}
              value={selected[index]}
              onChange={(value) => changeBand(index, value)}
            />
          ))}
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
          title="Decoded value"
          description="Nominal resistance, tolerance range and temperature coefficient."
        >
          <ToolResultGrid className="tool-result-grid-wide">
            <ToolResultCard
              label="Resistance"
              value={result.formatted}
              detail={`${result.digits.join("")} × ${result.multiplier} Ω`}
            />
            <ToolResultCard
              label="Tolerance"
              value={`±${formatDecimal(result.tolerancePercent ?? 0, 3)}%`}
              detail="Band 4/5"
            />
            <ToolResultCard
              label="Minimum"
              value={formatResistance(result.minOhms ?? 0)}
              detail="Nominal × (1 − tol)"
            />
            <ToolResultCard
              label="Maximum"
              value={formatResistance(result.maxOhms ?? 0)}
              detail="Nominal × (1 + tol)"
            />
            <ToolResultCard
              label="Temperature coefficient"
              value={
                result.tempCoeffPpm === null
                  ? "—"
                  : `${result.tempCoeffPpm} ppm/K`
              }
              detail={
                result.tempCoeffPpm === null
                  ? "Not present on 4/5-band"
                  : "Sixth band"
              }
            />
          </ToolResultGrid>
          <ToolStatus tone="neutral">
            <HugeiconsIcon icon={Search01Icon} size={14} aria-hidden />
            “None” is a valid tolerance band and means ±20%.
          </ToolStatus>
        </ToolSection>
      ) : null}
    </ToolView>
  );
}
