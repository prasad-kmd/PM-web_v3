"use client";

import { ArrowLeftRightIcon, RulerIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ToolViewProps } from "@/lib/tools/registry";
import {
  UNIT_CATEGORIES,
  UNIT_DATA,
  convertUnit,
  type UnitCategory,
} from "@/lib/tools/logic/units";
import {
  ToolActions,
  ToolCopyButton,
  ToolNumberField,
  ToolResultCard,
  ToolResultGrid,
  ToolSection,
  ToolSelectField,
  ToolStatus,
  ToolView,
} from "./shared";

const CATEGORY_ITEMS = UNIT_CATEGORIES.map((entry) => ({
  value: entry.value,
  label: entry.label,
}));

export default function UnitConverter({ toolId }: ToolViewProps) {
  const [category, setCategory] = useState<UnitCategory>("length");
  const [fromUnit, setFromUnit] = useState(UNIT_DATA.length[0].value);
  const [toUnit, setToUnit] = useState(UNIT_DATA.length[1].value);
  const [fromValue, setFromValue] = useState("1");

  const unitItems = useMemo(
    () =>
      UNIT_DATA[category].map((unit) => ({
        value: unit.value,
        label: unit.label,
      })),
    [category],
  );

  const result = useMemo(
    () => convertUnit(category, fromUnit, toUnit, fromValue),
    [category, fromUnit, toUnit, fromValue],
  );

  const handleCategory = (next: string) => {
    const nextCategory = next as UnitCategory;
    setCategory(nextCategory);
    setFromUnit(UNIT_DATA[nextCategory][0].value);
    setToUnit(UNIT_DATA[nextCategory][1].value);
  };

  const handleSwap = () => {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
    if (result.ok) setFromValue(result.formatted);
  };

  return (
    <ToolView>
      <ToolSection
        title="Precision unit converter"
        description="Standard metric and imperial factors with affine temperature conversion. Nothing is rounded or guessed."
        actions={
          <ToolCopyButton
            value={result.ok ? result.formatted : ""}
            label="Copy result"
          />
        }
      >
        <div className="tool-form-grid">
          <ToolSelectField
            label="Category"
            items={CATEGORY_ITEMS}
            value={category}
            onValueChange={handleCategory}
          />
          <ToolNumberField
            label="Value"
            value={fromValue}
            onChange={setFromValue}
            placeholder="Enter a number"
            error={result.ok ? null : result.error}
          />
          <ToolSelectField
            label="From"
            items={unitItems}
            value={fromUnit}
            onValueChange={setFromUnit}
          />
          <ToolSelectField
            label="To"
            items={unitItems}
            value={toUnit}
            onValueChange={setToUnit}
          />
        </div>

        <ToolActions>
          <Button variant="outline" size="sm" onClick={handleSwap}>
            <HugeiconsIcon
              icon={ArrowLeftRightIcon}
              strokeWidth={2}
              size={14}
            />
            Swap units
          </Button>
          <span className="tool-inline-note">
            <HugeiconsIcon
              icon={RulerIcon}
              strokeWidth={2}
              size={14}
              aria-hidden
            />
            Exact factors · 1 mi = 1609.344 m
          </span>
        </ToolActions>

        {result.ok ? (
          <>
            <ToolResultGrid>
              <ToolResultCard
                label="Converted value"
                value={result.formatted}
                unit={result.toLabel}
                detail={`From ${result.fromLabel}`}
                tone="success"
              />
            </ToolResultGrid>
            <ToolStatus tone="neutral">
              Temperature uses Celsius as the intermediate scale; all other
              categories convert through their SI base unit. Values are shown
              with up to ten significant digits.
            </ToolStatus>
          </>
        ) : (
          <ToolStatus tone="error">{result.error}</ToolStatus>
        )}
        <span className="tool-hidden">{toolId}</span>
      </ToolSection>
    </ToolView>
  );
}
