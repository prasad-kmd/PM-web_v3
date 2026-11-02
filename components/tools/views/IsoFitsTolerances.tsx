"use client";

import {
  InformationCircleIcon,
  Settings01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMemo, useState } from "react";
import type { ToolViewProps } from "@/lib/tools/registry";
import { calculateIsoFit } from "@/lib/tools/logic/iso-fits";
import {
  ToolBadge,
  ToolNumberField,
  ToolResultCard,
  ToolResultGrid,
  ToolSection,
  ToolSelectField,
  ToolStatus,
  ToolView,
  formatDecimal,
} from "./shared";

const HOLE_ITEMS = [
  { value: "H7", label: "H7" },
  { value: "H8", label: "H8" },
  { value: "H9", label: "H9" },
] as const;

const SHAFT_ITEMS = [
  { value: "f7", label: "f7 (free running)" },
  { value: "g6", label: "g6 (sliding)" },
  { value: "h6", label: "h6 (line-to-line)" },
  { value: "p6", label: "p6 (press)" },
] as const;

function signed(value: number): string {
  return `${value > 0 ? "+" : ""}${formatDecimal(value, 0)}`;
}

export default function IsoFitsTolerances({ toolId }: ToolViewProps) {
  const [diameter, setDiameter] = useState("25");
  const [holeClass, setHoleClass] = useState("H7");
  const [shaftClass, setShaftClass] = useState("g6");

  const result = useMemo(
    () =>
      calculateIsoFit({
        diameterMm: Number(diameter),
        holeClass,
        shaftClass,
      }),
    [diameter, holeClass, shaftClass],
  );

  return (
    <ToolView>
      <ToolSection
        title="ISO 286 hole-basis fit"
        description="Strict IT6–IT9 lookup with explicit radix-10 parsing and the up-to-and-including size-step rule. Limits are diametral micrometres."
        badge={<ToolBadge tone="neutral">ISO 286</ToolBadge>}
      >
        <div className="tool-form-grid">
          <ToolNumberField
            label="Nominal diameter"
            value={diameter}
            onChange={setDiameter}
            unit="mm"
            min={0}
            max={500}
            step="0.1"
            hint="0–500 mm; 30 mm belongs to the over-18–30 mm step."
          />
          <ToolSelectField
            label="Hole tolerance"
            items={HOLE_ITEMS}
            value={holeClass}
            onValueChange={setHoleClass}
            hint="Basic-hole system: lower deviation is always zero."
          />
          <ToolSelectField
            label="Shaft tolerance"
            items={SHAFT_ITEMS}
            value={shaftClass}
            onValueChange={setShaftClass}
            hint="f/g/h use an upper deviation; p uses a lower deviation."
          />
        </div>

        {result.ok ? (
          <>
            <ToolResultGrid className="tool-result-grid-wide">
              <ToolResultCard
                label="Hole limits"
                value={`0 … ${signed(result.hole.max)}`}
                unit="µm"
                detail={`${result.rangeLabel}; ${result.holeClass}`}
              />
              <ToolResultCard
                label="Shaft limits"
                value={`${signed(result.shaft.min)} … ${signed(result.shaft.max)}`}
                unit="µm"
                detail={result.shaftClass}
              />
              <ToolResultCard
                label="Fit type"
                value={result.fitType}
                tone={
                  result.fitType === "Clearance"
                    ? "success"
                    : result.fitType === "Interference"
                      ? "warning"
                      : "neutral"
                }
                detail={`${signed(result.clearance.min)} … ${signed(result.clearance.max)} µm`}
              />
            </ToolResultGrid>
            <ToolStatus tone="neutral">
              <HugeiconsIcon
                icon={InformationCircleIcon}
                strokeWidth={2}
                size={14}
                aria-hidden
              />{" "}
              <span>
                Minimum clearance = hole min − shaft max; maximum clearance =
                hole max − shaft min. {result.note}
              </span>
            </ToolStatus>
          </>
        ) : (
          <ToolStatus tone="error">
            <HugeiconsIcon
              icon={Settings01Icon}
              strokeWidth={2}
              size={14}
              aria-hidden
            />{" "}
            <span>{result.error}</span>
          </ToolStatus>
        )}
        <span className="tool-hidden" aria-hidden="true">
          {toolId}
        </span>
      </ToolSection>
    </ToolView>
  );
}
