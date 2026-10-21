"use client";

import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipTrigger,
} from "@animate-ui/react/primitives/tooltip";

export function WorkspaceTooltip({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactElement;
}) {
  return (
    <Tooltip side="bottom" align="start" sideOffset={8}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className="rounded-md bg-foreground px-3 py-1.5 text-xs text-background shadow-md">
        <TooltipArrow className="size-2.5 fill-foreground" />
        <p className="whitespace-nowrap">{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}
