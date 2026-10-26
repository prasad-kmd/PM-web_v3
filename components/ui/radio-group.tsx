"use client";

import * as React from "react";
import { Radio as RadioPrimitive } from "@animate-ui/react/primitives/base-ui/radio";
import { RadioGroup as RadioGroupPrimitive } from "@animate-ui/react/primitives/base-ui/radio-group";
import { cn } from "@/lib/utils";

/** Coss Segmented RadioGroup built on Animate UI + Base UI Radio primitives. */
function SegmentedRadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive>) {
  return (
    <RadioGroupPrimitive
      data-slot="segmented-radio-group"
      className={cn(
        "inline-grid grid-flow-col auto-cols-fr items-center gap-1 rounded-lg border border-border bg-background p-1",
        className,
      )}
      {...props}
    />
  );
}

function SegmentedRadioItem({
  className,
  children,
  ...props
}: RadioPrimitive.Root.Props) {
  return (
    <RadioPrimitive.Root
      data-slot="segmented-radio-item"
      className={cn(
        "relative inline-flex h-7 cursor-pointer items-center justify-center rounded-md px-3 text-xs font-medium text-muted-foreground transition-colors outline-none select-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-checked:bg-accent data-checked:text-accent-foreground data-checked:shadow-2xs",
        className,
      )}
      {...props}
    >
      {children}
    </RadioPrimitive.Root>
  );
}

export { SegmentedRadioGroup, SegmentedRadioItem };
