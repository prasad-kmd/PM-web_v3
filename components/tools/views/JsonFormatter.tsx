"use client";

import {
  BracesIcon,
  Delete02Icon,
  Download01Icon,
  Upload01Icon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { toast } from "sonner";
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
  JSON_INDENT_OPTIONS,
  formatJson,
  minifyJson,
  parseJsonIndent,
  type JsonIndent,
} from "@/lib/tools/logic/json";
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

const INDENT_ITEMS = JSON_INDENT_OPTIONS.map((value) => ({
  value: String(value),
  label: value === 0 ? "Minified (0)" : `${value} spaces`,
}));

export default function JsonFormatter({ toolId }: ToolViewProps) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [indent, setIndent] = useState<JsonIndent>(2);
  const fileRef = useRef<HTMLInputElement>(null);

  const run = useCallback((next: ReturnType<typeof formatJson>) => {
    if (next.ok) {
      setOutput(next.output);
      setError(null);
    } else {
      setOutput("");
      setError(next.error);
    }
  }, []);

  const handleFormat = () => run(formatJson(input, indent));
  const handleMinify = () => run(minifyJson(input));

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setInput(text);
      setOutput("");
      setError(null);
      toast.success(`Imported ${file.name}`, { duration: 2500 });
    } catch {
      toast.error("Could not read that file", { duration: 2500 });
    }
    event.target.value = "";
  };

  const handleExport = () => {
    if (!output) return;
    const blob = new Blob([output], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "formatted.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    setInput("");
    setOutput("");
    setError(null);
  };

  const stats = useMemo(() => {
    const characters = input.length;
    const lines = input ? input.split("\n").length : 0;
    return { characters, lines };
  }, [input]);

  const status = error
    ? { tone: "error" as const, text: error }
    : output
      ? {
          tone: "success" as const,
          text: `Valid JSON · ${stats.characters.toLocaleString()} characters · ${stats.lines.toLocaleString()} lines`,
        }
      : {
          tone: "neutral" as const,
          text: "Paste JSON, then format or minify. All processing stays in this window.",
        };

  return (
    <ToolView>
      <ToolSection
        title="JSON workspace"
        description="Strict local parsing with bounded indentation choices and Unicode-safe output."
        actions={
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              className="tool-hidden-input"
              onChange={handleImport}
              aria-label="Import a JSON file"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
            >
              <HugeiconsIcon icon={Upload01Icon} strokeWidth={2} size={14} />
              Import
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={!output}
            >
              <HugeiconsIcon icon={Download01Icon} strokeWidth={2} size={14} />
              Export
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClear}>
              <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} size={14} />
              Clear
            </Button>
          </>
        }
      >
        <div className="tool-split">
          <ToolPane label="Input JSON">
            <ToolTextarea
              value={input}
              onChange={(event) => setInput(event.currentTarget.value)}
              placeholder={'{\n  "example": true\n}'}
              aria-label={`${toolId} input`}
            />
          </ToolPane>
          <ToolPane
            label="Formatted output"
            actions={
              <ToolCopyButton value={output} label="Copy formatted JSON" />
            }
          >
            <ToolOutput
              value={output}
              placeholder="Formatted JSON will appear here."
            />
          </ToolPane>
        </div>

        <ToolActions>
          <Button onClick={handleFormat}>
            <HugeiconsIcon icon={BracesIcon} strokeWidth={2} size={14} />
            Format
          </Button>
          <Button variant="secondary" onClick={handleMinify}>
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
              strokeWidth={2}
              size={14}
            />
            Minify
          </Button>
          <div className="tool-inline-option">
            <span className="tool-inline-label">Indentation</span>
            <Select
              items={INDENT_ITEMS}
              value={String(indent)}
              onValueChange={(next) => {
                if (next !== null) setIndent(parseJsonIndent(next));
              }}
            >
              <SelectTrigger aria-label="Indentation">
                <SelectValue placeholder="Choose indentation" />
              </SelectTrigger>
              <SelectPopup>
                {INDENT_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          </div>
        </ToolActions>

        <ToolStatus tone={status.tone}>{status.text}</ToolStatus>
      </ToolSection>
    </ToolView>
  );
}
