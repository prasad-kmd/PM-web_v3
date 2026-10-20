# Windows 11 Desktop — Redesign Plan v3.0.0 → v3.1.0

**Project:** `prasad-kmd/pm-web_v3` — Personal Portfolio as Windows 11 Desktop  
**Date:** 2026-10-20  
**Status:** `PLAN / AWAITING APPROVAL` — No files modified yet  
**Principle:** Redesign from scratch (not patch existing components) — per your request

---

## 1. Executive Summary

Your current v3.0.0 is a **clean, minimal proof-of-concept**: wallpaper + 2 desktop shortcuts + centered acrylic taskbar + Start menu (Pinned / All Apps / Recommended) + single floating window + light/dark toggle. It captures the *idea* of Windows 11, but not the *feel*.

The reference you chose — [blueedgetechno/win11React](https://github.com/blueedgetechno/win11React) — is the right target. It nails the **materials** (Mica + Acrylic), **chrome** (48px taskbar, 32px titlebar, 6–8px rounding), **motion** (`cubic-bezier(0.2,0,0,1)`), and **density** of the real OS.

**Proposal:** Build a new component architecture from scratch that delivers authentic Windows 11 fidelity **while keeping your original portfolio identity** (wallpaper, colors, personal apps). We will not copy win11React code verbatim — we will *re-engineer* its design language using your `DESIGN.md` tokens + modern primitives (`coss-ui` + `motion` + `Base UI`) + Tailwind v4.

> This document is the gate. **Nothing is built until you approve.**

---

## 2. What You Have Today (Audit)

### Current Stack
- **Framework:** Next.js 16.3.5 (App Router) + React 19 + TypeScript 5
- **Styling:** Tailwind CSS v4 + custom `globals.css` (hand-rolled acrylic/mica variables)
- **Primitives:** `@base-ui/react` 1.8.0 + `@floating-ui/react` — no `coss-ui` yet, no `shadcn`
- **Motion:** `motion` 13.4.0 installed, barely used (only CSS keyframes today)
- **Icons:** `lucide-react` + local SVGs (`/icons/thesvg/*.svg` from theSVG.org) — good, keep
- **Package manager:** `pnpm@11.9.0` (`.npmrc` present)
- **Wallpapers:** 3 webp assets (`desktop-bloom`, `hill-country`, `workbench`)
- **Structure:** Single `app/page.tsx` (517 lines, one giant client component) + `app/globals.css` (600+ lines) — works, but not scalable

### What Works Well
- ✅ `DESIGN.md` is excellent — Fluent tokens, Mica vs Acrylic distinction, elevation, and typography are precisely defined
- ✅ Wallpaper + tint layer architecture is correct
- ✅ Start menu data model (Pinned → All Apps → Recommended) matches Win11
- ✅ Theme switching via `data-theme="light|dark"` is idiomatic
- ✅ Accessibility basics: `aria-label`, `aria-expanded`, ESC-to-dismiss, focus return

### Gap vs Real Windows 11 / win11React
| Area | Current v3.0.0 | Real Win11 / win11React |
|------|----------------|--------------------------|
| **Taskbar** | 54px, correct blur, but flat — no search, no widgets, no system flyouts | 48px, centered icons, **search box**, **Widgets**, **Copilot**, **System Tray chevron**, **Quick Settings**, **Calendar flyout**, Task View |
| **Desktop** | 2 static vertical buttons, no selection marquee, no drag, no grid snap, no context menu | Rectangular marquee select, multi-select, drag-reorder, auto-arrange grid, right-click menu (View / Sort / Refresh / Personalize), icon renaming |
| **Icons** | SVG icons, but no shadow depth control, no rename, no badge | Fluent folder/file glyphs with drop-shadow, rename-on-click, shortcut overlay arrow, badge counts |
| **Start Menu** | Pinned (6-col) + Recommended (2-col) + footer — structurally correct but visually light | Same + **Search input** with filters, **User tile with folders**, **Power button**, acrylic 8px rounding, entry animation |
| **Window System** | Single centered dialog, no drag, resize, maximize, snap, z-stack, titlebar traffic-light layout basic | Draggable via titlebar, resizable edges/corners, Min/Max/Close with hover affordances (`#e81123` close), Snap Layouts on Max hover, minimize-to-taskbar, z-index stacking, Mica titlebar |
| **Flyouts** | None | Calendar, Quick Settings (WiFi / BT / Brightness / Volume sliders), Notifications Center, Widgets panel |
| **Context Menus** | None | Desktop right-click, taskbar right-click, Start right-click — all acrylic + rounded |
| **Motion** | `window-in` + `launcher-in` only | Every open/close uses `cubic-bezier(0.2,0,0,1)` 180–210ms, Taskbar bounce, Start scale+fade |
| **Wallpaper Engine** | Static `<Image fill>` | Theme-aware wallpaper switch + backdrop tint adapts to light/dark |
| **Portfolio Content** | Generic placeholder in 2 windows | Real apps should live as windows: **About**, **Projects (File Explorer)**, **Experience**, **Contact**, **Resume**, **Settings** |
| **Backend** | None | Optional: contact form endpoint, view counter, Notion/GitHub data sources (v2 had these) |

**Diagnosis:** The foundation is sound, but fidelity is ~35%. To feel like Windows 11, we need to rebuild the **desktop interaction model**, **window manager**, and **taskbar flyout ecosystem**.

---

## 3. Reference Deconstruction — What We Steal (and What We Don't)

### From `win11React` (and real Win11) — Adopt:
1. **Materials:** Mica (window chrome, desaturated radial tint sampling wallpaper) vs Acrylic (taskbar, Start, context menus — `saturate(3) blur(20px)` + `rgba(243,243,243,0.85)`). Your `DESIGN.md` already defines these correctly — we just need to *apply* them everywhere.
2. **Chrome Metrics:** Taskbar `48px`, Titlebar `32px` (or `49px` with breadcrumb — we will normalize to 32px), Window corner `8px` (6px when nested), Maximized `0px`, Taskbar icon `40px` with `12px` accent underline.
3. **Motion Signature:** `cubic-bezier(0.2,0,0,1)` everywhere, `180ms` for popovers, `210ms` for windows, with `prefers-reduced-motion` guards.
4. **Start Menu Anatomy:** Search field → Pinned grid (6 columns) → Recommended (2 columns with recently-used files) → User footer with Power. Plus All Apps alphabetical grouping.
5. **Desktop Behavior:** Icon grid (92px column, 82px cell), hover shows `rgba(255,255,255,0.13)` wash, selected shows dotted border + `rgba(255,255,255,0.22)`, marquee drag-select, right-click context menu.
6. **Window Management:** Zustand or React Context for window stack (id, app, minimized, maximized, zIndex, rect), draggable via titlebar, snap layouts (50/50, 33/33/33, 50/25/25).
7. **System Flyouts:** Quick Settings (6 toggles + sliders), Calendar (mini month + events), Notifications (toast stack in bottom-right), Widgets (left slide-over with news/weather placeholders).

### From `win11React` — Intentionally Skip:
- Its Redux + jQuery-era patterns, global CSS soup, and overly-literal cloning (e.g., fake Edge/Store apps). We build portfolio-first: your apps, not a fake OS.
- Its class-based theming; we use your `data-theme` + CSS variables.

---

## 4. Skill Selection — Frontend & Backend

### Frontend (Primary Focus)

| Skill | Role in This Redesign | Where Applied |
|-------|----------------------|---------------|
| **`coss`** | **Primary UI primitive library** — Dialog, Popover, Menu, Context Menu, Tooltip, Tabs, Switch, Slider, Toast, etc. Built on Base UI (already installed). Provides correct a11y + portal + focus-trap out of box. | Every flyout, window, context menu, quick settings |
| **`coss-particles`** | Copy-paste particle patterns (508 prebuilt) — saves time on dialogs, toasts, tabs, command palette | Start search, calendar, quick-settings sliders |
| **`stitch-design-taste`** | Your `DESIGN.md` is already Stitch-native — we enforce it as source of truth for tokens, spacing (4px rhythm), rounding, typography (`Segoe UI Variable`) | All tokens, no drift |
| **`redesign-existing-projects`** | Systematic audit framework — used for the Gap analysis above + quality gates | Pre-build audit + post-build review |
| **`frontend-ui-engineering`** + **`high-end-visual-design`** + **`ui-ux-pro-max`** | Craft refinement — shadow tinting, noise overlays, optical alignment, density tuning | Mica/Acrylic material polish, wallpaper depth |
| **`motion-design`** + **`transitions-dev`** + **`transitions-polish`** | Motion system — spring physics, staggered entrances, tokenized durations (`--duration-quick/standard/slow`) | Window open, Start reveal, taskbar bounce, skeleton loaders |
| **`pnpm`** | Package management best practices (workspaces, catalogs, overrides if needed) | Install + build hygiene |
| **`vercel-react-best-practices`** | Performance: bundle barrel avoidance, dynamic imports for heavy windows, parallel data fetching | Window lazy-loading, image optimization |

> **Not used (but available):** `shadcn` — we standardize on `coss` (Base UI) since you already have `@base-ui/react`. No need to install Radix alongside. `imagegen-*` only if you want generated wallpapers/app icons.

### Backend (Optional / Minimal)

Your current desktop is **frontend-only** and that's correct for a portfolio. I propose **no mandatory backend**, but offer two optional slices you can approve separately:

| Skill | Backend Slice | Effort |
|-------|--------------|--------|
| **Next.js API Routes + `sonner` toasts** | `POST /api/contact` — contact form with Resend/email + rate-limit | 2h |
| **`supabase` or `firebase-basics` + `drizzle`** | View counter / guestbook / projects CMS (if you want dynamic content vs static) | 4–6h |

**Default:** Ship **frontend-only v3.1.0**. Backend slices are **Phase 4 opt-in** — your call.

---

## 5. Proposed Architecture — Rebuilt From Scratch

### 5.1 File Structure (New)

```
app/
  layout.tsx              # Root layout — font loading, <html data-theme>, metadata
  page.tsx                # Thin — renders <DesktopShell /> only
  globals.css             # Design tokens only (CSS vars) — no component CSS
  api/                    # (Phase 4 optional)
    contact/route.ts
components/
  desktop/
    DesktopShell.tsx      # Wallpaper + grid + marquee + context menu + state
    DesktopIcon.tsx       # Single icon — selection, drag, rename, badge
    DesktopGrid.tsx       # CSS grid + auto-arrange logic
    DesktopContextMenu.tsx# Right-click: View / Sort / Personalize
  taskbar/
    Taskbar.tsx           # 48px acrylic bar — center cluster + tray
    TaskbarIcon.tsx       # Icon + running indicator + hover preview
    TaskbarSearch.tsx     # Search pill (opens Start filtered)
    SystemTray.tsx        # Wifi / Volume / Battery / Chevron expand
    ClockCalendar.tsx     # Clock + Calendar flyout (Dialog/Popover)
    QuickSettings.tsx     # Network / Sound / Brightness panel
  start-menu/
    StartMenu.tsx         # Acrylic panel — search + pinned + recommended + footer
    PinnedGrid.tsx        # 6-col app grid
    AllAppsList.tsx       # Alphabetical app list with letter rail
    RecommendedList.tsx   # 2-col recent files
    StartSearch.tsx       # Filtered app/file search
  window/
    WindowManager.tsx     # Z-stack, minimize/maximize/close, focus
    WindowChrome.tsx      # Mica titlebar + controls + snap affordance
    WindowFrame.tsx       # Draggable + resizable container (motion)
    SnapOverlay.tsx       # Hover on Max → snap layout picker
  apps/
    FileExplorer/         # Projects — breadcrumb + sidebar + file grid
    Notepad/              # Read Me — monospace editor chrome
    About/                # Portfolio intro (your story)
    Experience/            # Timeline / resume
    Contact/               # Form + social links
    Settings/              # Theme / wallpaper picker / accent
    Browser/               # Optional: external links as "Edge" window
  ui/                     # coss primitives re-exported with Win11 styling
    button.tsx
    dialog.tsx
    popover.tsx
    context-menu.tsx
    tooltip.tsx
    tabs.tsx
    slider.tsx
    toast.tsx
    etc.
lib/
  windows.ts              # Window registry (id → app definition)
  desktop-icons.ts        # Icon registry
  useWindowStore.ts       # Zustand or Jotai atom — window state
  useDesktopStore.ts      # Icon positions, selection, grid prefs
  useTheme.ts             # Theme + wallpaper preference (localStorage)
hooks/
  useDragMove.ts
  useResizeObserver.ts
  useClickOutside.ts
public/
  wallpapers/             # Renamed from images/ — bloom, hill-country, workbench + dark variants
  icons/                  # thesvg + fluent-color — kept, organized by app
```

### 5.2 Design Tokens (Single Source — `globals.css` + `DESIGN.md`)

We will **rewrite** `globals.css` to be token-only, mapping your `DESIGN.md` exactly:

```css
:root {
  /* Fluent Accent */
  --flu-accent-light: #0067c0;
  --flu-accent-dark: #4cc2ff;
  /* Mica & Acrylic */
  --mica-light: #f3f3f3;
  --mica-dark: #1e1e26;
  --acrylic-taskbar: rgba(243,243,243,0.85);
  --acrylic-flyout: rgba(249,249,249,0.92);
  /* Chrome */
  --taskbar-h: 48px;
  --titlebar-h: 32px;
  --window-radius: 8px;
  --window-radius-max: 0px;
  /* Motion */
  --ease-win: cubic-bezier(0.2,0,0,1);
  --duration-quick: 120ms;
  --duration-standard: 200ms;
  --duration-slow: 320ms;
}
[data-theme="dark"] { /* inverted tokens + saturate tweaks */ }
```

All component CSS lives **co-located** with components (CSS Modules or Tailwind `@apply` with `data-slot` selectors per `coss` styling rules) — not in one giant file.

### 5.3 State Model (No Redux — Modern Minimal)

```ts
// Window
type WindowState = {
  id: string;
  appId: AppId;              // 'explorer' | 'notepad' | 'about' | ...
  title: string;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  rect: { x:number, y:number, w:number, h:number };
}

// Desktop
type DesktopState = {
  icons: DesktopIcon[];
  selection: Set<string>;
  marquee: Rect | null;
  contextMenu: { x:number, y:number } | null;
}

// System
type SystemState = {
  theme: 'light'|'dark'|'system';
  wallpaper: string;
  accent: string;             // Fluent blue + optional palette
  startOpen: boolean;
  quickSettingsOpen: boolean;
  calendarOpen: boolean;
}
```

Managed by **Zustand** (1 dependency, tiny) or **React Context + useReducer** if you prefer zero new deps. I recommend Zustand — matches win11React's simplicity but modern.

### 5.4 Component Deep Dive

#### A. Desktop Shell
- **Wallpaper Engine:** Theme-aware — light shows `desktop-bloom`, dark shows muted variant + `backdrop-filter: saturate(1.2)`. Smooth cross-fade on theme switch (not flash).
- **Icon Grid:** CSS Grid `auto-flow: column` with `grid-auto-columns: 88px` — icons fill column-wise like real desktop. Auto-arrange + manual drag reordering (with snap-to-grid).
- **Selection:** Click = select one, Ctrl+Click = multi, Shift+Click = range, drag-marquee = lasso rectangle (dashed `1px solid var(--flu-accent)` + `rgba(0,103,192,0.08)` fill), click empty = deselect all.
- **Context Menu:** Right-click empty area → `View > Large/Med/Small icons`, `Sort by`, `Refresh`, `Personalize` (opens Settings app). Right-click icon → `Open`, `Pin to Start`, `Rename`, `Properties`.
- **Keyboard:** F2 rename, Delete (no-op but toast), Arrow keys navigate grid, Enter open, Escape deselect.

#### B. Taskbar (Most Visible Upgrade)
- **Layout:** `height: 48px`, `backdrop-filter: saturate(3) blur(20px)`, `background: var(--acrylic-taskbar)`, `border-top: 1px solid rgba(255,255,255,0.6)` (light) / `rgba(255,255,255,0.1)` (dark). Center cluster + right tray.
- **Center Cluster:** Search pill (optional — can be icon-only to keep portfolio clean) → Pinned apps (Start, File Explorer, Browser, Store mock, Settings) → Running apps with underline indicator (rest vs active vs minimized visual states).
- **Taskbar Behavior:** Hover = subtle `var(--glass-soft)` wash + tooltip with app name, Active = `is-active` + accent underline, Minimized = dimmed but underline persists.
- **System Tray:** Hidden-icons chevron → Wifi → Sound → Battery → Clock/Calendar. Each is a `Popover` trigger.
- **Quick Settings Flyout:** 6 quick toggles (Wifi, Bluetooth, Flight, Battery Saver, Focus, Accessibility) + Brightness/Volume `Slider` (coss Slider) + Battery row + Settings link.
- **Calendar Flyout:** Mini calendar (coss Calendar) + agenda + collapsible notifications below.
- **Taskbar Context Menu:** Right-click taskbar → `Taskbar settings`.

#### C. Start Menu (Faithful Recreation)
- **Container:** `width: 640px`, `height: min(720px, calc(100dvh - 80px))`, `border-radius: 8px`, `background: var(--acrylic-flyout)` + `backdrop-filter: blur(30px) saturate(1.8)`, `box-shadow: 0 32px 64px rgba(0,0,0,0.24)`.
- **Header:** Search input (with Lucide Search icon, placeholder "Search apps, settings, and documents") — filters Pinned + All Apps live.
- **Pinned Section:** `grid-cols-6`, each tile `72px` square, icon `32px` + label `11px`, hover = acrylic wash. "All apps >" button in header.
- **All Apps View:** Alphabetical groups (`A`, `B`, `C`...) with letter rail on right (click letter → scroll to section). This replaces Pinned when toggled.
- **Recommended Section:** 2-col, 6 items max (recent projects + files), each with icon + title + subtitle (timestamp). "More >" expands.
- **Footer:** User avatar + name (left) + Power button + Theme toggle (right). Power shows popover with Sleep/Shut down/Restart (toast placeholders).
- **Motion:** `scale(0.96) → scale(1)` + `opacity 0→1` + `translateY(8px)→0` over `200ms var(--ease-win)`.

#### D. Window System (Core Engineering)
- **Chrome:** `WindowChrome` = App icon (21px) + Breadcrumb (`Desktop / AppName`) + Window controls (Min, Snap/Max, Close). Close hover = `#e81123`, Max hover shows Snap Overlay, Min collapses to taskbar.
- **Material:** Titlebar = Mica (`var(--mica-panel)` with radial wallpaper tint), Content area = `var(--window-surface)` + subtle `backdrop-filter: blur(16px)`.
- **Behavior:** Drag via titlebar (pointer capture, clamp to viewport), Resize via 8 handles (edges + corners), Double-click titlebar = maximize toggle, Maximize = `0px` radius + `100%` viewport minus taskbar.
- **Snap Overlay:** Hover Max button (>500ms) → shows 2×2 + 3-col snap grid; click slot → window snaps to that rect; paired window suggestion appears in empty slot (like Win11 snap assist).
- **Z-Stack:** Click/focus brings to front (increment global `z-counter`), minimized windows show in taskbar with filled underline, taskbar click toggles minimize/restore.
- **Apps as Windows:** Each portfolio section is an app — not just placeholder text. File Explorer shows projects with thumbnails; Notepad shows bio; Settings shows theme controls, etc. (see Apps below).

#### E. Portfolio Apps (Your Content — Windows as Pages)

| App | Window Type | Content |
|-----|------------|---------|
| **File Explorer — Projects** | Explorer chrome (sidebar + breadcrumb + grid) | Project cards with cover image, tags, links (GitHub / Live). Sidebar: Home / Desktop / Documents mock. View toggles: Grid/List. |
| **Notepad — Read Me** | Notepad chrome (menu bar + textarea) | Your intro/bio, monospace optional, line numbers optional |
| **About / Profile** | Custom acrylic card | Avatar, role, location (Kandy, LK), skills, timeline |
| **Experience** | Timeline window | Roles + education + certificates — vertical stepper |
| **Contact** | Form + social | Form (name/email/message → toast) + GitHub/LinkedIn/email/copy-email |
| **Settings** | Settings app clone | Appearance (Light/Dark/System), Wallpaper picker (3 options + upload), Accent color, About |
| **Browser (Edge mock)** | Browser chrome | External links: GitHub, LinkedIn, blog — address bar + tabs (visual only) |

*You can choose which apps to include — minimum is Explorer + Notepad + Settings + About. See Options below.*

#### F. Flyouts & Overlays
- **Context Menus:** `coss Menu` with `acrylic-flyout` styling, `8px` radius, `4px` item padding, shortcut hints right-aligned, separators.
- **Tooltips:** `coss Tooltip` — taskbar icon names, desktop icon full names when truncated.
- **Toasts:** `coss Toast` or `sonner` (already installed) — "Window snapped", "Copied to clipboard", "Coming soon" for unimplemented actions.
- **Widgets Panel:** Left slide-over (optional Phase 2) — weather + calendar + news placeholders with mica cards.

#### G. Motion & Polish
- **Tokens:** `--duration-quick: 120ms` (hover), `--duration-standard: 200ms` (flyout), `--duration-slow: 320ms` (window), `--ease-win: cubic-bezier(0.2,0,0,1)`.
- **Patterns:** Start/Calendar/QuickSettings = `scale+fade` (origin bottom-center), Windows = `scale(0.98)` + fade, Taskbar hover = `translateY(-1px)` + wash, Icon drag = `scale(1.02)` + shadow.
- **Stagger:** Pinned grid entrance = cascade `40ms` delay per icon, Recommended list = `24ms` per row.
- **Reduced Motion:** All animations guarded with `@media (prefers-reduced-motion: reduce)`.

---

## 6. Implementation Phases

### Phase 0 — Setup (1h)
- Audit + token migration: extract `globals.css` into `app/tokens.css` + `app/chrome.css`
- Install: `zustand` (state), ensure `motion` wired, add `coss` primitives via `pnpm dlx shadcn add @coss/<component>` (dialog, popover, menu, context-menu, tooltip, slider, tabs, toast, calendar)
- Create `components/ui/*` shims with Win11 styling

### Phase 1 — Shell (Core Fidelity) — MVP
**Goal:** Desktop + Taskbar + Start feel like Windows 11
- DesktopGrid + DesktopIcon (selection, marquee, hover, rename)
- Taskbar (48px acrylic, center cluster, tray, clock)
- StartMenu (search, pinned 6-col, recommended 2-col, all-apps, footer)
- WindowFrame + WindowChrome (drag, min/max/close, z-stack)
- Theme engine (light/dark/system + wallpaper switch)

**Deliverable:** You can browse desktop, open Start, launch windows, minimize to taskbar — feels like OS.

### Phase 2 — Windows as Portfolio
- FileExplorer app (projects grid/list + sidebar)
- Notepad / About / Experience / Contact apps
- Settings app (appearance controls)
- Context menus (desktop + icon + taskbar)
- System flyouts (Quick Settings, Calendar)

### Phase 3 — Polish & Performance
- Snap layouts + snap assist
- Window resize handles + maximize animation
- Notification center + toasts
- Keyboard navigation + command palette (Ctrl+K)
- Performance pass (`vercel-react-best-practices`): lazy-load app windows via `next/dynamic`, optimize images, bundle analysis
- Accessibility audit (focus traps, ARIA, keyboard)

### Phase 4 — Optional Backend (Only If You Want)
- Contact form API + email (Resend)
- Projects CMS (Notion API or Supabase + Drizzle)
- View analytics (Vercel Analytics or custom)

---

## 7. Three Options — Your Choice

### Option A — Minimal Faithful (Recommended for v3.1.0)
- **Scope:** Phase 1 + 2 (core apps: Explorer + About + Contact + Settings)
- **Fidelity:** 85% Win11 feel, clean portfolio, fast to ship
- **New deps:** `zustand` only (+ coss primitives already planned)
- **Time:** ~6–8h build + zip delivery
- **Best for:** Shipping quickly, iterating later

### Option B — Full Fidelity (Showcase)
- **Scope:** Phase 1 + 2 + 3 (all apps + snap + polish + widgets panel)
- **Fidelity:** 95% Win11 feel, snap layouts, resize, notification center, command palette
- **New deps:** `zustand` + optional `cmdk` for palette
- **Time:** ~10–14h build + zip delivery
- **Best for:** Maximum impact — portfolio that *is* the demo

### Option C — Frontend + Backend (Complete)
- **Scope:** Option B + Phase 4 (contact API + projects CMS)
- **Fidelity:** Full OS + live data
- **New deps:** + `resend` or `supabase`/`drizzle` as needed
- **Time:** ~14–18h
- **Best for:** If you want dynamic content without redeploys

> **My recommendation:** **Option A** first → ship v3.1.0, collect feedback, then layer Option B polish in v3.2.0. This avoids big-bang risk and gets you a testable build fastest.

---

## 8. What "Redesign From Scratch" Means Concretely

Per your instruction, we will **not** edit `app/page.tsx` in place. Instead:

1. **Keep** `app/page.tsx` untouched in git history (we branch the new shell alongside it)
2. **Create** new `components/desktop/*`, `components/taskbar/*`, etc. — fresh files with Win11-accurate markup
3. **Replace** `app/page.tsx` with a thin shell: `import { DesktopShell } from '@/components/desktop/DesktopShell'` — one line
4. **Rewrite** `app/globals.css` as token-only + move old styles to `_legacy.css` (not imported) for reference
5. **Deliver** as zip with clear `CHANGES.md` so you can diff or revert

No functionality breaks — the two-app model (Selected work + Read Me) remains, just re-implemented with proper windowing.

---

## 9. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| **coss + Base UI portal conflicts with Next.js SSR** | Use `dynamic(() => import(...), { ssr:false })` for window-heavy components; coss is SSR-safe but portals need client boundary |
| **Performance — many acrylic blurs = GPU cost** | Limit `backdrop-filter` to taskbar + flyouts + window chrome (3 layers max); disable blur in `prefers-reduced-motion` or low-end via `supports` query |
| **Mobile — desktop metaphor breaks on small screens** | Responsive fallback: <768px shows stacked cards + bottom sheet Start (like Win11 tablet mode). Desktop grid collapses to vertical list. |
| **Bundle size — adding Zustand + coss primitives** | Zustand = 3kB; coss primitives tree-shake; dynamic import app windows (only load Explorer when opened) |
| **Design drift from DESIGN.md** | Tokens file is single source; any color/spacing value not in DESIGN.md requires justification in PR |

---

## 10. Deliverables (Zip Structure)

```
pm-web_v3-win11-redesign-v3.1.0.zip
├── app/
│   ├── page.tsx              # New thin shell
│   ├── layout.tsx            # Updated (font + theme script)
│   ├── globals.css           # Rewritten tokens
│   └── tokens.css            # (new) Fluent tokens extracted
├── components/
│   ├── desktop/              # 4 files
│   ├── taskbar/              # 6 files
│   ├── start-menu/           # 5 files
│   ├── window/               # 4 files
│   ├── apps/                 # 4–7 files (per option)
│   └── ui/                   # 8–10 coss shims
├── lib/                      # 3 files
├── hooks/                    # 2–3 files
├── public/                   # Reorganized icons/wallpapers (if needed)
├── package.json              # Updated deps (added zustand, coss components)
├── pnpm-lock.yaml            # Updated
├── CHANGES.md                # What changed + how to apply
└── README.md                 # Updated run instructions
```

You apply by unzipping over your clone, running `pnpm install && pnpm dev`, and testing locally. No git history is rewritten.

---

## 11. What I Need From You (Approval Gate)

Please confirm:

1. **Option:** A (Minimal Faithful), B (Full Fidelity), or C (with Backend)?
2. **Apps to include:** Which portfolio windows matter most? (e.g., Projects + About + Contact is minimum — do you want Experience, Resume, Settings, Browser mock?)
3. **Search in Taskbar:** Icon-only (cleaner) or full search pill (more authentic)?
4. **Wallpaper:** Keep current bloom, or add light/dark pair + picker in Settings?
5. **Backend:** Do you want Contact form handling in this version, or defer?
6. **Proceed:** May I start building immediately after your reply?

---

### Quick Visual Reference

```
┌─────────────────────────────────────────────────────────────┐
│  Wallpaper (Mica tint adapts to theme)                     │
│                                                             │
│  [icon]  ┌──────────────────┐                              │
│  Selected│  Window (Mica)   │  ← draggable, resizable     │
│  [icon]  │  Titlebar  ─  □  X  ← Mica + snap on Max      │
│  Read Me │  Content (apps) │                              │
│          └──────────────────┘                              │
│  [context menu on right-click]                             │
│                                                             │
│  ┌──────── Start Menu (Acrylic 8px) ────────┐              │
│  │ Search                                    │              │
│  │ Pinned (6-col)        All apps >          │              │
│  │ Recommended (2-col)   More >              │              │
│  │ ──────────────────────────────────        │              │
│  │ PM  avatar            ⏻  Theme            │              │
│  └───────────────────────────────────────────┘              │
│ ┌─ Taskbar (Acrylic 48px) ────────────────────────────────┐ │
│ │ [⊞] [🔍] [apps ···]          [⌃ WiFi 🔊 🔋  10:42 AM] │ │
│ └─────────────────────────────────────────────────────────┘ │
│         Calendar flyout ↑      Quick Settings ↑              │
└─────────────────────────────────────────────────────────────┘
```

---

**Awaiting your approval to proceed.** Reply with your option choice + any adjustments, and I will start the rebuild immediately.

*— Plan prepared per `.agents/skills` analysis: `coss`, `coss-particles`, `stitch-design-taste`, `redesign-existing-projects`, `frontend-ui-engineering`, `motion-design`, `transitions-dev`, `vercel-react-best-practices`, `pnpm`.*
