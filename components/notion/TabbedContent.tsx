"use client";

// Adapted from PM-Web_V2 (AGPL-3.0); see THIRD_PARTY_NOTICES.md.
// Rebuilt on Animate UI's own tabs primitive: a highlight glides between the
// triggers, panels slide side by side and the height follows the active one.

import {
  Tabs,
  TabsContent,
  TabsContents,
  TabsHighlight,
  TabsHighlightItem,
  TabsList,
  TabsTrigger,
} from "@animate-ui/react/primitives/tabs";

type Tab = { title: string; html: string };

const valueOf = (index: number) => `tab-${index}`;

export function TabbedContent({ tabs }: { tabs: Tab[] }) {
  if (tabs.length === 0) return null;

  return (
    <Tabs defaultValue={valueOf(0)} className="rdr-tabs my-7 min-w-0">
      <div className="rdr-tabs-rail">
        <TabsHighlight className="absolute inset-0 z-0 rounded-[9px] bg-background shadow-[0_1px_2px_color-mix(in_oklch,var(--foreground)_12%,transparent),0_0_0_1px_color-mix(in_oklch,var(--foreground)_5%,transparent)] dark:bg-foreground/10 dark:shadow-[0_0_0_1px_color-mix(in_oklch,var(--foreground)_10%,transparent)]">
          <TabsList
            aria-label="Content tabs"
            className="inline-flex w-max items-center gap-0.5 rounded-xl bg-muted p-[3px] text-muted-foreground"
          >
            {tabs.map((tab, index) => (
              <TabsHighlightItem
                key={`${tab.title}-${index}`}
                value={valueOf(index)}
              >
                <TabsTrigger
                  value={valueOf(index)}
                  className="relative z-10 inline-flex h-8 items-center justify-center rounded-[9px] px-3.5 text-[13.5px] font-medium whitespace-nowrap text-muted-foreground outline-none transition-colors duration-300 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[state=active]:text-foreground"
                >
                  {tab.title || `Tab ${index + 1}`}
                </TabsTrigger>
              </TabsHighlightItem>
            ))}
          </TabsList>
        </TabsHighlight>
      </div>
      <TabsContents className="mt-2.5 rounded-2xl bg-card text-card-foreground ring-1 ring-border">
        {tabs.map((tab, index) => (
          <TabsContent
            key={`${tab.title}-${index}`}
            value={valueOf(index)}
            className="min-w-0"
          >
            <div
              className="notion-markdown min-w-0 p-5 leading-7 text-foreground/90 md:p-6"
              dangerouslySetInnerHTML={{ __html: tab.html }}
            />
          </TabsContent>
        ))}
      </TabsContents>
    </Tabs>
  );
}
