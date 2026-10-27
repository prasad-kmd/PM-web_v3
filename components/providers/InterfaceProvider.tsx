"use client";

import { AnimateUIProvider } from "@animate-ui/react/provider";
import { TooltipProvider } from "@animate-ui/react/primitives/tooltip";
import { ContentBookmarksProvider } from "@/components/notion/ContentBookmarksProvider";

export function InterfaceProvider({ children }: { children: React.ReactNode }) {
  return (
    <AnimateUIProvider checkAnimation="draw">
      <TooltipProvider>
        <ContentBookmarksProvider>{children}</ContentBookmarksProvider>
      </TooltipProvider>
    </AnimateUIProvider>
  );
}
