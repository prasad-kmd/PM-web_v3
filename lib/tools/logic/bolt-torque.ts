/**
 * P5a static local metric coarse-thread torque reference.
 * Values are newton-metres, rounded from a VDI 2230-style chart using
 * µ ≈ 0.14 (lightly oiled / dry reference) and 90% yield utilisation.
 * The v1 chart mixed slightly different values; this dataset is one consistent
 * published source with explicit assumptions and is not a safety-critical spec.
 */

export type BoltPropertyClass = "8.8" | "10.9" | "12.9";

export type BoltTorqueRow = {
  size: string;
  pitchMm: number;
  torqueNm: Record<BoltPropertyClass, number>;
};

export const BOLT_PROPERTY_CLASSES: readonly BoltPropertyClass[] = [
  "8.8",
  "10.9",
  "12.9",
];

export const BOLT_TORQUE_DATA: readonly BoltTorqueRow[] = [
  {
    size: "M3",
    pitchMm: 0.5,
    torqueNm: { "8.8": 1.3, "10.9": 2.0, "12.9": 2.3 },
  },
  {
    size: "M4",
    pitchMm: 0.7,
    torqueNm: { "8.8": 2.9, "10.9": 4.3, "12.9": 5.0 },
  },
  {
    size: "M5",
    pitchMm: 0.8,
    torqueNm: { "8.8": 5.8, "10.9": 8.4, "12.9": 9.9 },
  },
  {
    size: "M6",
    pitchMm: 1.0,
    torqueNm: { "8.8": 9.9, "10.9": 14.5, "12.9": 17.0 },
  },
  {
    size: "M8",
    pitchMm: 1.25,
    torqueNm: { "8.8": 24, "10.9": 35, "12.9": 41 },
  },
  {
    size: "M10",
    pitchMm: 1.5,
    torqueNm: { "8.8": 47, "10.9": 69, "12.9": 81 },
  },
  {
    size: "M12",
    pitchMm: 1.75,
    torqueNm: { "8.8": 81, "10.9": 119, "12.9": 139 },
  },
  {
    size: "M14",
    pitchMm: 2.0,
    torqueNm: { "8.8": 129, "10.9": 190, "12.9": 222 },
  },
  {
    size: "M16",
    pitchMm: 2.0,
    torqueNm: { "8.8": 198, "10.9": 291, "12.9": 341 },
  },
  {
    size: "M18",
    pitchMm: 2.5,
    torqueNm: { "8.8": 283, "10.9": 402, "12.9": 471 },
  },
  {
    size: "M20",
    pitchMm: 2.5,
    torqueNm: { "8.8": 402, "10.9": 570, "12.9": 667 },
  },
] as const;

export const BOLT_TORQUE_ASSUMPTIONS =
  "Metric coarse threads, new uncoated steel fastener, µ ≈ 0.14, ~90% of proof/yield preload. Verify the joint-specific specification for critical assemblies.";

export function searchBoltTorque(query: string): readonly BoltTorqueRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return BOLT_TORQUE_DATA;
  return BOLT_TORQUE_DATA.filter(
    (row) =>
      row.size.toLowerCase().includes(q) ||
      String(row.pitchMm).includes(q) ||
      BOLT_PROPERTY_CLASSES.some((cls) => cls.includes(q)),
  );
}

export function getBoltTorque(
  size: string,
  propertyClass: BoltPropertyClass,
): number | null {
  const row = BOLT_TORQUE_DATA.find(
    (entry) => entry.size.toLowerCase() === size.trim().toLowerCase(),
  );
  return row ? row.torqueNm[propertyClass] : null;
}
