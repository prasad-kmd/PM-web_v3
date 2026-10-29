"use client";

import type { ReactNode } from "react";
import { Collapsible } from "@animate-ui/react/primitives/base-ui/collapsible";

const OPEN_TRANSITION = {
  duration: 0.28,
  ease: [0.22, 1, 0.36, 1] as const,
};

const CLOSE_TRANSITION = {
  duration: 0.22,
  ease: [0.4, 0, 0.2, 1] as const,
};

export function ToggleBlock({
  title,
  children,
  defaultOpen = false,
  headingId,
  headingLevel,
}: {
  title: ReactNode;
  children?: ReactNode;
  defaultOpen?: boolean;
  headingId?: string;
  headingLevel?: 2 | 3 | 4;
}) {
  if (headingLevel) {
    const HeadingTag = `h${headingLevel}` as const;
    const headingClass =
      headingLevel === 2
        ? "scroll-mt-24 pt-5 font-sans text-3xl font-semibold tracking-tight text-foreground"
        : headingLevel === 3
          ? "scroll-mt-24 pt-4 font-sans text-2xl font-semibold tracking-tight text-foreground"
          : "scroll-mt-24 pt-3 font-sans text-xl font-semibold tracking-tight text-foreground";
    const chevronOffset =
      headingLevel === 2 ? "mt-2.5" : headingLevel === 3 ? "mt-2" : "mt-1.5";

    return (
      <Collapsible.Root defaultOpen={defaultOpen} className="notion-toggle">
        <HeadingTag id={headingId} className={headingClass}>
          <Collapsible.Trigger
            nativeButton={false}
            render={<div />}
            className="notion-toggle-trigger -mx-2 flex cursor-pointer select-none items-start gap-2.5 rounded-lg px-2 py-1 text-left transition-colors hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <svg
              className={`notion-toggle-chevron ${chevronOffset} size-4 shrink-0 text-muted-foreground`}
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="m6 3 5 5-5 5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span
              className="min-w-0 flex-1"
              onClick={(event) => {
                if ((event.target as HTMLElement | null)?.closest("a")) {
                  event.stopPropagation();
                }
              }}
            >
              {title}
            </span>
          </Collapsible.Trigger>
        </HeadingTag>
        {children ? (
          <Collapsible.Panel
            hiddenUntilFound
            transition={OPEN_TRANSITION}
            exitTransition={CLOSE_TRANSITION}
            className="notion-toggle-panel"
          >
            <div className="ml-3 space-y-3 border-l border-border pb-2 pl-5 pt-3">
              {children}
            </div>
          </Collapsible.Panel>
        ) : null}
      </Collapsible.Root>
    );
  }

  return (
    <Collapsible.Root
      defaultOpen={defaultOpen}
      className="notion-toggle rounded-lg border border-border"
    >
      <Collapsible.Trigger
        nativeButton={false}
        render={<div />}
        className="notion-toggle-trigger flex cursor-pointer select-none items-start gap-3 rounded-lg px-4 py-3 font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <svg
          className="notion-toggle-chevron mt-1 size-4 shrink-0 text-muted-foreground"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="m6 3 5 5-5 5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span
          className="min-w-0 flex-1"
          onClick={(event) => {
            if ((event.target as HTMLElement | null)?.closest("a")) {
              event.stopPropagation();
            }
          }}
        >
          {title}
        </span>
      </Collapsible.Trigger>
      {children ? (
        <Collapsible.Panel
          hiddenUntilFound
          transition={OPEN_TRANSITION}
          exitTransition={CLOSE_TRANSITION}
          className="notion-toggle-panel"
        >
          <div className="mx-4 ml-6 space-y-3 border-l border-border pb-4 pl-5 pt-2">
            {children}
          </div>
        </Collapsible.Panel>
      ) : null}
    </Collapsible.Root>
  );
}
