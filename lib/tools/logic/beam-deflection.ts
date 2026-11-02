/**
 * P5a pure Euler–Bernoulli beam deflection for two point-load boundary cases.
 * P in N, L in mm, E in MPa (N/mm²), I in mm⁴; deflection is returned in mm.
 * Verified against the closed-form cantilever PL³/3EI and simply-supported
 * centre-load PL³/48EI equations. No silent zero fallbacks.
 */

export type BeamSupport = "cantilever" | "simply-supported";

export type BeamResult = {
  ok: true;
  support: BeamSupport;
  deflectionMm: number;
  maxMomentNm: number;
  tipSlopeRadians: number;
  spanDeflectionRatio: number;
  formula: string;
  note: string;
};

export type BeamError = { ok: false; error: string };

function isPositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

export function calculateBeamDeflection(input: {
  support: BeamSupport;
  loadN: number;
  lengthMm: number;
  elasticModulusMpa: number;
  inertiaMm4: number;
}): BeamResult | BeamError {
  const { support, loadN, lengthMm, elasticModulusMpa, inertiaMm4 } = input;
  if (
    !isPositive(loadN) ||
    !isPositive(lengthMm) ||
    !isPositive(elasticModulusMpa) ||
    !isPositive(inertiaMm4)
  ) {
    return {
      ok: false,
      error: "P, L, E and I must all be positive finite numbers.",
    };
  }
  if (support !== "cantilever" && support !== "simply-supported") {
    return { ok: false, error: "Choose a supported beam case." };
  }

  const EI = elasticModulusMpa * inertiaMm4;
  const L3 = lengthMm ** 3;
  const cantilever = support === "cantilever";
  const deflectionMm = cantilever
    ? (loadN * L3) / (3 * EI)
    : (loadN * L3) / (48 * EI);
  const maxMomentNm = cantilever
    ? (loadN * lengthMm) / 1000
    : (loadN * lengthMm) / 4000;
  const tipSlopeRadians = cantilever
    ? (loadN * lengthMm ** 2) / (2 * EI)
    : (loadN * lengthMm ** 2) / (16 * EI);

  return {
    ok: true,
    support,
    deflectionMm,
    maxMomentNm,
    tipSlopeRadians,
    spanDeflectionRatio: lengthMm / deflectionMm,
    formula: cantilever
      ? "δmax = P·L³ / (3·E·I); θtip = P·L² / (2·E·I)"
      : "δmax = P·L³ / (48·E·I); θ = P·L² / (16·E·I)",
    note: "Small-deflection, prismatic, linear-elastic beam with constant EI.",
  };
}
