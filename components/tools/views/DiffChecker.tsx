"use client";

import { Delete02Icon, DiffIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { ToolViewProps } from "@/lib/tools/registry";
import {
  MAX_DIFF_LINES,
  computeLineDiff,
  type DiffResult,
} from "@/lib/tools/logic/diff";
import {
  ToolActions,
  ToolCopyButton,
  ToolOption,
  ToolPane,
  ToolSection,
  ToolStatus,
  ToolTextarea,
  ToolView,
} from "./shared";

function prepareText(text: string, ignoreWhitespace: boolean): string {
  if (!ignoreWhitespace) return text;
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n");
}

function toUnifiedDiff(result: DiffResult | null): string {
  if (!result) return "";
  return result.rows
    .map((row) => {
      if (row.type === "unchanged") return `  ${row.left?.text ?? ""}`;
      if (row.type === "changed") {
        return `- ${row.left?.text ?? ""}\n+ ${row.right?.text ?? ""}`;
      }
      if (row.type === "removed") return `- ${row.left?.text ?? ""}`;
      return `+ ${row.right?.text ?? ""}`;
    })
    .join("\n");
}

export default function DiffChecker({ toolId }: ToolViewProps) {
  const [original, setOriginal] = useState("");
  const [modified, setModified] = useState("");
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);

  const result = useMemo(
    () =>
      computeLineDiff(
        prepareText(original, ignoreWhitespace),
        prepareText(modified, ignoreWhitespace),
      ),
    [original, modified, ignoreWhitespace],
  );

  const unified = useMemo(() => toUnifiedDiff(result), [result]);

  const handleClear = () => {
    setOriginal("");
    setModified("");
  };

  const status = result.truncated
    ? {
        tone: "warning" as const,
        text: `Input was capped at ${MAX_DIFF_LINES.toLocaleString()} lines per side. Showing the first block only.`,
      }
    : result.identical
      ? {
          tone: "success" as const,
          text: "Texts are identical after line-ending normalisation.",
        }
      : {
          tone: "neutral" as const,
          text: `${result.stats.added.toLocaleString()} added · ${result.stats.removed.toLocaleString()} removed · ${result.stats.unchanged.toLocaleString()} unchanged`,
        };

  return (
    <ToolView>
      <ToolSection
        title="Line comparison"
        description="Real LCS diff with CRLF normalisation, paired changes and bounded inputs."
        actions={
          <>
            <ToolCopyButton value={unified} label="Copy unified diff" />
            <Button variant="ghost" size="sm" onClick={handleClear}>
              <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} size={14} />
              Clear
            </Button>
          </>
        }
      >
        <div className="tool-split">
          <ToolPane label="Original">
            <ToolTextarea
              value={original}
              onChange={(event) => setOriginal(event.currentTarget.value)}
              placeholder="Paste the original text here…"
              aria-label={`${toolId} original text`}
            />
          </ToolPane>
          <ToolPane label="Modified">
            <ToolTextarea
              value={modified}
              onChange={(event) => setModified(event.currentTarget.value)}
              placeholder="Paste the modified text here…"
              aria-label={`${toolId} modified text`}
            />
          </ToolPane>
        </div>

        <ToolActions>
          <ToolOption
            label="Trim line whitespace"
            hint="Ignore leading and trailing spaces on each line"
          >
            <Switch
              checked={ignoreWhitespace}
              onCheckedChange={(checked) => setIgnoreWhitespace(checked)}
              aria-label="Ignore leading and trailing line whitespace"
            />
          </ToolOption>
          <span className="tool-inline-note">
            <HugeiconsIcon
              icon={DiffIcon}
              strokeWidth={2}
              size={14}
              aria-hidden
            />
            Live diff
          </span>
        </ToolActions>

        <ToolStatus tone={status.tone}>{status.text}</ToolStatus>

        <div className="tool-diff-wrap">
          <table className="tool-diff-table" aria-label="Line diff result">
            <thead>
              <tr>
                <th scope="col">Original</th>
                <th scope="col">Modified</th>
                <th scope="col">Change</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="tool-diff-empty">
                    {result.identical
                      ? "Both texts are empty or identical."
                      : "No diff rows to show."}
                  </td>
                </tr>
              ) : (
                result.rows.map((row, index) => (
                  <tr key={index} className={`tool-diff-row is-${row.type}`}>
                    <td className="tool-diff-line">
                      <span className="tool-diff-number">
                        {row.left?.number ?? ""}
                      </span>
                      <span className="tool-diff-text">
                        {row.left?.text ?? ""}
                      </span>
                    </td>
                    <td className="tool-diff-line">
                      <span className="tool-diff-number">
                        {row.right?.number ?? ""}
                      </span>
                      <span className="tool-diff-text">
                        {row.right?.text ?? ""}
                      </span>
                    </td>
                    <td className="tool-diff-marker" aria-hidden>
                      {row.type === "added"
                        ? "+"
                        : row.type === "removed"
                          ? "−"
                          : row.type === "changed"
                            ? "±"
                            : "·"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </ToolSection>
    </ToolView>
  );
}
