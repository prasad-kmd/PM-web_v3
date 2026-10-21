# CHANGES — v3.3.0 → v3.4.0 · Precision Spatial OS Refinements

**Date:** 2026-10-21  
**Version:** 3.4.0  
**Scope:** Streamlined UI based on user preferences (v2 bottom floating navbar, fluent icons only, date/time format, removed search, notifications & calendar).

---

## What Changed in v3.4.0

### 1. Removed Search Feature
- Removed Spotlight search palette, search trigger buttons from the menu bar and dock, and `⌘Space` / `⌘K` keyboard event listeners.

### 2. Formatted Date & Time Display (No Calendar Flyout)
- Menu bar displays date & time in the exact requested format: `YYYY-MM-DD , hh:MM A/PM` (e.g. `2026-10-21 , 07:36 AM`).
- The calendar flyout has been removed; clicking the date/time is non-disruptive.

### 3. Fluent Color Icons Only
- Migrated all application, desktop, and window representations to local Fluent color SVGs:
  - **Settings**: `/icons/fluent-color/program.svg` (Fluent program/settings gear)
  - **Read Me.txt**: `/icons/fluent-color/document.svg` (Fluent document)
  - **Center Anchor**: `/icons/fluent-color/account.svg` (Fluent user profile)

### 4. Bottom Floating Mobile Navbar (pm-web_v2 Style)
- Replaced the full dock with the bottom floating mobile navbar inspired by `pm-web_v2`:
  - **Default State**: Only **one icon** in the middle (profile button, no action for now).
  - **Dynamic Symmetrical Expansion**: When an app opens, its Fluent icon appears on the left or right of the center icon:
    - Settings opens → appears on the left.
    - Read Me opens → appears on the right.
    - Symmetrical spacer balance guarantees the center icon **always stays in the dead middle** of the capsule whether 0, 1, or 2 apps are open.
  - Clicking an open app icon toggles focus/restore or minimizes the window back into its navbar anchor.

### 5. Removed Notification Center & Bell
- Completely removed the notification bell icon, unread counter badge, and `NotificationsFlyout` component from the menu bar.

---

## Verification & Testing
- Next.js 16.3.5 Turbopack production build: 5/5 static routes compiled in 1.3s with **0 TypeScript errors**.
- Playwright runtime verification:
  - Live screenshots confirmed default state (single centered button in floating navbar, menu bar date/time in `YYYY-MM-DD , hh:MM A/PM`).
  - Symmetrical icon expansion tested with Settings and Read Me windows open simultaneously.
  - Active focus indicators and window management verified.
EOF
