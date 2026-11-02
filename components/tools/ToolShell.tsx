"use client";

import {
  Cancel01Icon,
  FavouriteIcon,
  Link01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { lazy, Suspense, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { WorkspaceTooltip } from "@/components/ui/tooltip";
import { LoadingView } from "@/components/system/states/LoadingView";
import { TOOL_CATEGORIES, type ToolMeta } from "@/lib/tools/catalog";
import { getToolLoader, type ToolLoader } from "@/lib/tools/registry";
import { cn } from "@/lib/utils";
import { ToolStates } from "./ToolStates";

const CATEGORY_LABEL = new Map(
  TOOL_CATEGORIES.map((category) => [category.id, category.label]),
);

function LazyToolView({
  loader,
  toolId,
}: {
  loader: ToolLoader;
  toolId: string;
}) {
  const ToolView = useMemo(() => lazy(loader), [loader]);
  return (
    <Suspense fallback={<LoadingView label="tool" layout="listing" />}>
      <div className="tool-view-pane">
        <ToolView toolId={toolId} />
      </div>
    </Suspense>
  );
}

export function ToolShell({
  tool,
  favourites,
  onToggleFavourite,
  onClear,
}: {
  tool: ToolMeta | null;
  favourites: readonly string[];
  onToggleFavourite: (id: string) => void;
  onClear: () => void;
}) {
  const isFavourite = tool ? favourites.includes(tool.id) : false;
  const category = tool ? CATEGORY_LABEL.get(tool.category) : undefined;
  const loader = tool ? getToolLoader(tool.id) : null;

  const copyLink = () => {
    if (!tool || typeof window === "undefined") return;
    if (!navigator.clipboard) {
      toast.error("Clipboard is unavailable", { duration: 3000 });
      return;
    }
    void navigator.clipboard.writeText(window.location.href).then(
      () => toast.success("Link copied", { duration: 3000 }),
      () => toast.error("Could not copy the link", { duration: 3000 }),
    );
  };

  return (
    <section className="tools-view" aria-label="Tool workspace">
      <header className="tool-shell-header">
        <div className="tool-shell-heading">
          <p className="tool-shell-category">{category ?? "Tool Bench"}</p>
          <h2 className="tool-shell-title">{tool?.title ?? "Select a tool"}</h2>
          <p className="tool-shell-desc">
            {tool?.description ??
              "Offline engineering utilities, organised by category and ported in phases."}
          </p>
        </div>
        {tool ? (
          <div className="tool-shell-actions">
            <WorkspaceTooltip
              label={
                isFavourite ? "Remove from favourites" : "Add to favourites"
              }
              side="bottom"
              align="end"
            >
              <Button
                variant="ghost"
                size="icon-sm"
                className={cn("tool-shell-action", isFavourite && "is-active")}
                onClick={() => onToggleFavourite(tool.id)}
                aria-pressed={isFavourite}
                aria-label={`${isFavourite ? "Remove" : "Add"} ${tool.title} ${isFavourite ? "from" : "to"} favourites`}
              >
                <HugeiconsIcon icon={FavouriteIcon} strokeWidth={2} size={15} />
              </Button>
            </WorkspaceTooltip>
            <WorkspaceTooltip
              label="Copy link to this tool"
              side="bottom"
              align="end"
            >
              <Button
                variant="ghost"
                size="icon-sm"
                className="tool-shell-action"
                onClick={copyLink}
                aria-label="Copy link to this tool"
              >
                <HugeiconsIcon icon={Link01Icon} strokeWidth={2} size={15} />
              </Button>
            </WorkspaceTooltip>
            <WorkspaceTooltip label="Close tool" side="bottom" align="end">
              <Button
                variant="ghost"
                size="icon-sm"
                className="tool-shell-action"
                onClick={onClear}
                aria-label="Close tool"
              >
                <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} size={15} />
              </Button>
            </WorkspaceTooltip>
          </div>
        ) : null}
      </header>

      <div className="tool-shell-body">
        {!tool ? (
          <ToolStates kind="empty" />
        ) : tool.status === "soon" ? (
          <ToolStates kind="soon" tool={tool} />
        ) : loader ? (
          <LazyToolView loader={loader} toolId={tool.id} />
        ) : (
          <ToolStates kind="planned" tool={tool} />
        )}
      </div>
    </section>
  );
}
