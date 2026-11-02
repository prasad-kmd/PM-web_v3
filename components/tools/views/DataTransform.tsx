"use client";

import { ArrowLeftRightIcon, BinaryCodeIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ToolViewProps } from "@/lib/tools/registry";
import {
  MAX_TRANSFORM_LENGTH,
  TRANSFORM_MODES,
  transformData,
  type TransformDirection,
  type TransformMode,
} from "@/lib/tools/logic/data-transform";
import {
  ToolActions,
  ToolCopyButton,
  ToolOutput,
  ToolPane,
  ToolSection,
  ToolStatus,
  ToolTextarea,
  ToolView,
} from "./shared";

export default function DataTransform({ toolId }: ToolViewProps) {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<TransformMode>("base64");
  const [direction, setDirection] = useState<TransformDirection>("encode");

  const result = useMemo(() => {
    if (!input) return { output: "", error: null as string | null };
    const next = transformData(mode, direction, input);
    return next.ok
      ? { output: next.output, error: null }
      : { output: "", error: next.error };
  }, [input, mode, direction]);

  const modeLabel =
    TRANSFORM_MODES.find((entry) => entry.value === mode)?.label ?? mode;

  const handleSwap = () => {
    setInput(result.output);
    setDirection((current) => (current === "encode" ? "decode" : "encode"));
  };

  return (
    <ToolView>
      <ToolSection
        title="Data transformation"
        description="Base64, URL, hex and binary codecs over UTF-8 bytes. Unicode and emoji round-trip exactly."
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSwap}
            disabled={!result.output}
          >
            <HugeiconsIcon
              icon={ArrowLeftRightIcon}
              strokeWidth={2}
              size={14}
            />
            Swap
          </Button>
        }
      >
        <div className="tool-split">
          <ToolPane label="Input">
            <ToolTextarea
              value={input}
              onChange={(event) => setInput(event.currentTarget.value)}
              placeholder="Hello 🌍 é සිංහල"
              aria-label={`${toolId} input`}
            />
          </ToolPane>
          <ToolPane
            label="Output"
            actions={
              <ToolCopyButton value={result.output} label="Copy output" />
            }
          >
            <ToolOutput
              value={result.output}
              placeholder="Transformed data will appear here."
            />
          </ToolPane>
        </div>

        <ToolActions>
          <Button
            variant={direction === "encode" ? "default" : "outline"}
            onClick={() => setDirection("encode")}
          >
            <HugeiconsIcon icon={BinaryCodeIcon} strokeWidth={2} size={14} />
            Encode
          </Button>
          <Button
            variant={direction === "decode" ? "default" : "outline"}
            onClick={() => setDirection("decode")}
          >
            <HugeiconsIcon
              icon={ArrowLeftRightIcon}
              strokeWidth={2}
              size={14}
            />
            Decode
          </Button>
          <div className="tool-inline-option">
            <span className="tool-inline-label">Codec</span>
            <Select
              items={TRANSFORM_MODES}
              value={mode}
              onValueChange={(next) => {
                if (next !== null) setMode(next as TransformMode);
              }}
            >
              <SelectTrigger aria-label="Transformation codec">
                <SelectValue placeholder="Choose codec" />
              </SelectTrigger>
              <SelectPopup>
                {TRANSFORM_MODES.map((entry) => (
                  <SelectItem key={entry.value} value={entry.value}>
                    {entry.label}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          </div>
        </ToolActions>

        {result.error ? (
          <ToolStatus tone="error">{result.error}</ToolStatus>
        ) : (
          <ToolStatus tone="neutral">
            {modeLabel} · {direction} · {input.length.toLocaleString()} of{" "}
            {MAX_TRANSFORM_LENGTH.toLocaleString()} characters · processed
            locally
          </ToolStatus>
        )}
      </ToolSection>
    </ToolView>
  );
}
