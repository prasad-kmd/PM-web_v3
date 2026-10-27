"use client";

// Adapted from PM-Web_V2 (AGPL-3.0); see THIRD_PARTY_NOTICES.md.

import { useEffect, useId, useState } from "react";
import {
  Copy01Icon,
  Tick02Icon,
  ZoomInIcon,
  ZoomOutIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export function MermaidDiagram({
  chart,
  caption,
}: {
  chart: string;
  caption?: string;
}) {
  const reactId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [svg, setSvg] = useState("");
  const [error, setError] = useState(false);
  const [scale, setScale] = useState(1);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: document.documentElement.classList.contains("dark")
            ? "dark"
            : "default",
          fontFamily: "var(--font-body)",
        });
        const result = await mermaid.render(`pm-diagram-${reactId}`, chart);
        if (!cancelled) {
          setSvg(result.svg);
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    }
    void render();
    return () => {
      cancelled = true;
    };
  }, [chart, reactId]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(chart);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <figure className="my-7 overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
        <figcaption className="min-w-0 truncate text-xs text-muted-foreground">
          {caption || "Diagram"}
        </figcaption>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label="Zoom diagram out"
            onClick={() => setScale((value) => Math.max(0.7, value - 0.1))}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
          >
            <HugeiconsIcon
              icon={ZoomOutIcon}
              strokeWidth={2}
              aria-hidden="true"
              className="size-4"
            />
          </button>
          <button
            type="button"
            aria-label="Zoom diagram in"
            onClick={() => setScale((value) => Math.min(1.8, value + 0.1))}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
          >
            <HugeiconsIcon
              icon={ZoomInIcon}
              strokeWidth={2}
              aria-hidden="true"
              className="size-4"
            />
          </button>
          <button
            type="button"
            aria-label={
              copied ? "Diagram source copied" : "Copy diagram source"
            }
            onClick={copy}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
          >
            {copied ? (
              <HugeiconsIcon
                icon={Tick02Icon}
                strokeWidth={2}
                aria-hidden="true"
                className="size-4"
              />
            ) : (
              <HugeiconsIcon
                icon={Copy01Icon}
                strokeWidth={2}
                aria-hidden="true"
                className="size-4"
              />
            )}
          </button>
        </div>
      </div>
      <div className="overflow-auto p-5" aria-live="polite">
        {error ? (
          <p className="text-sm text-muted-foreground">
            This diagram could not be rendered. Use the source copy button to
            inspect its Mermaid text.
          </p>
        ) : svg ? (
          <div
            className="mx-auto min-w-max origin-center [&_svg]:max-w-none"
            style={{ transform: `scale(${scale})` }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : (
          <div
            className="h-28 animate-pulse rounded-lg bg-muted"
            aria-label="Rendering diagram"
          />
        )}
      </div>
    </figure>
  );
}
