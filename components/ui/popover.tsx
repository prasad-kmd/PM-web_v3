"use client";

import * as React from "react";
import { Popover as PopoverPrimitive } from "@animate-ui/react/primitives/base-ui/popover";
import { cn } from "@/lib/utils";

/** Coss + Animate UI Base UI Popover primitive composition. */
function Popover({ ...props }: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({
  className,
  ...props
}: PopoverPrimitive.Trigger.Props) {
  return (
    <PopoverPrimitive.Trigger
      data-slot="popover-trigger"
      className={cn(className)}
      {...props}
    />
  );
}

type PopoverPositionProps = Pick<
  PopoverPrimitive.Positioner.Props,
  "align" | "alignOffset" | "side" | "sideOffset"
>;

function PopoverPopup({
  className,
  align = "end",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 8,
  ...props
}: PopoverPrimitive.Popup.Props & PopoverPositionProps) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        className="isolate z-50 outline-none"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <PopoverPrimitive.Popup
          data-slot="popover-popup"
          className={cn(
            "bg-popover text-popover-foreground ring-foreground/10 relative z-50 origin-(--transform-origin) rounded-[var(--radius)] bg-popover/78 p-3.5 shadow-md ring-1 outline-none before:pointer-events-none before:absolute before:inset-0 before:-z-1 before:rounded-[inherit] before:backdrop-blur-2xl before:backdrop-saturate-150",
            className,
          )}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}

function PopoverTitle({ className, ...props }: PopoverPrimitive.Title.Props) {
  return (
    <PopoverPrimitive.Title
      data-slot="popover-title"
      className={cn("text-sm font-medium leading-none", className)}
      {...props}
    />
  );
}

function PopoverDescription({
  className,
  ...props
}: PopoverPrimitive.Description.Props) {
  return (
    <PopoverPrimitive.Description
      data-slot="popover-description"
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

function PopoverClose({ className, ...props }: PopoverPrimitive.Close.Props) {
  return (
    <PopoverPrimitive.Close
      data-slot="popover-close"
      className={cn(className)}
      {...props}
    />
  );
}

export {
  Popover,
  PopoverClose,
  PopoverDescription,
  PopoverPopup,
  PopoverPopup as PopoverContent,
  PopoverTitle,
  PopoverTrigger,
};
