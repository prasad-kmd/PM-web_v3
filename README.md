# PM Web v3 — Desktop Workspace

A personal engineering portfolio presented as an interactive desktop workspace. Built with Next.js 16, Tailwind CSS v4, Base UI, Animate UI, and Motion.

## Features

- **Animate UI menubar** — the published Base UI menubar composition with keyboard navigation and animated hand-off between menus.
- **Animate UI context menus** — published Base UI context-menu behavior for the desktop and application shortcuts.
- **Window workspace** — draggable, resizable, focusable windows with Windows-style top-right maximize/restore and close controls.
- **Dialog-style window motion** — Animate UI dialog spring, fade, blur bridge, quick dismiss, and reduced-motion support applied to non-modal desktop windows.
- **Persistent layouts** — application position, size, restore rectangle, and maximize state are stored locally and safely clamped on the next open.
- **No dock** — desktop shortcuts and the menubar are the application launch paths; windows are closed rather than minimized.
- **Settings and Read Me apps** — shared by the desktop and standalone `/settings` and `/readme` routes.

## Run locally

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

> The repository declares `pnpm@11.9.0`, which requires Node 22.13+. Use a supported pnpm release for your local Node version if necessary.

## Controls

- **Right-click / long-press**: Open the Animate UI context menu.
- **F2**: Rename a selected desktop shortcut.
- **Double-click titlebar**: Toggle maximize / restore.
- **Drag titlebar**: Reposition a window. Drag to the top or left/right desktop edge to maximize or snap.
- **Window controls**: Use the top-right maximize/restore or close controls.
