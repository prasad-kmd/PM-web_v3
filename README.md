# PM Web v3.2.5 — Spatial Glass OS

> A personal engineering portfolio presented as a **modern Spatial Glass desktop workspace** — inspired by macOS & visionOS spatial aesthetics. Built with Next.js 16 (Turbopack), Tailwind v4, Base UI, and Framer Motion.

---

## ✨ Features & Architecture

- **Spatial Glass Design System**: Frosted glass materials (`backdrop-filter: blur(32px) saturate(190%)`), multi-layer spatial drop shadows, and Apple system typography (`SF Pro`, `Geist`, `SF Mono`).
- **macOS Window Chrome**: Left-aligned colored traffic lights (Close, Minimize to Dock, Zoom/Maximize) with inactive window dimming, centered title, and 8-way resize handles.
- **Floating Glass Dock**: Centered bottom pill with frosted glass blur, app icons, active running indicator dots, and spring hover magnification.
- **Top Menu Bar**: 28px glass bar with personal monogram (`⌘`), dynamic active application name in bold, application menus (`File`, `Edit`, `View`), Spotlight trigger, Notification Center bell with unread badge, and live clock/calendar.
- **Spotlight Search (`⌘Space` / `⌘K`)**: Fast command palette with instant filtering across applications, case studies, and quick actions.
- **System Settings**: macOS-style settings layout with Appearance controls (Light/Dark themes, 8 system accents), Wallpaper picker (Hill Country, Bloom, Workbench), and engineer specs.
- **Read Me.txt**: Notes/TextEdit document with bio, copyable JSON telemetry, and shortcuts.
- **Standalone App Routes**: Deep-linked `/settings` and `/readme` pages that share the exact same component bodies as the desktop windows.

---

## 🚀 Run Locally

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build production static bundle
pnpm build
```

Open `http://localhost:3000`.

---

## ⌨️ Shortcuts & Controls

- **`⌘Space` / `⌘K`**: Toggle Spotlight Command Palette.
- **`Esc`**: Dismiss active flyout, Spotlight, or context menu.
- **`F2`**: Inline rename selected desktop icon.
- **Double-click titlebar**: Toggle Zoom / Maximize window.
- **Hover Green Traffic Light**: Preview half and quadrant Snap Layouts.
- **Drag Titlebar**: Reposition window across the desktop.
