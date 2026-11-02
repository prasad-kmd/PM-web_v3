"use client";

import { CodeIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMemo, useState } from "react";
import type { ToolViewProps } from "@/lib/tools/registry";
import { convertCssUnits } from "@/lib/tools/logic/css-units";
import {
  ToolCopyButton,
  ToolNumberField,
  ToolOutput,
  ToolPane,
  ToolResultCard,
  ToolResultGrid,
  ToolSection,
  ToolStatus,
  ToolView,
} from "./shared";

export default function CssUnitConverter({ toolId }: ToolViewProps) {
  const [px, setPx] = useState("16");
  const [base, setBase] = useState("16");
  const [viewportWidth, setViewportWidth] = useState("1920");
  const [viewportHeight, setViewportHeight] = useState("1080");

  const result = useMemo(
    () =>
      convertCssUnits({
        px,
        base,
        viewportWidth,
        viewportHeight,
      }),
    [px, base, viewportWidth, viewportHeight],
  );

  return (
    <ToolView>
      <ToolSection
        title="CSS unit context"
        description="Pixels map to rem, em, percent and viewport units. A zero or invalid context is reported rather than replaced by a default."
      >
        <div className="tool-form-grid">
          <ToolNumberField
            label="Pixel value"
            value={px}
            onChange={setPx}
            unit="px"
            placeholder="16"
          />
          <ToolNumberField
            label="Base font size"
            value={base}
            onChange={setBase}
            unit="px"
            hint="Root HTML font size; must be greater than zero."
          />
          <ToolNumberField
            label="Viewport width"
            value={viewportWidth}
            onChange={setViewportWidth}
            unit="px"
            hint="Used for vw; must be greater than zero."
          />
          <ToolNumberField
            label="Viewport height"
            value={viewportHeight}
            onChange={setViewportHeight}
            unit="px"
            hint="Used for vh; must be greater than zero."
          />
        </div>

        {result.ok ? (
          <>
            <ToolResultGrid className="tool-result-grid-wide">
              <ToolResultCard
                label="rem"
                value={result.formatted.rem}
                unit="rem"
              />
              <ToolResultCard
                label="em"
                value={result.formatted.em}
                unit="em"
              />
              <ToolResultCard
                label="Percent"
                value={result.formatted.percent}
                unit="%"
              />
              <ToolResultCard
                label="vw"
                value={result.formatted.vw}
                unit="vw"
              />
              <ToolResultCard
                label="vh"
                value={result.formatted.vh}
                unit="vh"
              />
            </ToolResultGrid>
            <ToolStatus tone="neutral">
              <HugeiconsIcon
                icon={CodeIcon}
                strokeWidth={2}
                size={14}
                aria-hidden
              />{" "}
              <span>
                `em` and `%` assume the parent font size equals the root size.
                `vw` and `vh` are 1% of the configured viewport.
              </span>
            </ToolStatus>
          </>
        ) : (
          <ToolStatus tone="error">{result.error}</ToolStatus>
        )}
      </ToolSection>

      <ToolSection title="Generated CSS">
        <ToolPane
          label="Example rule"
          actions={
            <ToolCopyButton
              value={result.ok ? result.css : ""}
              label="Copy CSS"
            />
          }
        >
          <ToolOutput
            value={result.ok ? result.css : ""}
            placeholder="Fix the context to generate CSS."
            className="tool-code-output"
          />
        </ToolPane>
        <span className="tool-hidden" aria-hidden="true">
          {toolId}
        </span>
      </ToolSection>
    </ToolView>
  );
}
