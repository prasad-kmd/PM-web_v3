"use client";

import { ArrowLeftRightIcon, CodeIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { ToolViewProps } from "@/lib/tools/registry";
import { decodeHtml, encodeHtml } from "@/lib/tools/logic/html";
import {
  ToolActions,
  ToolCopyButton,
  ToolOption,
  ToolOutput,
  ToolPane,
  ToolSection,
  ToolStatus,
  ToolTextarea,
  ToolView,
} from "./shared";

type Direction = "encode" | "decode";

export default function HtmlEncoder({ toolId }: ToolViewProps) {
  const [input, setInput] = useState("");
  const [direction, setDirection] = useState<Direction>("encode");
  const [nested, setNested] = useState(false);

  const output = useMemo(() => {
    if (!input) return "";
    return direction === "encode"
      ? encodeHtml(input)
      : decodeHtml(input, nested ? 2 : 1);
  }, [input, direction, nested]);

  const entityCount = useMemo(
    () =>
      (output.match(/&(?:#x[0-9a-f]+|#[0-9]+|[a-z][a-z0-9]*);/gi) || []).length,
    [output],
  );

  const handleSwap = () => {
    setInput(output);
    setDirection((current) => (current === "encode" ? "decode" : "encode"));
  };

  const statusText =
    direction === "encode"
      ? `Encoded ${input.length.toLocaleString()} characters · ${entityCount.toLocaleString()} entities written`
      : `Decoded ${input.length.toLocaleString()} characters · ${nested ? "2" : "1"} pass${nested ? "es" : ""}`;

  return (
    <ToolView>
      <ToolSection
        title="HTML entities"
        description="Encode markup for safe display, or decode entities back to literal text. Nothing is parsed as HTML."
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSwap}
            disabled={!input}
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
              placeholder={'<div class="note">Tom\'s & "quote"</div>'}
              aria-label={`${toolId} input`}
            />
          </ToolPane>
          <ToolPane
            label="Output"
            actions={<ToolCopyButton value={output} label="Copy output" />}
          >
            <ToolOutput
              value={output}
              placeholder="Encoded or decoded text will appear here."
            />
          </ToolPane>
        </div>

        <ToolActions>
          <Button
            variant={direction === "encode" ? "default" : "outline"}
            onClick={() => setDirection("encode")}
          >
            <HugeiconsIcon icon={CodeIcon} strokeWidth={2} size={14} />
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
          <ToolOption
            label="Decode nested entities"
            hint="Resolve double-encoded markup in two passes"
          >
            <Switch
              checked={nested}
              onCheckedChange={(checked) => setNested(checked)}
              disabled={direction === "encode"}
              aria-label="Decode nested entities in two passes"
            />
          </ToolOption>
        </ToolActions>

        <ToolStatus tone="neutral">{statusText}</ToolStatus>
      </ToolSection>
    </ToolView>
  );
}
