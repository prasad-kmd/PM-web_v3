"use client";

import { Cancel01Icon, FavouriteIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { WorkspaceTooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ToolMeta } from "@/lib/tools/catalog";

const STATUS_LABEL: Record<ToolMeta["status"], string> = {
  ported: "Ready",
  planned: "Not installed yet",
  soon: "Available soon",
};

export function ToolCatalog({
  tools,
  activeToolId,
  favourites,
  hydrated,
  tab,
  query,
  onSelect,
  onToggleFavourite,
  onClearRecents,
}: {
  tools: readonly ToolMeta[];
  activeToolId: string | null;
  favourites: readonly string[];
  hydrated: boolean;
  tab: string;
  query: string;
  onSelect: (id: string) => void;
  onToggleFavourite: (id: string) => void;
  onClearRecents?: () => void;
}) {
  const needsHydration =
    !hydrated && (tab === "recent" || tab === "favourites");
  const emptyTitle = needsHydration
    ? "Loading your tools…"
    : query.trim()
      ? "No matching tools"
      : tab === "recent"
        ? "No recently opened tools"
        : tab === "favourites"
          ? "No favourites yet"
          : "Nothing here yet";

  const emptyCopy = needsHydration
    ? "Reading local preferences."
    : query.trim()
      ? `No catalogue entry matches “${query.trim()}”. Try a shorter search term.`
      : tab === "recent"
        ? "Tools you open will appear here, newest first."
        : tab === "favourites"
          ? "Use the star beside a tool to pin it here."
          : "This category is reserved for upcoming tools.";

  return (
    <div className="tool-catalog" data-slot="tool-catalog">
      <div className="tool-catalog-head">
        <h3 className="tool-catalog-title">Catalogue</h3>
        <span className="tool-catalog-count">
          {needsHydration
            ? "…"
            : `${tools.length} tool${tools.length === 1 ? "" : "s"}`}
        </span>
      </div>

      {tools.length === 0 ? (
        <div className="tool-catalog-empty">
          <span className="tool-catalog-empty-title">{emptyTitle}</span>
          <span>{emptyCopy}</span>
          {tab === "recent" && onClearRecents && hydrated ? (
            <Button
              variant="ghost"
              size="xs"
              onClick={onClearRecents}
              aria-label="Clear recent tools"
            >
              <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} size={13} />
              Clear recents
            </Button>
          ) : null}
        </div>
      ) : (
        <ul className="tool-catalog-list" aria-label="Tool catalogue">
          {tools.map((tool) => {
            const isFavourite = favourites.includes(tool.id);
            const isActive = activeToolId === tool.id;
            return (
              <li
                key={tool.id}
                className="tool-row"
                data-active={isActive}
                data-status={tool.status}
              >
                <button
                  type="button"
                  className="tool-row-main"
                  onClick={() => onSelect(tool.id)}
                  aria-current={isActive ? "true" : undefined}
                >
                  <span className="tool-row-title">{tool.title}</span>
                  <span className="tool-row-desc">{tool.description}</span>
                  <span className="tool-row-meta">
                    <span className="tool-badge" data-status={tool.status}>
                      {STATUS_LABEL[tool.status]}
                    </span>
                    <span className="tool-phase">{tool.phase}</span>
                  </span>
                </button>
                <WorkspaceTooltip
                  label={
                    isFavourite ? "Remove from favourites" : "Add to favourites"
                  }
                  side="left"
                >
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className={cn("tool-row-fav", isFavourite && "is-active")}
                    onClick={() => onToggleFavourite(tool.id)}
                    aria-pressed={isFavourite}
                    aria-label={`${isFavourite ? "Remove" : "Add"} ${tool.title} ${isFavourite ? "from" : "to"} favourites`}
                  >
                    <HugeiconsIcon
                      icon={FavouriteIcon}
                      strokeWidth={2}
                      size={14}
                    />
                  </Button>
                </WorkspaceTooltip>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
