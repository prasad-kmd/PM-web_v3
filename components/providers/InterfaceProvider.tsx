"use client";

import { AnimateUIProvider } from "@animate-ui/react/provider";
import { TooltipProvider } from "@animate-ui/react/primitives/tooltip";

export function InterfaceProvider({ children }: { children: React.ReactNode }) {
  return (
    <AnimateUIProvider checkAnimation="draw">
      <TooltipProvider>{children}</TooltipProvider>
    </AnimateUIProvider>
  );
}
