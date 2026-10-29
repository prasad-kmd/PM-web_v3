"use client";

import { useState } from "react";
import { SafeModeScreen } from "@/components/system/SafeModeScreen";
import type { SuggestionEntry } from "@/lib/suggestions";
import { ErrorView } from "./ErrorView";
import { LoadingView, type LoadingLayout } from "./LoadingView";
import { NotFoundView } from "./NotFoundView";

type StateId = "loading" | "not-found" | "error" | "global-error";

const STATES: { id: StateId; label: string; file: string }[] = [
  { id: "loading", label: "Loading", file: "app/loading.tsx" },
  { id: "not-found", label: "Not found", file: "app/not-found.tsx" },
  { id: "error", label: "Error", file: "app/error.tsx" },
  { id: "global-error", label: "Global error", file: "app/global-error.tsx" },
];
const LAYOUTS: { id: LoadingLayout; label: string }[] = [
  { id: "listing", label: "Listing" },
  { id: "reader", label: "Reader" },
  { id: "page", label: "Page" },
  { id: "invoices", label: "Invoices" },
  { id: "og-studio", label: "OG Studio" },
];
const SAMPLE_DIGEST = "4127839150";

export function DevStatesPreview({ entries }: { entries: SuggestionEntry[] }) {
  const [state, setState] = useState<StateId>("loading");
  const [layout, setLayout] = useState<LoadingLayout>("listing");
  const [path, setPath] = useState(() => {
    const sample = entries[0];
    return sample
      ? `/${sample.type}/${sample.slug.slice(0, -3) || sample.slug}x`
      : "/blog/closed-loop-stepper-v2";
  });
  const [run, setRun] = useState(0);
  const current = STATES.find((item) => item.id === state)!;

  return (
    <section className="window dev-states" aria-label="State preview">
      <div className="window-titlebar dev-states-titlebar">
        <span className="window-title">State preview</span>
      </div>
      <div className="dev-states-tools">
        <div className="rdr-seg" role="group" aria-label="State">
          {STATES.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={state === item.id}
              onClick={() => setState(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        {state === "loading" ? (
          <div className="rdr-seg" role="group" aria-label="Skeleton layout">
            {LAYOUTS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={layout === item.id}
                onClick={() => setLayout(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : null}
        {state === "not-found" ? (
          <label className="dev-states-path">
            <span>Path</span>
            <input
              value={path}
              onChange={(event) => setPath(event.target.value || "/")}
              spellCheck={false}
            />
          </label>
        ) : null}
        <span className="lib-grow" />
        <code className="dev-states-file">{current.file}</code>
      </div>
      <div className="window-body dev-states-frame" key={`${state}-${run}`}>
        {state === "loading" ? (
          <LoadingView label="Blog" layout={layout} />
        ) : state === "not-found" ? (
          <NotFoundView entries={entries} path={path} />
        ) : state === "error" ? (
          <ErrorView
            label="Blog"
            digest={SAMPLE_DIGEST}
            onReload={() => setRun((value) => value + 1)}
          />
        ) : (
          <SafeModeScreen
            embedded
            digest={SAMPLE_DIGEST}
            onRestart={() => setRun((value) => value + 1)}
          />
        )}
      </div>
    </section>
  );
}
