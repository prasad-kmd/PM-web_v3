"use client";

export function NotepadApp() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-1 px-2 py-1 border-b border-[var(--menu-line)] bg-[var(--surface)] text-[11px] shrink-0">
        <span className="px-2 py-1 rounded hover:bg-[var(--hover-wash)] cursor-pointer">File</span>
        <span className="px-2 py-1 rounded hover:bg-[var(--hover-wash)] cursor-pointer">Edit</span>
        <span className="px-2 py-1 rounded hover:bg-[var(--hover-wash)] cursor-pointer">View</span>
        <span className="ml-auto text-[11px] text-[var(--muted-ink)] hidden sm:inline">Ln 1, Col 1 • UTF-8 • CRLF</span>
      </div>
      <div className="flex-1 overflow-auto p-6 bg-white dark:bg-[#1e1e1e] text-[#1b1c1c] dark:text-[#e8e8e8]">
        <div className="max-w-[680px] mx-auto">
          <p className="text-[11px] tracking-widest font-semibold text-[var(--flu-accent)] mb-2">WELCOME / START HERE</p>
          <h2 className="text-[22px] font-semibold tracking-tight mb-3" style={{ fontFamily: "Consolas, ui-monospace, monospace" }}>
            This desktop is the starting point.
          </h2>
          <p className="text-[13px] leading-7 text-[#3a3d45] dark:text-[#c8c8cc]">
            Hey — I’m <strong>Prasad</strong>, an engineer from Kandy, LK — bridging site work and software. This portfolio is a small workspace.
            Open <strong>Settings</strong> to personalize the desktop, or read this note for quick links.
          </p>

          <div className="mt-6 p-4 rounded-lg bg-[#f6f8fa] dark:bg-[#252526] border border-[var(--menu-line)]">
            <p className="text-[11px] font-semibold tracking-wide text-[var(--muted-ink)] mb-2">QUICK LINKS</p>
            <pre className="text-[12px] leading-6 overflow-x-auto" style={{ fontFamily: "Consolas, ui-monospace, monospace" }}>{`const links = {
  github:   "github.com/prasad-kmd",
  email:    "prasad@example.com",
  location: "Kandy, Central Province, LK",
  stack:    ["Next.js", "TypeScript", "Tailwind", "PWA"],
};`}</pre>
          </div>

          <div className="mt-6 space-y-2 text-[12px] leading-6">
            <p className="font-medium">How to use this desktop:</p>
            <ul className="list-disc pl-5 space-y-1 text-[var(--muted-ink)] dark:text-[#a8a8ad]">
              <li>Drag windows by their titlebar — double-click to maximize.</li>
              <li>Hover the Maximize button for Snap Layouts (Left/Right/Quadrants).</li>
              <li>Right-click the desktop for View &amp; Personalize.</li>
              <li>Press <kbd className="px-1 py-0.5 rounded bg-[var(--surface-container)] border border-[var(--menu-line)] text-[11px]">Esc</kbd> to close menus and windows.</li>
            </ul>
          </div>

          <p className="text-[11px] text-[var(--muted-ink)] mt-6 border-t border-[var(--menu-line)] pt-4">
            Built with Next.js 16 + Tailwind v4 + Base UI + Framer Motion — Mica/Acrylic materials from <code>DESIGN.md</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
