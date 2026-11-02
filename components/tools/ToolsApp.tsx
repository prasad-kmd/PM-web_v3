"use client";

import {
  CalculatorIcon,
  Cancel01Icon,
  CodeIcon,
  DocumentCodeIcon,
  FavouriteIcon,
  HistoryIcon,
  Search01Icon,
  Settings02Icon,
  ToolsIcon,
  Wrench01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Tabs,
  TabsContent,
  TabsContents,
  TabsHighlight,
  TabsHighlightItem,
  TabsList,
  TabsTrigger,
} from "@animate-ui/react/primitives/tabs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WorkspaceTooltip } from "@/components/ui/tooltip";
import { useToolState } from "@/hooks/use-tool-state";
import {
  TOOL_CATEGORIES,
  TOOL_CATALOG,
  TOOL_IDS,
  getToolById,
  matchesToolQuery,
  type ToolCategory,
  type ToolMeta,
} from "@/lib/tools/catalog";
import { ToolCatalog } from "./ToolCatalog";
import { ToolShell } from "./ToolShell";

const CATEGORY_ICON: Record<ToolCategory, typeof ToolsIcon> = {
  electronics: ToolsIcon,
  mechanical: Wrench01Icon,
  mechatronics: Settings02Icon,
  math: CalculatorIcon,
  web: CodeIcon,
  core: DocumentCodeIcon,
};

const TOOL_TABS: readonly {
  value: string;
  label: string;
  icon: typeof ToolsIcon;
}[] = [
  { value: "all", label: "All tools", icon: ToolsIcon },
  { value: "recent", label: "Recent", icon: HistoryIcon },
  { value: "favourites", label: "Favourites", icon: FavouriteIcon },
  ...TOOL_CATEGORIES.map((category) => ({
    value: category.id,
    label: category.label,
    icon: CATEGORY_ICON[category.id],
  })),
];

const PLANNED_COUNT = TOOL_CATALOG.filter(
  (tool) => tool.status === "planned",
).length;
const SOON_COUNT = TOOL_CATALOG.filter((tool) => tool.status === "soon").length;
const READY_COUNT = TOOL_CATALOG.filter(
  (tool) => tool.status === "ported",
).length;

function toolIdFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  const id = new URLSearchParams(window.location.search).get("tool");
  return getToolById(id) ? id : null;
}

export function ToolsApp() {
  const [activeTab, setActiveTab] = useState("all");
  const [query, setQuery] = useState("");
  const [activeToolId, setActiveToolId] = useState<string | null>(
    toolIdFromLocation,
  );

  const {
    recents,
    favourites,
    hydrated,
    recordOpen,
    toggleFavourite,
    clearRecents,
  } = useToolState(TOOL_IDS);

  useEffect(() => {
    const sync = () => setActiveToolId(toolIdFromLocation());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const selectTool = useCallback(
    (id: string) => {
      if (!getToolById(id)) return;
      setActiveToolId(id);
      recordOpen(id);
      const url = new URL(window.location.href);
      url.searchParams.set("tool", id);
      window.history.replaceState(null, "", url.toString());
    },
    [recordOpen],
  );

  const clearTool = useCallback(() => {
    setActiveToolId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("tool");
    window.history.replaceState(null, "", url.toString());
  }, []);

  const toolsByTab = useMemo(() => {
    const byTab = new Map<string, ToolMeta[]>();
    for (const tab of TOOL_TABS) {
      let list: readonly ToolMeta[];
      if (tab.value === "recent") {
        list = recents
          .map((id) => getToolById(id))
          .filter((tool): tool is ToolMeta => tool !== null);
      } else if (tab.value === "favourites") {
        list = favourites
          .map((id) => getToolById(id))
          .filter((tool): tool is ToolMeta => tool !== null);
      } else if (tab.value === "all") {
        list = TOOL_CATALOG;
      } else {
        list = TOOL_CATALOG.filter((tool) => tool.category === tab.value);
      }
      byTab.set(
        tab.value,
        list.filter((tool) => matchesToolQuery(tool, query)),
      );
    }
    return byTab;
  }, [recents, favourites, query]);

  const activeTool = getToolById(activeToolId);

  return (
    <Tabs
      value={activeTab}
      onValueChange={setActiveTab}
      orientation="vertical"
      className="tools-layout"
    >
      <aside className="tools-sidebar" aria-label="Tool Bench navigation">
        <div className="tools-sidebar-head">
          <p className="tools-eyebrow">Tool Bench</p>
          <p className="tools-sidebar-copy">Offline engineering utilities</p>
        </div>

        <div className="tools-search">
          <HugeiconsIcon
            className="tools-search-icon"
            icon={Search01Icon}
            strokeWidth={2}
            size={14}
            aria-hidden
          />
          <Input
            unstyled
            nativeInput
            className="tools-search-input-wrap"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Search tools…"
            aria-label="Search tools"
          />
          {query ? (
            <WorkspaceTooltip label="Clear search" side="bottom" align="end">
              <Button
                variant="ghost"
                size="icon-xs"
                className="tools-search-clear"
                onClick={() => setQuery("")}
                aria-label="Clear search"
              >
                <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} size={13} />
              </Button>
            </WorkspaceTooltip>
          ) : null}
        </div>

        <TabsHighlight className="tools-tab-highlight">
          <TabsList className="tools-tabs-list">
            {TOOL_TABS.map((tab) => (
              <TabsHighlightItem
                key={tab.value}
                value={tab.value}
                className="tools-tab-item"
              >
                <TabsTrigger value={tab.value} className="tools-nav-item">
                  <HugeiconsIcon icon={tab.icon} strokeWidth={2} size={15} />
                  <span>{tab.label}</span>
                  {tab.value === "recent" && hydrated && recents.length ? (
                    <span className="tools-tab-count">{recents.length}</span>
                  ) : null}
                  {tab.value === "favourites" &&
                  hydrated &&
                  favourites.length ? (
                    <span className="tools-tab-count">{favourites.length}</span>
                  ) : null}
                </TabsTrigger>
              </TabsHighlightItem>
            ))}
          </TabsList>
        </TabsHighlight>

        <div className="tools-sidebar-foot">
          <span className="tools-dot" aria-hidden />
          <span>
            {READY_COUNT ? `${READY_COUNT} ready · ` : ""}
            {PLANNED_COUNT} planned · {SOON_COUNT} available soon
          </span>
        </div>
      </aside>

      <TabsContents className="tools-tabs-contents">
        {TOOL_TABS.map((tab) => (
          <TabsContent
            key={tab.value}
            value={tab.value}
            className="tools-tab-content"
          >
            <ToolCatalog
              tools={toolsByTab.get(tab.value) ?? []}
              activeToolId={activeToolId}
              favourites={favourites}
              hydrated={hydrated}
              tab={tab.value}
              query={query}
              onSelect={selectTool}
              onToggleFavourite={toggleFavourite}
              onClearRecents={tab.value === "recent" ? clearRecents : undefined}
            />
          </TabsContent>
        ))}
      </TabsContents>

      <ToolShell
        tool={activeTool}
        favourites={favourites}
        onToggleFavourite={toggleFavourite}
        onClear={clearTool}
      />
    </Tabs>
  );
}
