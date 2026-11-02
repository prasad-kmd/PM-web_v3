"use client";

import { ArrowLeftRightIcon, PaletteIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ToolViewProps } from "@/lib/tools/registry";
import {
  WCAG_THRESHOLDS,
  contrastRatio,
  parseHexColor,
} from "@/lib/tools/logic/color-contrast";
import {
  ToolActions,
  ToolColorField,
  ToolComplianceRow,
  ToolCopyButton,
  ToolResultCard,
  ToolResultGrid,
  ToolSection,
  ToolStatus,
  ToolView,
  formatDecimal,
} from "./shared";

export default function ColorContrastChecker({ toolId }: ToolViewProps) {
  const [foreground, setForeground] = useState("#3B82F6");
  const [background, setBackground] = useState("#020617");

  const result = useMemo(
    () => contrastRatio(foreground, background),
    [foreground, background],
  );

  const foregroundError = parseHexColor(foreground)
    ? null
    : "Use a 3- or 6-digit hex colour.";
  const backgroundError = parseHexColor(background)
    ? null
    : "Use a 3- or 6-digit hex colour.";

  const previewStyle = result.ok
    ? {
        backgroundColor: result.background.hex,
        color: result.foreground.hex,
      }
    : { backgroundColor: "#000000", color: "#FFFFFF" };

  return (
    <ToolView>
      <ToolSection
        title="Colour pair"
        description="WCAG 2.1 relative luminance and contrast ratio. Invalid hex is rejected before any compliance result is shown."
        actions={
          <ToolCopyButton
            value={result.ok ? `${result.ratioText}:1` : ""}
            label="Copy ratio"
          />
        }
      >
        <div className="tool-form-grid">
          <ToolColorField
            label="Foreground"
            value={foreground}
            onChange={setForeground}
            error={foregroundError}
          />
          <ToolColorField
            label="Background"
            value={background}
            onChange={setBackground}
            error={backgroundError}
          />
        </div>

        <ToolActions>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setForeground(background);
              setBackground(foreground);
            }}
          >
            <HugeiconsIcon
              icon={ArrowLeftRightIcon}
              strokeWidth={2}
              size={14}
            />
            Swap colours
          </Button>
          <span className="tool-inline-note">
            <HugeiconsIcon
              icon={PaletteIcon}
              strokeWidth={2}
              size={14}
              aria-hidden
            />
            WCAG 2.1 · sRGB
          </span>
        </ToolActions>

        <div className="tool-color-preview" style={previewStyle}>
          <span className="tool-color-preview-title">Preview text</span>
          <span className="tool-color-preview-body">
            This is how the combination looks.
          </span>
        </div>

        {result.ok ? (
          <>
            <ToolResultGrid>
              <ToolResultCard
                label="Contrast ratio"
                value={result.ratioText}
                unit=":1"
                detail={`Luminance ${formatDecimal(result.foregroundLuminance, 4)} / ${formatDecimal(result.backgroundLuminance, 4)}`}
                tone={
                  result.compliance.aaNormal
                    ? "success"
                    : result.compliance.aaLarge
                      ? "warning"
                      : "error"
                }
              />
            </ToolResultGrid>
            <div className="tool-compliance">
              <ToolComplianceRow
                label="WCAG AA normal text"
                threshold={`${WCAG_THRESHOLDS.aaNormal}:1`}
                pass={result.compliance.aaNormal}
              />
              <ToolComplianceRow
                label="WCAG AA large text"
                threshold={`${WCAG_THRESHOLDS.aaLarge}:1`}
                pass={result.compliance.aaLarge}
              />
              <ToolComplianceRow
                label="WCAG AAA normal text"
                threshold={`${WCAG_THRESHOLDS.aaaNormal}:1`}
                pass={result.compliance.aaaNormal}
              />
              <ToolComplianceRow
                label="WCAG AAA large text"
                threshold={`${WCAG_THRESHOLDS.aaaLarge}:1`}
                pass={result.compliance.aaaLarge}
              />
            </div>
            <ToolStatus tone="neutral">
              Large text means at least 18pt, or 14pt bold. Normal text needs
              4.5:1 for AA and 7:1 for AAA.
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
