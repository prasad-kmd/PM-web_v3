import type { ComponentType } from "react";

/** Props every ported tool view receives from the Tool Bench. */
export type ToolViewProps = {
  toolId: string;
};

export type ToolModule = { default: ComponentType<ToolViewProps> };
export type ToolLoader = () => Promise<ToolModule>;

/**
 * One lazy loader per ported tool.
 *
 * Phase 2 registers the five text/data tools. A later phase adds another entry
 * here and flips that tool's `status` to `ported` in `lib/tools/catalog.ts`.
 * Keep the key equal to the catalogue id. The dynamic import boundary is what
 * lets a ported tool be opened offline after its chunk has been warmed by
 * `warmToolModules()`.
 */
export const TOOL_LOADERS: Record<string, ToolLoader> = {
  "json-formatter": () => import("@/components/tools/views/JsonFormatter"),
  "html-encoder": () => import("@/components/tools/views/HtmlEncoder"),
  "data-transform": () => import("@/components/tools/views/DataTransform"),
  "diff-checker": () => import("@/components/tools/views/DiffChecker"),
  "regex-architect": () => import("@/components/tools/views/RegexArchitect"),
};

export function getToolLoader(toolId: string): ToolLoader | null {
  return TOOL_LOADERS[toolId] ?? null;
}
