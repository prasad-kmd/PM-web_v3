"use client";

import {
  MessageMultiple01Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { MorphIcon } from "@/components/ui/morph-icon";
import { WorkspaceTooltip } from "@/components/ui/tooltip";
import { useDiscussion } from "./DiscussionContext";

/**
 * The comments button in the reader toolbar, next to Outline.
 *
 * The glyph morphs between a speech bubble and a close mark (the same
 * `MorphIcon` transition the save and share buttons use), and the pressed state
 * mirrors the sheet's: the toolbar and the panel never disagree about whether
 * the discussion is open.
 */
export function DiscussionToolbarButton() {
  const { open, openPanel, closePanel, count } = useDiscussion();

  return (
    <WorkspaceTooltip
      label={open ? "Close discussion" : "Discussion"}
      align="end"
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="rdr-tool rdr-comments-toggle"
        aria-pressed={open}
        aria-expanded={open}
        onClick={open ? closePanel : openPanel}
      >
        <MorphIcon
          icon={open ? Cancel01Icon : MessageMultiple01Icon}
          iconKey={open ? "close" : "discuss"}
        />
        <span className="rdr-comments-label">Comments</span>
        {count ? <span className="rdr-comments-count">{count}</span> : null}
      </Button>
    </WorkspaceTooltip>
  );
}
