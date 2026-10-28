"use client";

import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipTrigger,
} from "@animate-ui/react/primitives/tooltip";

/**
 * The workspace tooltip. Use it instead of the native `title` attribute, which
 * shows an unstyled, delayed browser tooltip; keep `aria-label` on icon-only
 * triggers for screen readers.
 *
 * Hidden on touch-only screens (`hover: none`): a tap would otherwise leave the
 * bubble open until the next tap elsewhere.
 */
export function WorkspaceTooltip({
  label,
  shortcut,
  side = "bottom",
  align = "start",
  sideOffset = 8,
  children,
}: {
  label: React.ReactNode;
  /** Optional keyboard shortcut shown after the label, e.g. "O". */
  shortcut?: string;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  children: React.ReactElement;
}) {
  return (
    <Tooltip side={side} align={align} sideOffset={sideOffset}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className="rounded-md bg-foreground px-3 py-1.5 text-xs text-background shadow-md [@media(hover:none)]:hidden">
        <TooltipArrow className="size-2.5 fill-foreground" />
        <p className="flex items-center gap-2 whitespace-nowrap">
          {label}
          {shortcut ? (
            <kbd className="rounded border border-background/25 px-1 font-sans text-[10px] leading-4 text-background/75">
              {shortcut}
            </kbd>
          ) : null}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
