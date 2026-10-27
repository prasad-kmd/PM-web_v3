"use client";

import type { CSSProperties } from "react";
import { PM_LOGO_SVG } from "./PmLogo";

/**
 * Global error — approved Desktop-native "Safe mode" (04).
 * Rendered by app/global-error.tsx, which replaces the root layout, so it
 * must not depend on providers, globals.css, Tailwind or Hugeicons: every
 * style is inline and the only asset is the self-hosted Outfit font.
 */
const CSS = `
@font-face{font-family:"Outfit";src:url("/fonts/outfit-latin-variable.woff2") format("woff2");font-weight:100 900;font-display:swap}
@keyframes pm-safe-bar{from{transform:translateX(-100%)}to{transform:translateX(250%)}}
.pm-safe-btn{display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 14px;border-radius:8px;font:500 14px/1 Outfit,Arial,sans-serif;cursor:pointer;text-decoration:none;transition:background-color .15s,border-color .15s}
.pm-safe-btn:focus-visible{outline:2px solid oklch(.708 0 0);outline-offset:2px}
.pm-safe-primary{border:1px solid transparent;background:oklch(.985 0 0);color:oklch(.145 0 0)}
.pm-safe-primary:hover{background:oklch(.87 0 0)}
.pm-safe-ghost{border:1px solid oklch(1 0 0/14%);background:transparent;color:oklch(.985 0 0)}
.pm-safe-ghost:hover{background:oklch(1 0 0/6%)}
@media (prefers-reduced-motion:reduce){.pm-safe-bar span{animation:none!important;width:100%!important;opacity:.4}}
`;

const root = (embedded: boolean): CSSProperties => ({
  position: embedded ? "absolute" : "fixed",
  inset: 0,
  display: "grid",
  placeItems: "center",
  padding: 24,
  boxSizing: "border-box",
  background: "oklch(.145 0 0)",
  color: "oklch(.985 0 0)",
  fontFamily: "Outfit, Arial, sans-serif",
  WebkitFontSmoothing: "antialiased",
  overflow: "auto",
});

export function SafeModeScreen({
  digest,
  onRestart,
  embedded = false,
}: {
  digest?: string;
  onRestart: () => void;
  /** Positions inside a parent instead of covering the viewport. */
  embedded?: boolean;
}) {
  return (
    <main style={root(embedded)} aria-labelledby="pm-safe-title">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          maxWidth: 420,
          gap: 12,
        }}
      >
        <span
          aria-hidden
          style={{ width: 52, height: 52, lineHeight: 0 }}
          dangerouslySetInnerHTML={{ __html: PM_LOGO_SVG }}
        />
        <h1
          id="pm-safe-title"
          style={{
            margin: "8px 0 0",
            fontSize: 22,
            lineHeight: 1.3,
            fontWeight: 600,
          }}
        >
          Safe mode
        </h1>
        <p
          style={{
            margin: 0,
            color: "oklch(.708 0 0)",
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          The workspace couldn’t start normally. Your windows, theme and
          bookmarks are saved in this browser.
        </p>
        <div
          className="pm-safe-bar"
          aria-hidden
          style={{
            width: 160,
            height: 3,
            borderRadius: 3,
            background: "oklch(1 0 0 / 12%)",
            overflow: "hidden",
            margin: "8px 0",
          }}
        >
          <span
            style={{
              display: "block",
              width: "40%",
              height: "100%",
              background: "oklch(.985 0 0)",
              animation: "pm-safe-bar 1.6s ease-in-out infinite",
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <button
            type="button"
            className="pm-safe-btn pm-safe-primary"
            onClick={onRestart}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M20 11a8 8 0 1 0-2.3 5.7" />
              <path d="M20 4v7h-7" />
            </svg>
            Restart workspace
          </button>
          {/* A full document load, so the root layout is rebuilt from scratch. */}
          <a className="pm-safe-btn pm-safe-ghost" href="/">
            Open home
          </a>
        </div>
        {digest ? (
          <span
            style={{
              marginTop: 8,
              color: "oklch(.556 0 0)",
              font: "11.5px ui-monospace, SFMono-Regular, Menlo, monospace",
            }}
          >
            Digest {digest}
          </span>
        ) : null}
      </div>
    </main>
  );
}
