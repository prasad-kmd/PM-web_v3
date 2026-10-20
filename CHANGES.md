# CHANGES — v3.1.0 → v3.2.0 · Windows 11 Desktop Modular Architecture & Animation Refinement

**Date:** 2026-10-20  
**Version:** 3.2.0  
**Scope:** Architecture refactor, shell layout improvements, and motion refinement per user feedback.

---

## Summary of Enhancements

### 1. Architectural Split (Single `page.tsx` → Modular Directory Structure)
- **`app/page.tsx`** reduced from 1,691 lines to a clean 6-line desktop entry.
- **Dedicated Route Pages**:
  - `app/settings/page.tsx` (`/settings` route)
  - `app/readme/page.tsx` (`/readme` route)
- **Modular Components**:
  - `components/desktop/Desktop.tsx` — Root desktop controller & layer coordinator
  - `components/desktop/StatusBar.tsx` — Top Ubuntu/macOS-style status bar
  - `components/desktop/CalendarFlyout.tsx` — Calendar dropdown from the status bar clock
  - `components/desktop/NotificationsFlyout.tsx` — Notification center from the status bar bell
  - `components/desktop/DesktopIcons.tsx` — Grid layout, marquee selection, F2 rename
  - `components/desktop/ContextMenu.tsx` — Right-click acrylic context menu
  - `components/taskbar/Taskbar.tsx` — Symmetrical taskbar layout
  - `components/start-menu/StartMenu.tsx` — Framer Motion-driven Start flyout
  - `components/window/Window.tsx` — MotionValue-driven window shell (drag/resize/maximize/minimize)
  - `components/window/WindowsLayer.tsx` — Window rendering coordinator
  - `components/window/SnapOverlay.tsx` — Snap Layout quadrants & split preview
  - `components/apps/SettingsApp.tsx` — Appearance & personalization app
  - `components/apps/NotepadApp.tsx` — Welcome notes & links app
  - `components/apps/AppBody.tsx` — App router component
  - `components/apps/AppPage.tsx` — Reusable container for standalone app routes
- **Clean State & Primitives**:
  - `hooks/useWindowManager.ts` — Geometry, z-stack, snap, and taskbar exit choreography
  - `hooks/useClock.ts` — Live SSR-safe system clock
  - `lib/appearance.tsx` — Theme, wallpaper, and accent color context provider
  - `lib/windows.ts` — Spring physics, transitions, and snap layout math
  - `lib/registry.ts` — Central app metadata registry

### 2. Taskbar & Status Bar Layout
- **Widgets removed**: Entire widget drawer and left taskbar button removed.
- **Taskbar centered**: Symmetrical 3-zone layout:
  - Left zone: App icon (Settings)
  - Center zone: Windows Start logo + Search icon
  - Right zone: App icon (Read Me.txt)
- **Action Panel removed**: Wifi, volume, and battery icons removed from the taskbar.
- **Top Status Bar (Ubuntu/macOS style)**:
  - User identity (`Prasad M.`)
  - Active focused application name & menu bar (`File`, `Edit`, `View`, `Help`)
  - Notification bell with unread badge + slide-down notification center
  - Live date & clock with second indicator + slide-down interactive calendar

### 3. Streamlined App Suite
- Simplified to the two core apps: **Settings** and **Read Me.txt** (Notepad).
- Removed unnecessary placeholder apps.

### 4. Motion & Animation Tuning (win11React fidelity)
- Replaced competing CSS `@keyframes` with unified **Framer Motion motion values**:
  - **Maximize / Restore**: Critically damped spring physics (`stiffness: 520, damping: 42, mass: 0.9`) with real-time border-radius interpolation (8px → 0px).
  - **Minimize**: Window animates directly into its corresponding taskbar icon anchor position (`cx, cy`) while scaling and fading into the taskbar.
  - **Restore from Taskbar**: Window expands smoothly outward from its taskbar icon anchor back to its restored rect.
  - **Start Menu**: Unified exponential curve (`ease: [0.16, 1, 0.3, 1]`) with subtle `y` offset and scale transition, matching native Windows 11 / win11React behavior.

---

## Verification & Testing
- Next.js 16.3.5 Turbopack production build succeeded: `5/5 static pages prerendered`.
- TypeScript strict typecheck passed: `0 errors`.
- Playwright runtime verification:
  - Animation frame sampling confirmed sub-frame interpolated transitions for maximize, restore, minimize, and Start menu open/close.
  - Standalone routes `/settings` and `/readme` verified in headless browser.
  - Shell screenshot captured and inspected.
