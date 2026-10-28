"use client";

import { Copy01Icon, TerminalIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";
import { WorkspaceTooltip } from "@/components/ui/tooltip";

export function NotepadApp() {
  const copyLinks = () => {
    navigator.clipboard?.writeText(
      `https://github.com/prasad-kmd\n${window.location.origin}/contact`,
    );
    toast.success("Copied links to clipboard");
  };

  return (
    <div className="notes-container">
      <div className="notes-toolbar">
        <span>Welcome Note — Read Me.txt</span>
        <span>UTF-8 · Markdown supported</span>
      </div>

      <div className="notes-content">
        <article className="notes-document">
          <p className="notes-date">October 21, 2026</p>

          <div>
            <h1>Prasad M. — Engineering Workspace</h1>
            <p>
              Welcome. I am a{" "}
              <strong>Civil Engineer &amp; Frontend Software Developer</strong>{" "}
              based in Kandy, Sri Lanka. I build high-performance web platforms
              for field engineering, quantity surveying, and tactile digital
              workspaces.
            </p>
          </div>

          <section className="notes-data" aria-labelledby="telemetry-heading">
            <div className="notes-data-header">
              <span id="telemetry-heading" className="notes-data-title">
                <HugeiconsIcon icon={TerminalIcon} strokeWidth={2} size={15} />
                Quick telemetry &amp; links
              </span>
              <WorkspaceTooltip label="Copy links">
                <button
                  type="button"
                  onClick={copyLinks}
                  className="notes-copy"
                >
                  <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} size={14} />
                  Copy
                </button>
              </WorkspaceTooltip>
            </div>
            <pre>{`const engineer = {
  name:     "Prasad M.",
  location: "Kandy, Central Province, Sri Lanka",
  field:    ["Civil Engineering", "Site QA/QC", "Quantity Surveying"],
  stack:    ["Next.js 16", "TypeScript", "Tailwind v4", "Motion", "PWA"],
  github:   "https://github.com/prasad-kmd",
  contact:  "/contact"
};`}</pre>
          </section>

          <section aria-labelledby="workspace-controls-heading">
            <h2 id="workspace-controls-heading">Workspace controls</h2>
            <ul>
              <li>
                <strong>Window management:</strong> Drag the titlebar to
                reposition. Use the top-right maximize/restore and close
                controls as needed.
              </li>
              <li>
                <strong>Layout memory:</strong> The browser remembers each
                application’s last position, size, and maximize state when you
                reopen it.
              </li>
              <li>
                <strong>Edge snap:</strong> Drag a window to the top or either
                edge of the desktop to maximize or align it.
              </li>
              <li>
                <strong>Appearance:</strong> Open Settings to switch between the
                exact light and dark workspace modes.
              </li>
            </ul>
          </section>
        </article>
      </div>
    </div>
  );
}
