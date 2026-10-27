"use client";

// Adapted from PM-Web_V2 (AGPL-3.0); see THIRD_PARTY_NOTICES.md.

import { useId, useState } from "react";

type Tab = { title: string; html: string };

export function TabbedContent({ tabs }: { tabs: Tab[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const id = useId().replace(/:/g, "");
  if (tabs.length === 0) return null;
  const activeTab = tabs[activeIndex] ?? tabs[0];

  return (
    <section className="my-7 overflow-hidden rounded-2xl border border-border bg-card">
      <div
        className="flex gap-1 overflow-x-auto border-b border-border px-3 pt-3"
        role="tablist"
        aria-label="Content tabs"
      >
        {tabs.map((tab, index) => (
          <button
            key={`${tab.title}-${index}`}
            id={`${id}-tab-${index}`}
            type="button"
            role="tab"
            aria-selected={index === activeIndex}
            aria-controls={`${id}-panel`}
            tabIndex={index === activeIndex ? 0 : -1}
            onClick={() => setActiveIndex(index)}
            onKeyDown={(event) => {
              const nextIndex =
                event.key === "ArrowRight"
                  ? (index + 1) % tabs.length
                  : event.key === "ArrowLeft"
                    ? (index - 1 + tabs.length) % tabs.length
                    : event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? tabs.length - 1
                        : index;
              if (nextIndex !== index) {
                event.preventDefault();
                setActiveIndex(nextIndex);
                document.getElementById(`${id}-tab-${nextIndex}`)?.focus();
              }
            }}
            className={`shrink-0 border-b-2 px-4 py-2.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${index === activeIndex ? "border-primary font-medium text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {tab.title}
          </button>
        ))}
      </div>
      <div
        id={`${id}-panel`}
        role="tabpanel"
        aria-labelledby={`${id}-tab-${activeIndex}`}
        className="notion-markdown min-w-0 p-5 leading-7 text-foreground/90 md:p-6"
        dangerouslySetInnerHTML={{ __html: activeTab.html }}
      />
    </section>
  );
}
