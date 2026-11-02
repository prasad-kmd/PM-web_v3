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
 * Phase 1 intentionally maps nothing: every catalogue entry is a placeholder.
 * A later phase adds an entry here and flips that tool's `status` to `ported`
 * in `lib/tools/catalog.ts`. Keep the key equal to the catalogue id, e.g.
 *
 *   "json-formatter": () => import("@/components/tools/views/JsonFormatter"),
 *
 * The dynamic import boundary is what lets a ported tool be opened offline
 * after its chunk has been warmed by `warmToolModules()`.
 */
export const TOOL_LOADERS: Record<string, ToolLoader> = {};

export function getToolLoader(toolId: string): ToolLoader | null {
  return TOOL_LOADERS[toolId] ?? null;
}
