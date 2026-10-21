"use client";

import { Copy, Terminal } from "lucide-react";
import { toast } from "sonner";

export function NotepadApp() {
  const copyLinks = () => {
    navigator.clipboard?.writeText(
      "https://github.com/prasad-kmd\nprasad.madhuranga@protonmail.com",
    );
    toast.success("Copied links to clipboard");
  };

  return (
    <div className="notes-container">
      {/* Notes Toolbar */}
      <div className="notes-toolbar">
        <span className="font-medium">Welcome Note — Read Me.txt</span>
        <span>UTF-8 • Markdown Supported</span>
      </div>

      {/* Notes Body */}
      <div className="notes-content">
        <div className="max-w-[620px] mx-auto space-y-5">
          <div className="notes-date">October 21, 2026</div>

          <div>
            <h1 className="text-xl font-bold tracking-tight mb-2">
              Prasad M. — Engineering Workspace
            </h1>
            <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed">
              Welcome. I am a <strong>Civil Engineer &amp; Frontend Software Developer</strong> based
              in Kandy, Sri Lanka. I build high-performance web platforms for field engineering,
              quantity surveying, and tactile digital workspaces.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[var(--surface-hover)] border border-[var(--border-subtle)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold flex items-center gap-1.5 text-[var(--sys-accent)]">
                <Terminal size={14} /> Quick Telemetry &amp; Links
              </span>
              <button
                type="button"
                onClick={copyLinks}
                className="text-[11px] text-[var(--muted-ink)] hover:text-[var(--on-surface)] flex items-center gap-1 cursor-pointer"
                title="Copy links"
              >
                <Copy size={12} /> Copy
              </button>
            </div>

            <pre
              className="text-xs font-mono text-[var(--on-surface)] overflow-x-auto leading-relaxed pt-1"
              style={{ fontFamily: "var(--font-mono)" }}
            >{`const engineer = {
  name:     "Prasad M.",
  location: "Kandy, Central Province, Sri Lanka",
  field:    ["Civil Engineering", "Site QA/QC", "Quantity Surveying"],
  stack:    ["Next.js 16", "TypeScript", "Tailwind v4", "Motion", "PWA"],
  github:   "https://github.com/prasad-kmd",
  email:    "prasad.madhuranga@protonmail.com"
};`}</pre>
          </div>

          <div className="space-y-2 text-xs leading-relaxed text-[var(--on-surface-variant)]">
            <h2 className="text-sm font-semibold text-[var(--on-surface)] pt-2">
              Workspace Controls:
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Window Management:</strong> Drag the glass titlebar to reposition. Click the red, amber, and green traffic lights to close, minimize, or zoom.
              </li>
              <li>
                <strong>Floating Navbar:</strong> Open windows appear symmetrically on the left and right of the central anchor button.
              </li>
              <li>
                <strong>Snap Layouts:</strong> Hover over the green traffic light to preview half and quadrant splits.
              </li>
              <li>
                <strong>Customization:</strong> Open <em>Settings</em> to switch between Dark &amp; Light themes or pick your wallpaper.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
