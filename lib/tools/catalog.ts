/**
 * Local catalogue for the Tool Bench.
 *
 * Phase 1 ships the shell only: every entry is `planned` except the deferred
 * LaTeX tool, which is `soon`. Later phases flip entries to `ported` and add a
 * matching loader in `lib/tools/registry.ts`. The catalogue is deliberately
 * dependency-free so search, recents and favourites work without a network.
 */

export const TOOL_CATEGORIES = [
  { id: "electronics", label: "Electronics" },
  { id: "mechanical", label: "Mechanical" },
  { id: "mechatronics", label: "Mechatronics" },
  { id: "math", label: "Math & Data" },
  { id: "web", label: "Software & Web" },
  { id: "core", label: "Content & Core" },
] as const;

export type ToolCategory = (typeof TOOL_CATEGORIES)[number]["id"];
export type ToolStatus = "ported" | "planned" | "soon";

export type ToolMeta = {
  id: string;
  title: string;
  category: ToolCategory;
  description: string;
  keywords: readonly string[];
  status: ToolStatus;
  /** Phase that will (or did) add the implementation. */
  phase: string;
  offline: boolean;
  /** Extra copy for `soon` entries. */
  note?: string;
};

export const TOOL_CATALOG: readonly ToolMeta[] = [
  // P2 — Text & data
  {
    id: "json-formatter",
    title: "JSON Structure Validator",
    category: "web",
    description:
      "Format, validate and minify JSON with a readable error state.",
    keywords: ["json", "format", "validate", "minify", "lint"],
    status: "ported",
    phase: "P2",
    offline: true,
  },
  {
    id: "html-encoder",
    title: "Security & Syntax Escaper",
    category: "core",
    description: "Encode and decode HTML entities for safe code presentation.",
    keywords: ["html", "escape", "encode", "decode", "entities", "xss"],
    status: "ported",
    phase: "P2",
    offline: true,
  },
  {
    id: "data-transform",
    title: "Data Transformation Suite",
    category: "core",
    description: "Base64, hex, binary and URL encoding for local text.",
    keywords: ["base64", "hex", "binary", "url", "encode", "decode"],
    status: "ported",
    phase: "P2",
    offline: true,
  },
  {
    id: "diff-checker",
    title: "Diff Comparison Engine",
    category: "web",
    description: "Compare two texts line by line with a real diff.",
    keywords: ["diff", "compare", "text", "changes"],
    status: "ported",
    phase: "P2",
    offline: true,
  },
  {
    id: "regex-architect",
    title: "Regex Pattern Architect",
    category: "web",
    description: "Test regular expressions with guarded, readable matches.",
    keywords: ["regex", "regexp", "pattern", "match", "test"],
    status: "ported",
    phase: "P2",
    offline: true,
  },

  // P3 — Converters & simple calculators
  {
    id: "unit-converter",
    title: "Precision Unit Converter",
    category: "core",
    description:
      "Convert length, mass, temperature, pressure, energy and torque.",
    keywords: ["units", "convert", "si", "imperial", "metric"],
    status: "ported",
    phase: "P3",
    offline: true,
  },
  {
    id: "css-unit-converter",
    title: "CSS Unit Converter",
    category: "web",
    description: "Convert px, rem, em, percent and viewport units.",
    keywords: ["css", "px", "rem", "em", "vw", "vh", "units"],
    status: "ported",
    phase: "P3",
    offline: true,
  },
  {
    id: "color-contrast-checker",
    title: "Color Contrast Checker",
    category: "web",
    description: "Check WCAG 2.1 contrast ratios with validated colour input.",
    keywords: ["wcag", "contrast", "accessibility", "colour", "color", "a11y"],
    status: "ported",
    phase: "P3",
    offline: true,
  },
  {
    id: "compressor",
    title: "Stream Compressor",
    category: "web",
    description: "Compress and decompress files with browser-native streams.",
    keywords: ["gzip", "deflate", "compress", "decompress", "stream"],
    status: "ported",
    phase: "P3",
    offline: true,
  },
  {
    id: "pwm-voltage-converter",
    title: "PWM to Voltage Converter",
    category: "mechatronics",
    description: "Convert PWM duty cycle to average voltage.",
    keywords: ["pwm", "duty", "voltage", "microcontroller"],
    status: "ported",
    phase: "P3",
    offline: true,
  },
  {
    id: "led-resistor-calculator",
    title: "LED Series Resistor",
    category: "electronics",
    description: "Find a current-limiting resistor and its power rating.",
    keywords: ["led", "resistor", "ohm", "e12", "e24", "current"],
    status: "ported",
    phase: "P3",
    offline: true,
  },

  // P4 — Electronics
  {
    id: "555-timer-calculator",
    title: "555 Timer Calculator",
    category: "electronics",
    description: "Design astable and monostable 555 timer circuits.",
    keywords: ["555", "timer", "astable", "monostable", "frequency"],
    status: "planned",
    phase: "P4",
    offline: true,
  },
  {
    id: "voltage-divider-designer",
    title: "Voltage Divider Designer",
    category: "electronics",
    description: "Find standard E12/E24 resistor pairs for a target voltage.",
    keywords: ["voltage", "divider", "resistor", "e12", "e24"],
    status: "planned",
    phase: "P4",
    offline: true,
  },
  {
    id: "resistor-color-code",
    title: "Resistor Color Code Solver",
    category: "electronics",
    description: "Decode 4, 5 and 6-band resistors with a visual band diagram.",
    keywords: ["resistor", "colour", "color", "bands", "tolerance"],
    status: "planned",
    phase: "P4",
    offline: true,
  },
  {
    id: "op-amp-gain-calculator",
    title: "Op-Amp Gain Calculator",
    category: "electronics",
    description: "Calculate inverting and non-inverting amplifier gain.",
    keywords: ["opamp", "op-amp", "gain", "amplifier", "inverting"],
    status: "planned",
    phase: "P4",
    offline: true,
  },
  {
    id: "pcb-trace-width",
    title: "PCB Trace Width Calculator",
    category: "electronics",
    description: "Size PCB traces from IPC-2221 current and temperature rise.",
    keywords: ["pcb", "trace", "width", "ipc-2221", "current"],
    status: "planned",
    phase: "P4",
    offline: true,
  },
  {
    id: "pcb-impedance-calculator",
    title: "PCB Impedance Calculator",
    category: "electronics",
    description: "Estimate microstrip and stripline characteristic impedance.",
    keywords: ["pcb", "impedance", "microstrip", "stripline", "transmission"],
    status: "planned",
    phase: "P4",
    offline: true,
  },

  // P5a — Mechanical
  {
    id: "moment-of-inertia-calculator",
    title: "Moment of Inertia",
    category: "mechanical",
    description: "Compute second moments of area for standard sections.",
    keywords: ["inertia", "ixx", "iyy", "beam", "section"],
    status: "planned",
    phase: "P5a",
    offline: true,
  },
  {
    id: "iso-fits-tolerances",
    title: "ISO Fits & Tolerances",
    category: "mechanical",
    description: "Look up ISO 286 shaft and hole fits for a nominal diameter.",
    keywords: ["iso", "286", "fits", "tolerance", "h7", "g6"],
    status: "planned",
    phase: "P5a",
    offline: true,
  },
  {
    id: "beam-deflection-calculator",
    title: "Beam Deflection Calculator",
    category: "mechanical",
    description: "Analyse cantilever and simply supported beam load cases.",
    keywords: ["beam", "deflection", "cantilever", "stress", "load"],
    status: "planned",
    phase: "P5a",
    offline: true,
  },
  {
    id: "gear-ratio-calculator",
    title: "Gear Ratio & Speed",
    category: "mechanical",
    description: "Calculate output speed and torque for gear trains.",
    keywords: ["gear", "ratio", "torque", "speed", "belt"],
    status: "planned",
    phase: "P5a",
    offline: true,
  },
  {
    id: "bolt-torque-chart",
    title: "Bolt Torque Chart",
    category: "mechanical",
    description: "Reference metric bolt torque by size and property class.",
    keywords: ["bolt", "torque", "metric", "property class", "fastener"],
    status: "planned",
    phase: "P5a",
    offline: true,
  },
  {
    id: "material-database",
    title: "Material Property Database",
    category: "mechanical",
    description: "Browse a local dataset of common engineering materials.",
    keywords: ["material", "density", "modulus", "conductivity", "database"],
    status: "planned",
    phase: "P5a",
    offline: true,
  },

  // P5b — Mechatronics
  {
    id: "stepper-motor-calculator",
    title: "Stepper Motor Calculator",
    category: "mechatronics",
    description: "Compute steps per millimetre from motor and drive settings.",
    keywords: ["stepper", "motor", "steps", "microstep", "cnc"],
    status: "planned",
    phase: "P5b",
    offline: true,
  },
  {
    id: "battery-life-estimator",
    title: "Battery Life Estimator",
    category: "mechatronics",
    description: "Estimate runtime from capacity, load and Peukert exponent.",
    keywords: ["battery", "runtime", "capacity", "peukert", "mah"],
    status: "planned",
    phase: "P5b",
    offline: true,
  },
  {
    id: "sensor-scaling-calculator",
    title: "Sensor Scaling Calculator",
    category: "mechatronics",
    description: "Map voltage or current signals to engineering units.",
    keywords: ["sensor", "scaling", "4-20ma", "0-10v", "calibration"],
    status: "planned",
    phase: "P5b",
    offline: true,
  },
  {
    id: "pid-controller-studio",
    title: "PID Controller Studio",
    category: "mechatronics",
    description: "Simulate and tune a PID loop in one combined tool.",
    keywords: ["pid", "control", "simulator", "tuner", "step response"],
    status: "planned",
    phase: "P5b",
    offline: true,
  },

  // P6a — Math & data
  {
    id: "matrix-calculator",
    title: "Matrix Calculator",
    category: "math",
    description:
      "Determinant, inverse, trace and linear systems for small matrices.",
    keywords: ["matrix", "determinant", "inverse", "linear algebra"],
    status: "planned",
    phase: "P6a",
    offline: true,
  },
  {
    id: "curve-fitter",
    title: "Linear Curve Fitter",
    category: "math",
    description: "Fit linear and polynomial models with R-squared analysis.",
    keywords: ["curve", "fit", "least squares", "regression", "r2"],
    status: "planned",
    phase: "P6a",
    offline: true,
  },
  {
    id: "unit-circle",
    title: "Unit Circle Explorer",
    category: "math",
    description: "Explore sine and cosine on an interactive unit circle.",
    keywords: ["unit circle", "trigonometry", "sine", "cosine", "angle"],
    status: "planned",
    phase: "P6a",
    offline: true,
  },
  {
    id: "scientific-calculator",
    title: "Precision Engineering Calculator",
    category: "math",
    description: "Evaluate engineering expressions with a safe local parser.",
    keywords: ["calculator", "scientific", "expression", "trigonometry"],
    status: "planned",
    phase: "P6a",
    offline: true,
  },

  // P6b — Content & core
  {
    id: "markdown-editor",
    title: "Technical Document Editor",
    category: "core",
    description: "Write Markdown with a sanitised live preview.",
    keywords: ["markdown", "editor", "preview", "gfm", "document"],
    status: "planned",
    phase: "P6b",
    offline: true,
  },
  {
    id: "latex-mathml-studio",
    title: "LaTeX Equation & MathML Studio",
    category: "core",
    description: "Write LaTeX equations and export native MathML.",
    keywords: ["latex", "mathml", "equation", "katex", "temml", "formula"],
    status: "soon",
    phase: "Deferred",
    offline: true,
    note: "Planned as one combined editor and converter, using prasad-kmd/latex2mathml_next as the reference for its conversion core. Deferred for now.",
  },
  {
    id: "resume-creator",
    title: "Resume Architect",
    category: "core",
    description: "Compose a resume locally and export it.",
    keywords: ["resume", "cv", "pdf", "editor"],
    status: "planned",
    phase: "P6b",
    offline: true,
  },
  {
    id: "ts-labs",
    title: "Tailwind Labs",
    category: "web",
    description: "Experiment with local UI presets rebuilt for Tailwind v4.",
    keywords: ["tailwind", "labs", "css", "presets", "components"],
    status: "planned",
    phase: "P6b",
    offline: true,
  },
];

export const TOOL_IDS: readonly string[] = TOOL_CATALOG.map((tool) => tool.id);

const TOOL_BY_ID = new Map(TOOL_CATALOG.map((tool) => [tool.id, tool]));

export function getToolById(id: string | null | undefined): ToolMeta | null {
  return id ? (TOOL_BY_ID.get(id) ?? null) : null;
}

export function matchesToolQuery(tool: ToolMeta, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    tool.title.toLowerCase().includes(needle) ||
    tool.description.toLowerCase().includes(needle) ||
    tool.keywords.some((keyword) => keyword.toLowerCase().includes(needle)) ||
    tool.id.includes(needle)
  );
}
