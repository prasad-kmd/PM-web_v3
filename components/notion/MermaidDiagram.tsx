"use client";

// Adapted from PM-Web_V2 (AGPL-3.0); see THIRD_PARTY_NOTICES.md.

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Copy01Icon,
  Tick02Icon,
  ZoomInIcon,
  ZoomOutIcon,
  Maximize02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { WorkspaceTooltip } from "@/components/ui/tooltip";
import { MediaViewer } from "./MediaViewer";

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
  const [viewerScale, setViewerScale] = useState(1);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const expandButton = useRef<HTMLButtonElement>(null);

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
            onClick={() => setScale((value) => Math.max(0.25, value - 0.25))}
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
            onClick={() => setScale((value) => Math.min(4, value + 0.25))}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
          >
            <HugeiconsIcon
              icon={ZoomInIcon}
              strokeWidth={2}
              aria-hidden="true"
              className="size-4"
            />
          </button>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Reset diagram zoom to fit"
            onClick={() => setScale(1)}
          >
            {Math.round(scale * 100)}%
          </Button>
          <WorkspaceTooltip label="Expand diagram">
            <Button
              ref={expandButton}
              variant="ghost"
              size="icon"
              aria-label="Expand diagram"
              disabled={!svg || error}
              onClick={() => {
                setViewerScale(1);
                setExpanded(true);
              }}
            >
              <HugeiconsIcon icon={Maximize02Icon} size={16} aria-hidden />
            </Button>
          </WorkspaceTooltip>
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
          <DiagramCanvas svg={svg} scale={scale} />
        ) : (
          <div
            className="h-28 animate-pulse rounded-lg bg-muted"
            aria-label="Rendering diagram"
          />
        )}
      </div>
      <MediaViewer
        open={expanded}
        onOpenChange={setExpanded}
        title={caption || "Diagram"}
        finalFocus={expandButton}
        actions={
          <>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Zoom diagram out"
              disabled={viewerScale <= 0.25}
              onClick={() =>
                setViewerScale((value) => Math.max(0.25, value - 0.25))
              }
            >
              −
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Fit diagram to view"
              onClick={() => setViewerScale(1)}
            >
              {Math.round(viewerScale * 100)}%
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Zoom diagram in"
              disabled={viewerScale >= 4}
              onClick={() =>
                setViewerScale((value) => Math.min(4, value + 0.25))
              }
            >
              +
            </Button>
            <Button variant="ghost" size="sm" onClick={copy}>
              {copied ? "Copied" : "Copy source"}
            </Button>
          </>
        }
      >
        {svg ? (
          <DiagramCanvas svg={svg} scale={viewerScale} fullscreen />
        ) : null}
      </MediaViewer>
    </figure>
  );
}

/** Real layout dimensions, not a transform: scrollbars can reach every edge. */
function DiagramCanvas({
  svg,
  scale,
  fullscreen = false,
}: {
  svg: string;
  scale: number;
  fullscreen?: boolean;
}) {
  const instance = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const scopedSvg = useMemo(() => {
    const ids = new Map<string, string>();
    for (const match of svg.matchAll(/\bid=["']([^"']+)["']/g))
      ids.set(match[1], `${match[1]}-${instance}`);
    return svg
      .replace(
        /\bid=(["'])([^"']+)\1/g,
        (match, quote: string, id: string) =>
          `id=${quote}${ids.get(id) || id}${quote}`,
      )
      .replace(/#([a-zA-Z_][\w:-]*)/g, (match, id: string) =>
        ids.has(id) ? `#${ids.get(id)}` : match,
      )
      .replace(
        /\baria-labelledby=(["'])([^"']+)\1/g,
        (match, quote: string, value: string) =>
          `aria-labelledby=${quote}${value
            .split(/\s+/)
            .map((id) => ids.get(id) || id)
            .join(" ")}${quote}`,
      );
  }, [svg, instance]);
  const viewport = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 640, height: 400 });
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const update = () =>
      setSize({ width: element.clientWidth, height: element.clientHeight });
    const observer = new ResizeObserver(update);
    observer.observe(element);
    update();
    return () => observer.disconnect();
  }, []);
  // Mermaid supplies a numeric viewBox; use it to preserve diagram proportions.
  const box = svg
    .match(/viewBox=["']([^"']+)["']/)?.[1]
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  const ratio =
    box && box.length === 4 && box[2] > 0 && box[3] > 0 ? box[2] / box[3] : 1.6;
  const inset = fullscreen ? 88 : 32;
  const width =
    Math.max(1, Math.min(size.width - inset, (size.height - inset) * ratio)) *
    scale;
  return (
    <div
      ref={viewport}
      className={`diagram-canvas ${fullscreen ? "diagram-canvas-full" : ""}`}
      tabIndex={0}
      role="region"
      aria-label="Diagram viewport; scroll to pan when zoomed"
    >
      <div
        className="diagram-stage"
        style={{ width, height: width / ratio }}
        dangerouslySetInnerHTML={{ __html: scopedSvg }}
      />
    </div>
  );
}
