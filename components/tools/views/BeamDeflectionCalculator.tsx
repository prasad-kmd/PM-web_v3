"use client";

import {
  ChartLineIcon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMemo, useState } from "react";
import type { ToolViewProps } from "@/lib/tools/registry";
import {
  calculateBeamDeflection,
  type BeamSupport,
} from "@/lib/tools/logic/beam-deflection";
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

const SUPPORT_ITEMS = [
  { value: "cantilever", label: "Cantilever, tip point load" },
  { value: "simply-supported", label: "Simply supported, centre load" },
] as const;

const MATERIAL_ITEMS = [
  { value: "210000", label: "Steel · 210 GPa" },
  { value: "68900", label: "Aluminium 6061-T6 · 68.9 GPa" },
  { value: "70000", label: "Aluminium · 70 GPa" },
  { value: "193000", label: "Stainless 304 · 193 GPa" },
] as const;

export default function BeamDeflectionCalculator({ toolId }: ToolViewProps) {
  const [support, setSupport] = useState<BeamSupport>("cantilever");
  const [load, setLoad] = useState("1000");
  const [length, setLength] = useState("2000");
  const [modulus, setModulus] = useState("210000");
  const [inertia, setInertia] = useState("500000");

  const result = useMemo(
    () =>
      calculateBeamDeflection({
        support,
        loadN: Number(load),
        lengthMm: Number(length),
        elasticModulusMpa: Number(modulus),
        inertiaMm4: Number(inertia),
      }),
    [support, load, length, modulus, inertia],
  );

  return (
    <ToolView>
      <ToolSection
        title="Euler–Bernoulli point load"
        description="Two explicit boundary cases: cantilever tip load and simply supported centre load. E is entered in MPa = N/mm²."
        badge={<ToolBadge tone="neutral">Small deflection</ToolBadge>}
      >
        <div className="tool-form-grid">
          <ToolSelectField
            label="Support / load case"
            items={SUPPORT_ITEMS}
            value={support}
            onValueChange={(value) => setSupport(value as BeamSupport)}
          />
          <ToolNumberField
            label="Point load P"
            value={load}
            onChange={setLoad}
            unit="N"
            min={0}
            step="1"
          />
          <ToolNumberField
            label="Span L"
            value={length}
            onChange={setLength}
            unit="mm"
            min={0}
            step="1"
          />
          <ToolNumberField
            label="Elastic modulus E"
            value={modulus}
            onChange={setModulus}
            unit="MPa"
            min={0}
            step="100"
          />
          <ToolSelectField
            label="Material shortcut"
            items={MATERIAL_ITEMS}
            value={modulus}
            onValueChange={setModulus}
            hint="Selecting a material populates E; I is still entered directly."
          />
          <ToolNumberField
            label="Second moment I"
            value={inertia}
            onChange={setInertia}
            unit="mm⁴"
            min={0}
            step="1000"
            hint="Use the Moment of Inertia Calculator result here."
          />
        </div>

        {result.ok ? (
          <>
            <ToolResultGrid className="tool-result-grid-wide">
              <ToolResultCard
                label="Maximum deflection"
                value={formatDecimal(result.deflectionMm, 4)}
                unit="mm"
                detail={`L / δ = ${formatDecimal(result.spanDeflectionRatio, 1)}`}
                tone="success"
              />
              <ToolResultCard
                label="Maximum moment"
                value={formatDecimal(result.maxMomentNm, 3)}
                unit="N·m"
              />
              <ToolResultCard
                label="End slope"
                value={formatDecimal(result.tipSlopeRadians, 6)}
                unit="rad"
              />
            </ToolResultGrid>
            <ToolStatus tone="neutral">
              <HugeiconsIcon
                icon={ChartLineIcon}
                strokeWidth={2}
                size={14}
                aria-hidden
              />{" "}
              <span>
                {result.formula}. {result.note}
              </span>
            </ToolStatus>
            <ToolStatus tone="neutral">
              <HugeiconsIcon
                icon={InformationCircleIcon}
                strokeWidth={2}
                size={14}
                aria-hidden
              />{" "}
              <span>
                For identical P, L, E and I, the cantilever deflects 16× more
                than the simply supported centre-load case.
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
