"use client";

import {
  CalculatorIcon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMemo, useState } from "react";
import type { ToolViewProps } from "@/lib/tools/registry";
import {
  calculateMomentOfInertia,
  formatSecondMoment,
  type MoiShape,
} from "@/lib/tools/logic/moment-of-inertia";
import {
  ToolActions,
  ToolBadge,
  ToolCopyButton,
  ToolDownloadButton,
  ToolNumberField,
  ToolResultCard,
  ToolResultGrid,
  ToolSection,
  ToolSelectField,
  ToolStatus,
  ToolView,
  formatDecimal,
} from "./shared";

const SHAPE_ITEMS = [
  { value: "rectangle", label: "Rectangle" },
  { value: "circle", label: "Solid circle" },
  { value: "ibeam", label: "Symmetric I-beam" },
] as const;

export default function MomentOfInertiaCalculator({ toolId }: ToolViewProps) {
  const [shape, setShape] = useState<MoiShape>("rectangle");
  const [width, setWidth] = useState("100");
  const [height, setHeight] = useState("200");
  const [diameter, setDiameter] = useState("100");
  const [flangeWidth, setFlangeWidth] = useState("150");
  const [flangeThickness, setFlangeThickness] = useState("10");
  const [webHeight, setWebHeight] = useState("300");
  const [webThickness, setWebThickness] = useState("8");

  const result = useMemo(
    () =>
      calculateMomentOfInertia({
        shape,
        width: Number(width),
        height: Number(height),
        diameter: Number(diameter),
        flangeWidth: Number(flangeWidth),
        flangeThickness: Number(flangeThickness),
        webHeight: Number(webHeight),
        webThickness: Number(webThickness),
      }),
    [
      shape,
      width,
      height,
      diameter,
      flangeWidth,
      flangeThickness,
      webHeight,
      webThickness,
    ],
  );

  const textReport = result.ok
    ? [
        "Moment of inertia results",
        `shape,${result.shape}`,
        `Ixx_mm4,${result.ixx}`,
        `Iyy_mm4,${result.iyy}`,
        `area_mm2,${result.area}`,
        `formula,"${result.formula}"`,
      ].join("\n")
    : "";
  const csvReport = result.ok
    ? [
        "shape,Ixx_mm4,Iyy_mm4,area_mm2",
        `${result.shape},${result.ixx},${result.iyy},${result.area}`,
      ].join("\n")
    : "";

  return (
    <ToolView>
      <ToolSection
        title="Section geometry"
        description="Area moment of inertia about centroidal axes. Dimensions are millimetres; the local copy and CSV replace the old dark-canvas PDF export."
        badge={<ToolBadge tone="neutral">P5a fix-first</ToolBadge>}
        actions={
          <ToolActions>
            <ToolCopyButton value={textReport} label="Copy results" />
            <ToolDownloadButton
              content={csvReport}
              fileName="moment-of-inertia.csv"
              mimeType="text/csv;charset=utf-8"
              label="Download CSV"
            />
          </ToolActions>
        }
      >
        <div className="tool-form-grid">
          <ToolSelectField
            label="Cross-section"
            items={SHAPE_ITEMS}
            value={shape}
            onValueChange={(value) => setShape(value as MoiShape)}
            hint="Choose a supported section before entering dimensions."
          />
          {shape === "rectangle" ? (
            <>
              <ToolNumberField
                label="Width b"
                value={width}
                onChange={setWidth}
                unit="mm"
                min={0}
                step="0.1"
              />
              <ToolNumberField
                label="Height h"
                value={height}
                onChange={setHeight}
                unit="mm"
                min={0}
                step="0.1"
              />
            </>
          ) : null}
          {shape === "circle" ? (
            <ToolNumberField
              label="Diameter d"
              value={diameter}
              onChange={setDiameter}
              unit="mm"
              min={0}
              step="0.1"
            />
          ) : null}
          {shape === "ibeam" ? (
            <>
              <ToolNumberField
                label="Flange width B"
                value={flangeWidth}
                onChange={setFlangeWidth}
                unit="mm"
                min={0}
                step="0.1"
              />
              <ToolNumberField
                label="Flange thickness tf"
                value={flangeThickness}
                onChange={setFlangeThickness}
                unit="mm"
                min={0}
                step="0.1"
              />
              <ToolNumberField
                label="Web height Hw"
                value={webHeight}
                onChange={setWebHeight}
                unit="mm"
                min={0}
                step="0.1"
              />
              <ToolNumberField
                label="Web thickness tw"
                value={webThickness}
                onChange={setWebThickness}
                unit="mm"
                min={0}
                step="0.1"
                hint="Must be less than flange width."
              />
            </>
          ) : null}
        </div>

        {result.ok ? (
          <>
            <ToolResultGrid className="tool-result-grid-wide">
              <ToolResultCard
                label="Ixx"
                value={formatSecondMoment(result.ixx)}
                unit="mm⁴"
                detail="Bending about the horizontal centroidal axis"
                tone="success"
              />
              <ToolResultCard
                label="Iyy"
                value={formatSecondMoment(result.iyy)}
                unit="mm⁴"
                detail="Bending about the vertical centroidal axis"
              />
              <ToolResultCard
                label="Area"
                value={formatDecimal(result.area, 2)}
                unit="mm²"
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
                {result.formula}. {result.note}
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
