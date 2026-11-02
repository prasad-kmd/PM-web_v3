"use client";

import {
  DatabaseIcon,
  InformationCircleIcon,
  LayersIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";
import type { ToolViewProps } from "@/lib/tools/registry";
import {
  MATERIAL_CATEGORIES,
  searchMaterials,
  type MaterialCategory,
} from "@/lib/tools/logic/material-database";
import {
  ToolActions,
  ToolBadge,
  ToolCopyButton,
  ToolDataTable,
  ToolDownloadButton,
  ToolField,
  ToolResultCard,
  ToolResultGrid,
  ToolSection,
  ToolSelectField,
  ToolStatus,
  ToolView,
  formatDecimal,
} from "./shared";

const CATEGORY_ITEMS = [
  { value: "All", label: "All categories" },
  ...MATERIAL_CATEGORIES.map((category) => ({
    value: category,
    label: category,
  })),
] as const;

export default function MaterialDatabase({ toolId }: ToolViewProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<MaterialCategory | "All">("All");
  const materials = useMemo(
    () => searchMaterials(query, category),
    [query, category],
  );
  const csv = useMemo(
    () =>
      [
        "id,name,category,density_kg_m3,elastic_modulus_GPa,thermal_conductivity_W_mK,melting_point_C,yield_strength_MPa",
        ...materials.map(
          (m) =>
            `${m.id},"${m.name}",${m.category},${m.densityKgM3},${m.elasticModulusGpa},${m.thermalConductivityWMk},${m.meltingPointC ?? ""},${m.yieldStrengthMpa ?? ""}`,
        ),
      ].join("\n"),
    [materials],
  );

  const columns = [
    { key: "name", label: "Material" },
    { key: "category", label: "Category" },
    { key: "density", label: "ρ", align: "right" as const },
    { key: "modulus", label: "E", align: "right" as const },
    { key: "conductivity", label: "k", align: "right" as const },
    { key: "yield", label: "Yield", align: "right" as const },
  ];
  const rows = materials.map((m) => ({
    name: m.name,
    category: m.category,
    density: `${formatDecimal(m.densityKgM3, 0)} kg/m³`,
    modulus: `${formatDecimal(m.elasticModulusGpa, 1)} GPa`,
    conductivity: `${formatDecimal(m.thermalConductivityWMk, 1)} W/m·K`,
    yield:
      m.yieldStrengthMpa === null
        ? "—"
        : `${formatDecimal(m.yieldStrengthMpa, 0)} MPa`,
  }));
  const selected = materials[0];

  return (
    <ToolView>
      <ToolSection
        title="Engineering material properties"
        description="Room-temperature reference values with explicit units. Polymers and composites no longer claim a single melting point."
        badge={<ToolBadge tone="neutral">Local dataset</ToolBadge>}
        actions={
          <ToolActions>
            <ToolCopyButton value={csv} label="Copy visible materials" />
            <ToolDownloadButton
              content={csv}
              fileName="material-database.csv"
              mimeType="text/csv;charset=utf-8"
              label="Download CSV"
            />
          </ToolActions>
        }
      >
        <div className="tool-form-grid">
          <ToolField label="Search" hint="Name, category or description.">
            <Input
              unstyled
              nativeInput
              className="tool-input"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="e.g. 6061, ceramic"
              aria-label="Search materials"
            />
          </ToolField>
          <ToolSelectField
            label="Category"
            items={CATEGORY_ITEMS}
            value={category}
            onValueChange={(value) =>
              setCategory(value as MaterialCategory | "All")
            }
          />
        </div>

        <ToolDataTable
          caption="Typical room-temperature engineering material properties"
          columns={columns}
          rows={rows}
        />
        {materials.length === 0 ? (
          <ToolStatus tone="warning">No matching materials.</ToolStatus>
        ) : null}

        {selected ? (
          <>
            <ToolResultGrid className="tool-result-grid-wide">
              <ToolResultCard
                label="Selected material"
                value={selected.name}
                detail={selected.description}
                tone="success"
              />
              <ToolResultCard
                label="Density"
                value={formatDecimal(selected.densityKgM3, 0)}
                unit="kg/m³"
              />
              <ToolResultCard
                label="Elastic modulus"
                value={formatDecimal(selected.elasticModulusGpa, 1)}
                unit="GPa"
              />
              <ToolResultCard
                label="Thermal conductivity"
                value={formatDecimal(selected.thermalConductivityWMk, 1)}
                unit="W/m·K"
              />
              <ToolResultCard
                label="Melting point"
                value={
                  selected.meltingPointC === null
                    ? "Not single-valued"
                    : formatDecimal(selected.meltingPointC, 0)
                }
                unit={selected.meltingPointC === null ? undefined : "°C"}
              />
            </ToolResultGrid>
            <ToolStatus tone="neutral">
              <HugeiconsIcon
                icon={LayersIcon}
                strokeWidth={2}
                size={14}
                aria-hidden
              />{" "}
              <span>
                E is in GPa, density in kg/m³, conductivity in W/m·K and yield
                in MPa. Select a material by filtering the table.
              </span>
            </ToolStatus>
          </>
        ) : null}

        <ToolStatus tone="warning">
          <HugeiconsIcon
            icon={InformationCircleIcon}
            strokeWidth={2}
            size={14}
            aria-hidden
          />{" "}
          <span>
            Typical values for preliminary design only. Verify with a
            manufacturer datasheet for critical applications.
          </span>
        </ToolStatus>
        <span className="tool-hidden" aria-hidden="true">
          {toolId}
        </span>
      </ToolSection>
    </ToolView>
  );
}
