"use client";

import { Clock01Icon, ToolsIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { TOOL_CATEGORIES, type ToolMeta } from "@/lib/tools/catalog";

export type ToolStateKind = "empty" | "planned" | "soon";

const CATEGORY_LABEL = new Map(
  TOOL_CATEGORIES.map((category) => [category.id, category.label]),
);

export function ToolStates({
  kind,
  tool,
}: {
  kind: ToolStateKind;
  tool?: ToolMeta | null;
}) {
  if (kind === "empty") {
    return (
      <div className="tool-state" data-slot="tool-state-empty">
        <span className="tool-state-icon" aria-hidden>
          <HugeiconsIcon icon={ToolsIcon} strokeWidth={2} size={18} />
        </span>
        <h2 className="tool-state-title">Select a tool</h2>
        <p className="tool-state-copy">
          Choose an entry from the catalogue. Search, categories, recents and
          favourites already work offline; the tool workspaces themselves arrive
          in the following phases.
        </p>
      </div>
    );
  }

  const isSoon = kind === "soon";
  const category = tool ? CATEGORY_LABEL.get(tool.category) : undefined;

  return (
    <div className="tool-state" data-slot={`tool-state-${kind}`}>
      <span className="tool-state-icon" aria-hidden>
        <HugeiconsIcon
          icon={isSoon ? Clock01Icon : ToolsIcon}
          strokeWidth={2}
          size={18}
        />
      </span>
      <h2 className="tool-state-title">
        {isSoon ? "Available soon" : "Not installed yet"}
      </h2>
      <p className="tool-state-copy">
        {isSoon
          ? (tool?.note ??
            "This tool has a reserved space in the catalogue and will be ported later.")
          : `This tool is reserved in the catalogue and will be ported in ${tool?.phase ?? "a later phase"}. Its formulas and flow will be verified rather than copied from v1.`}
      </p>
      {tool ? (
        <div className="tool-state-meta">
          {category ? <span className="tool-badge">{category}</span> : null}
          <span className="tool-badge">Offline-capable</span>
          <span className="tool-phase">{tool.phase}</span>
        </div>
      ) : null}
      {isSoon ? (
        <a
          className="tool-state-link"
          href="https://github.com/prasad-kmd/latex2mathml_next"
          target="_blank"
          rel="noreferrer"
        >
          Reference project
        </a>
      ) : null}
    </div>
  );
}
