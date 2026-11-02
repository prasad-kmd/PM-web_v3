"use client";

import {
  BatteryIcon,
  Clock01Icon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMemo, useState } from "react";
import type { ToolViewProps } from "@/lib/tools/registry";
import { calculateBatteryLife } from "@/lib/tools/logic/battery-life";
import {
  ToolBadge,
  ToolCheckboxField,
  ToolNumberField,
  ToolResultCard,
  ToolResultGrid,
  ToolSection,
  ToolStatus,
  ToolView,
  formatDecimal,
} from "./shared";

export default function BatteryLifeEstimator({ toolId }: ToolViewProps) {
  const [capacity, setCapacity] = useState("2000");
  const [load, setLoad] = useState("100");
  const [reserve, setReserve] = useState("20");
  const [efficiency, setEfficiency] = useState("100");
  const [ratedHours, setRatedHours] = useState("20");
  const [usePeukert, setUsePeukert] = useState(false);
  const [exponent, setExponent] = useState("1.2");

  const result = useMemo(
    () =>
      calculateBatteryLife({
        capacityMah: Number(capacity),
        loadMa: Number(load),
        reservePercent: Number(reserve),
        efficiencyPercent: Number(efficiency),
        ratedHours: Number(ratedHours),
        usePeukert,
        peukertExponent: Number(exponent),
      }),
    [capacity, load, reserve, efficiency, ratedHours, usePeukert, exponent],
  );

  return (
    <ToolView>
      <ToolSection
        title="Battery runtime estimate"
        description="Explicit rated-hour Peukert formula, efficiency and reserve margin. k = 1 collapses to the ideal capacity/current estimate."
        badge={<ToolBadge tone="neutral">Peukert aware</ToolBadge>}
      >
        <div className="tool-form-grid">
          <ToolNumberField
            label="Rated capacity C"
            value={capacity}
            onChange={setCapacity}
            unit="mAh"
            min={0}
            step="10"
          />
          <ToolNumberField
            label="Average load I"
            value={load}
            onChange={setLoad}
            unit="mA"
            min={0}
            step="10"
          />
          <ToolNumberField
            label="Rated discharge time H"
            value={ratedHours}
            onChange={setRatedHours}
            unit="h"
            min={0}
            step="1"
            hint="Usually 20 h for a lead-acid C/20 rating."
          />
          <ToolNumberField
            label="Reserve / safety margin"
            value={reserve}
            onChange={setReserve}
            unit="%"
            min={0}
            max={100}
            step="1"
          />
          <ToolNumberField
            label="Converter efficiency"
            value={efficiency}
            onChange={setEfficiency}
            unit="%"
            min={0}
            max={100}
            step="1"
          />
          <ToolCheckboxField
            label="Enable Peukert correction"
            hint="Apply t = H · (C / (I · H))^k."
            checked={usePeukert}
            onChange={setUsePeukert}
          />
          {usePeukert ? (
            <ToolNumberField
              label="Peukert exponent k"
              value={exponent}
              onChange={setExponent}
              unit=""
              min={1}
              max={2}
              step="0.01"
              hint="Lead-acid ≈ 1.1–1.3; lithium ≈ 1.0–1.05."
            />
          ) : null}
        </div>

        {result.ok ? (
          <>
            <ToolResultGrid className="tool-result-grid-wide">
              <ToolResultCard
                label="Usable runtime"
                value={result.formatted}
                unit=""
                detail={`${formatDecimal(result.usableHours, 3)} decimal hours`}
                tone="success"
              />
              <ToolResultCard
                label="Theoretical runtime"
                value={formatDecimal(result.theoreticalHours, 3)}
                unit="h"
                detail={
                  result.method === "peukert"
                    ? `Peukert k=${exponent}`
                    : "Ideal C/I"
                }
              />
              <ToolResultCard
                label="Days"
                value={formatDecimal(result.days, 3)}
                unit="d"
              />
              <ToolResultCard
                label="Effective capacity"
                value={formatDecimal(result.effectiveCapacityAh, 3)}
                unit="Ah"
              />
            </ToolResultGrid>
            <ToolStatus tone="neutral">
              <HugeiconsIcon
                icon={BatteryIcon}
                strokeWidth={2}
                size={14}
                aria-hidden
              />{" "}
              <span>{result.note}</span>
            </ToolStatus>
            <ToolStatus tone="neutral">
              <HugeiconsIcon
                icon={Clock01Icon}
                strokeWidth={2}
                size={14}
                aria-hidden
              />{" "}
              <span>
                At the rated C/20 current, k = 1.0 and k = 1.2 both give 20 h;
                Peukert only diverges away from the rated rate.
              </span>
            </ToolStatus>
          </>
        ) : (
          <ToolStatus tone="error">{result.error}</ToolStatus>
        )}
        <ToolStatus tone="warning">
          <HugeiconsIcon
            icon={InformationCircleIcon}
            strokeWidth={2}
            size={14}
            aria-hidden
          />{" "}
          <span>
            Estimates ignore temperature, ageing, self-discharge and voltage
            cut-off. Verify chemistry-specific limits with the datasheet.
          </span>
        </ToolStatus>
        <span className="tool-hidden" aria-hidden="true">
          {toolId}
        </span>
      </ToolSection>
    </ToolView>
  );
}
