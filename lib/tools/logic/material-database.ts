/**
 * P5a static local material property dataset.
 * Every numeric property carries an explicit unit. Values are typical
 * room-temperature reference data for preliminary design, not certified
 * datasheets. Aluminium 6061-T6 values are verified against a published
 * material datasheet; CFRP and polymers use an explicit null melting point
 * instead of inventing a single "melting" temperature.
 */

export type MaterialCategory =
  "Metals" | "Composites" | "Polymers" | "Ceramics";

export type EngineeringMaterial = {
  id: string;
  name: string;
  category: MaterialCategory;
  densityKgM3: number;
  elasticModulusGpa: number;
  thermalConductivityWMk: number;
  meltingPointC: number | null;
  yieldStrengthMpa: number | null;
  description: string;
};

export const MATERIAL_CATEGORIES: readonly MaterialCategory[] = [
  "Metals",
  "Composites",
  "Polymers",
  "Ceramics",
];

export const MATERIALS: readonly EngineeringMaterial[] = [
  {
    id: "al-6061-t6",
    name: "Aluminium 6061-T6",
    category: "Metals",
    densityKgM3: 2700,
    elasticModulusGpa: 68.9,
    thermalConductivityWMk: 167,
    meltingPointC: 582,
    yieldStrengthMpa: 276,
    description:
      "Common aerospace aluminium alloy; solidus ~582 °C, liquidus ~652 °C.",
  },
  {
    id: "ss-304",
    name: "Stainless Steel 304",
    category: "Metals",
    densityKgM3: 8000,
    elasticModulusGpa: 193,
    thermalConductivityWMk: 16.2,
    meltingPointC: 1400,
    yieldStrengthMpa: 215,
    description: "Versatile corrosion-resistant austenitic stainless steel.",
  },
  {
    id: "ti-6al-4v",
    name: "Titanium Ti-6Al-4V",
    category: "Metals",
    densityKgM3: 4430,
    elasticModulusGpa: 113.8,
    thermalConductivityWMk: 6.7,
    meltingPointC: 1604,
    yieldStrengthMpa: 880,
    description: "High strength-to-weight aerospace and medical alloy.",
  },
  {
    id: "cfrp",
    name: "Carbon Fiber Reinforced Polymer",
    category: "Composites",
    densityKgM3: 1600,
    elasticModulusGpa: 150,
    thermalConductivityWMk: 10,
    meltingPointC: null,
    yieldStrengthMpa: 600,
    description:
      "Anisotropic composite; matrix decomposes rather than having one melting point.",
  },
  {
    id: "copper-c101",
    name: "Copper (C101)",
    category: "Metals",
    densityKgM3: 8960,
    elasticModulusGpa: 117,
    thermalConductivityWMk: 391,
    meltingPointC: 1085,
    yieldStrengthMpa: 70,
    description: "High-purity electrical and thermal conductor.",
  },
  {
    id: "polycarbonate",
    name: "Polycarbonate",
    category: "Polymers",
    densityKgM3: 1200,
    elasticModulusGpa: 2.3,
    thermalConductivityWMk: 0.2,
    meltingPointC: null,
    yieldStrengthMpa: 62,
    description:
      "Amorphous engineering thermoplastic; no single sharp melting point.",
  },
  {
    id: "silicon-carbide",
    name: "Silicon Carbide",
    category: "Ceramics",
    densityKgM3: 3210,
    elasticModulusGpa: 410,
    thermalConductivityWMk: 120,
    meltingPointC: 2730,
    yieldStrengthMpa: null,
    description:
      "Hard, high-temperature ceramic; brittle, so yield strength is not tabulated.",
  },
] as const;

export function searchMaterials(
  query: string,
  category: MaterialCategory | "All" = "All",
): readonly EngineeringMaterial[] {
  const q = query.trim().toLowerCase();
  return MATERIALS.filter((material) => {
    const matchesCategory =
      category === "All" || material.category === category;
    const matchesQuery =
      !q ||
      material.name.toLowerCase().includes(q) ||
      material.category.toLowerCase().includes(q) ||
      material.description.toLowerCase().includes(q);
    return matchesCategory && matchesQuery;
  });
}
