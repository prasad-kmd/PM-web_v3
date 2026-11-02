"use client";

import {
  ActivityIcon,
  ChartLineIcon,
  InformationCircleIcon,
  PauseIcon,
  PlayIcon,
  RotateCcwIcon,
  Settings01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import type { ToolViewProps } from "@/lib/tools/registry";
import { simulatePid, type PidMode } from "@/lib/tools/logic/pid-controller";
import {
  ToolActions,
  ToolBadge,
  ToolNumberField,
  ToolResultCard,
  ToolResultGrid,
  ToolSection,
  ToolSelectField,
  ToolSparkline,
  ToolStatus,
  ToolView,
  formatDecimal,
} from "./shared";

const MODE_ITEMS = [
  { value: "simulator", label: "Simulator · fixed step response" },
  { value: "tuner", label: "Tuner · adjustable setpoint" },
] as const;

export default function PidControllerStudio({ toolId }: ToolViewProps) {
  const [mode, setMode] = useState<PidMode>("simulator");
  const [kp, setKp] = useState("2.5");
  const [ki, setKi] = useState("1.2");
  const [kd, setKd] = useState("0.5");
  const [setpoint, setSetpoint] = useState("1");
  const [isRunning, setIsRunning] = useState(true);
  const [visibleCount, setVisibleCount] = useState(0);

  const simulation = useMemo(
    () =>
      simulatePid({
        mode,
        kp: Number(kp),
        ki: Number(ki),
        kd: Number(kd),
        setpoint: Number(setpoint),
      }),
    [mode, kp, ki, kd, setpoint],
  );
  const totalSamples = simulation.ok ? simulation.samples.length : 0;

  useEffect(() => {
    setVisibleCount(0);
  }, [simulation]);

  useEffect(() => {
    if (!simulation.ok || !isRunning) return;
    const reducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      setVisibleCount(totalSamples);
      return;
    }
    let frame = 0;
    let last = 0;
    const tick = (now: number) => {
      if (!last || now - last >= 24) {
        setVisibleCount((count) => Math.min(count + 1, totalSamples));
        last = now;
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [simulation, isRunning, totalSamples]);

  const visibleSamples = simulation.ok
    ? simulation.samples.slice(
        0,
        Math.max(1, Math.min(visibleCount || 1, totalSamples)),
      )
    : [];
  const sparkValues = visibleSamples.map((sample) => sample.value);

  return (
    <ToolView>
      <ToolSection
        title="PID controller studio"
        description="One merged simulator/tuner with a bounded pure simulation, anti-windup and a static semantic-token chart. No timer-based loop or chart dependency."
        badge={<ToolBadge tone="neutral">Merged tool</ToolBadge>}
        actions={
          <ToolActions>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRunning((value) => !value)}
            >
              <HugeiconsIcon
                icon={isRunning ? PauseIcon : PlayIcon}
                strokeWidth={2}
                size={14}
                aria-hidden
              />
              {isRunning ? "Pause" : "Resume"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsRunning(false);
                setVisibleCount(0);
              }}
            >
              <HugeiconsIcon
                icon={RotateCcwIcon}
                strokeWidth={2}
                size={14}
                aria-hidden
              />
              Reset
            </Button>
          </ToolActions>
        }
      >
        <div className="tool-form-grid">
          <ToolSelectField
            label="Mode"
            items={MODE_ITEMS}
            value={mode}
            onValueChange={(value) => setMode(value as PidMode)}
          />
          <ToolNumberField
            label="Proportional Kp"
            value={kp}
            onChange={setKp}
            min={0}
            step="0.1"
          />
          <ToolNumberField
            label="Integral Ki"
            value={ki}
            onChange={setKi}
            min={0}
            step="0.1"
          />
          <ToolNumberField
            label="Derivative Kd"
            value={kd}
            onChange={setKd}
            min={0}
            step="0.05"
          />
          <ToolNumberField
            label="Setpoint"
            value={setpoint}
            onChange={setSetpoint}
            step="0.1"
            hint={
              mode === "tuner"
                ? "Adjust the target while paused or running."
                : undefined
            }
          />
        </div>

        {simulation.ok ? (
          <>
            <ToolSparkline
              values={sparkValues}
              label={`PID ${mode} step response`}
              setpoint={Number(setpoint)}
            />
            <ToolResultGrid className="tool-result-grid-wide">
              <ToolResultCard
                label="Final process value"
                value={formatDecimal(simulation.finalValue, 4)}
                detail={`Error ${formatDecimal(simulation.finalError, 4)}`}
                tone={simulation.diverged ? "error" : "success"}
              />
              <ToolResultCard
                label="Overshoot"
                value={formatDecimal(simulation.overshootPercent, 2)}
                unit="%"
              />
              <ToolResultCard
                label="Settling time"
                value={
                  simulation.settlingTimeSeconds === null
                    ? "Not settled"
                    : formatDecimal(simulation.settlingTimeSeconds, 2)
                }
                unit={simulation.settlingTimeSeconds === null ? undefined : "s"}
              />
              <ToolResultCard
                label="Anti-windup stops"
                value={String(simulation.antiWindupActivations)}
                detail={`${visibleSamples.length}/${totalSamples} samples shown`}
              />
            </ToolResultGrid>
            <ToolStatus tone={simulation.diverged ? "error" : "neutral"}>
              <HugeiconsIcon
                icon={
                  simulation.diverged ? InformationCircleIcon : ActivityIcon
                }
                strokeWidth={2}
                size={14}
                aria-hidden
              />{" "}
              <span>{simulation.note}</span>
            </ToolStatus>
            <ToolStatus tone="neutral">
              <HugeiconsIcon
                icon={ChartLineIcon}
                strokeWidth={2}
                size={14}
                aria-hidden
              />{" "}
              <span>
                The chart is an inline SVG using semantic tokens. Reduced motion
                reveals all samples immediately; the animation frame is
                cancelled on pause or unmount.
              </span>
            </ToolStatus>
          </>
        ) : (
          <ToolStatus tone="error">{simulation.error}</ToolStatus>
        )}
        <ToolStatus tone="warning">
          <HugeiconsIcon
            icon={Settings01Icon}
            strokeWidth={2}
            size={14}
            aria-hidden
          />{" "}
          <span>
            Educational second-order plant only. It is not a controller for
            physical hardware.
          </span>
        </ToolStatus>
        <span className="tool-hidden" aria-hidden="true">
          {toolId}
        </span>
      </ToolSection>
    </ToolView>
  );
}
