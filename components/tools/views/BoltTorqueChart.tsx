"use client";

import { InformationCircleIcon, ToolsIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";
import type { ToolViewProps } from "@/lib/tools/registry";
import {
  BOLT_PROPERTY_CLASSES,
  BOLT_TORQUE_ASSUMPTIONS,
  searchBoltTorque,
} from "@/lib/tools/logic/bolt-torque";
import {
  ToolActions,
  ToolBadge,
  ToolCopyButton,
  ToolDataTable,
  ToolDownloadButton,
  ToolField,
  ToolSection,
  ToolStatus,
  ToolView,
  formatDecimal,
} from "./shared";

export default function BoltTorqueChart({ toolId }: ToolViewProps) {
  const [query, setQuery] = useState("");
  const rows = useMemo(() => searchBoltTorque(query), [query]);
  const csv = useMemo(
    () =>
      [
        "size,pitch_mm,class_8.8_Nm,class_10.9_Nm,class_12.9_Nm",
        ...rows.map(
          (row) =>
            `${row.size},${row.pitchMm},${row.torqueNm["8.8"]},${row.torqueNm["10.9"]},${row.torqueNm["12.9"]}`,
        ),
      ].join("\n"),
    [rows],
  );

  const columns = [
    { key: "size", label: "Size" },
    { key: "pitch", label: "Pitch", align: "right" as const },
    { key: "c88", label: "8.8", align: "right" as const },
    { key: "c109", label: "10.9", align: "right" as const },
    { key: "c129", label: "12.9", align: "right" as const },
  ];
  const data = rows.map((row) => ({
    size: row.size,
    pitch: `${formatDecimal(row.pitchMm, 2)} mm`,
    c88: `${formatDecimal(row.torqueNm["8.8"], 1)} N·m`,
    c109: `${formatDecimal(row.torqueNm["10.9"], 1)} N·m`,
    c129: `${formatDecimal(row.torqueNm["12.9"], 1)} N·m`,
  }));

  return (
    <ToolView>
      <ToolSection
        title="Metric coarse-thread torque reference"
        description="One consistent VDI 2230-style dataset replaces the mixed v1 table. All values are newton-metres and remain local/offline."
        badge={<ToolBadge tone="neutral">Static dataset</ToolBadge>}
        actions={
          <ToolActions>
            <ToolCopyButton value={csv} label="Copy visible table" />
            <ToolDownloadButton
              content={csv}
              fileName="bolt-torque-chart.csv"
              mimeType="text/csv;charset=utf-8"
              label="Download CSV"
            />
          </ToolActions>
        }
      >
        <ToolField
          label="Search"
          hint="Filter by size, pitch or property class."
        >
          <Input
            unstyled
            nativeInput
            className="tool-input"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="e.g. M8, 1.25, 10.9"
            aria-label="Search bolt torque chart"
          />
        </ToolField>

        <ToolDataTable
          caption="Metric coarse-thread torque values in newton-metres"
          columns={columns}
          rows={data}
        />
        {rows.length === 0 ? (
          <ToolStatus tone="warning">No matching bolt size.</ToolStatus>
        ) : null}

        <ToolStatus tone="neutral">
          <HugeiconsIcon
            icon={ToolsIcon}
            strokeWidth={2}
            size={14}
            aria-hidden
          />{" "}
          <span>{BOLT_TORQUE_ASSUMPTIONS}</span>
        </ToolStatus>
        <ToolStatus tone="warning">
          <HugeiconsIcon
            icon={InformationCircleIcon}
            strokeWidth={2}
            size={14}
            aria-hidden
          />{" "}
          <span>
            Property classes shown: {BOLT_PROPERTY_CLASSES.join(" · ")}.
            Lubrication, coating and joint stiffness change the required torque;
            defer to the assembly specification for critical joints.
          </span>
        </ToolStatus>
        <span className="tool-hidden" aria-hidden="true">
          {toolId}
        </span>
      </ToolSection>
    </ToolView>
  );
}
