import type { ComponentType } from "react";

/** Props every ported tool view receives from the Tool Bench. */
export type ToolViewProps = {
  toolId: string;
};

export type ToolModule = { default: ComponentType<ToolViewProps> };
export type ToolLoader = () => Promise<ToolModule>;

/**
 * One lazy loader per ported tool.
 *
 * Phase 2 registered five text/data tools; Phase 3 added six converters and
 * simple calculators; Phase 4 added six electronics tools; Phase 5a added six
 * mechanical tools; Phase 5b adds four mechatronics tools. Later phases add
 * more entries here and flip the matching `status` to `ported` in
 * `lib/tools/catalog.ts`. Keep the key equal to the catalogue id. The dynamic
 * import boundary is what lets a ported tool be opened offline after its chunk
 * has been warmed by `warmToolModules()`.
 */
export const TOOL_LOADERS: Record<string, ToolLoader> = {
  "json-formatter": () => import("@/components/tools/views/JsonFormatter"),
  "html-encoder": () => import("@/components/tools/views/HtmlEncoder"),
  "data-transform": () => import("@/components/tools/views/DataTransform"),
  "diff-checker": () => import("@/components/tools/views/DiffChecker"),
  "regex-architect": () => import("@/components/tools/views/RegexArchitect"),
  "unit-converter": () => import("@/components/tools/views/UnitConverter"),
  "css-unit-converter": () =>
    import("@/components/tools/views/CssUnitConverter"),
  "color-contrast-checker": () =>
    import("@/components/tools/views/ColorContrastChecker"),
  compressor: () => import("@/components/tools/views/Compressor"),
  "pwm-voltage-converter": () =>
    import("@/components/tools/views/PwmVoltageConverter"),
  "led-resistor-calculator": () =>
    import("@/components/tools/views/LedResistorCalculator"),
  "555-timer-calculator": () =>
    import("@/components/tools/views/Timer555Calculator"),
  "voltage-divider-designer": () =>
    import("@/components/tools/views/VoltageDividerDesigner"),
  "resistor-color-code": () =>
    import("@/components/tools/views/ResistorColorCode"),
  "op-amp-gain-calculator": () =>
    import("@/components/tools/views/OpAmpGainCalculator"),
  "pcb-trace-width": () => import("@/components/tools/views/PcbTraceWidth"),
  "pcb-impedance-calculator": () =>
    import("@/components/tools/views/PcbImpedanceCalculator"),
  "moment-of-inertia-calculator": () =>
    import("@/components/tools/views/MomentOfInertiaCalculator"),
  "iso-fits-tolerances": () =>
    import("@/components/tools/views/IsoFitsTolerances"),
  "beam-deflection-calculator": () =>
    import("@/components/tools/views/BeamDeflectionCalculator"),
  "gear-ratio-calculator": () =>
    import("@/components/tools/views/GearRatioCalculator"),
  "bolt-torque-chart": () => import("@/components/tools/views/BoltTorqueChart"),
  "material-database": () =>
    import("@/components/tools/views/MaterialDatabase"),
  "stepper-motor-calculator": () =>
    import("@/components/tools/views/StepperMotorCalculator"),
  "battery-life-estimator": () =>
    import("@/components/tools/views/BatteryLifeEstimator"),
  "sensor-scaling-calculator": () =>
    import("@/components/tools/views/SensorScalingCalculator"),
  "pid-controller-studio": () =>
    import("@/components/tools/views/PidControllerStudio"),
};

export function getToolLoader(toolId: string): ToolLoader | null {
  return TOOL_LOADERS[toolId] ?? null;
}
