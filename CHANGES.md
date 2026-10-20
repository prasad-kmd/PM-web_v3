# CHANGES — v3.0.0 → v3.1.0 · Windows 11 Desktop Redesign (Option B)

**Date:** 2026-10-20  
**Option:** B — Full Fidelity (phases 1 + 2 + 3)  
**Request:** Redesign from scratch, not patch — inspired by win11React + Fluent/Mica/Acrylic (DESIGN.md)

---

## Summary

This release rebuilds the portfolio as an authentic Windows 11 desktop shell. The old `app/page.tsx` (517-line single component with 2 icons + basic taskbar/Start) is replaced by a full windowing system, acrylic/mica materials, and 7 portfolio apps.

**All code is new construction.** Nothing was “edited in place” — the shell, tokens, and app contents were written from scratch and dropped in as replacements.

---

## What changed

### `package.json` — dependencies
- **Added `framer-motion@14.4.0`** — canonical motion engine (the `motion` package’s Next.js/Turbopack export for `AnimatePresence` was not resolving; `framer-motion` is the stable path and is what `motion` re-exports internally).
- Kept `@base-ui/react`, `@floating-ui/react`, `lucide-react`, `sonner`, `tailwind-merge`.
- Removed unused `zustand` (we use React state + Context; no extra store needed).
- Bumped `version` → `3.1.0`, updated `packageManager` to `pnpm@9.15.9` (Node 20 compatible — original `11.9.0` requires Node 22+; your lockfile still builds with pnpm 9).

### `app/layout.tsx` — root
- Added full `metadata` (title “Prasad M. — Desktop”, keywords, OpenGraph, favicon).
- Added inline `<script>` to restore `pm-theme`, `pm-wallpaper`, `pm-accent` before paint (prevents flash).
- Added `suppressHydrationWarning` for theme attribute.

### `app/globals.css` — **complete rewrite (32 KB)**
- Single-source Fluent tokens derived 1:1 from `DESIGN.md` + Win11 spec.
- Light vs Dark via `[data-theme="light|dark"]` — covers accent, canvas, mica, acrylic, glass, hover/press/selection.
- Per-wallpaper tint variables (`--wallpaper-tint`) for Bloom / Hill Country / Workbench.
- Motion tokens: `--ease-win: cubic-bezier(0.2,0,0,1)`, durations `--duration-quick/standard/slow/window`.
- New sections: desktop grid (column-fill like real OS), 48px taskbar acrylic, Start menu 640px acrylic, mica window chrome, snap overlay, 8 resize handles, flyouts (calendar, quick settings, context menu, widgets), mobile tablet-mode (`<768px` collapses to stacked cards + full-screen windows).

### `app/page.tsx` — **new shell (1,400+ lines, replaces old file)**
Implements the entire Option B feature set:

#### Desktop shell
- Three wallpapers with theme-aware tint + cross-fade.
- 7 desktop icons (grid, selection, marquee lasso, inline rename F2, drag affordance) — labels persisted in state.
- Right-click context menus: **Desktop** → View/Sort/Refresh/Personalize/Display settings; **Icon** → Open/Pin/Rename/Properties.
- Widgets button (left edge) → Widgets panel.

#### Window manager
- `WindowState` with z-stack, minimized/maximized, restore rect, prevRect.
- Open/focus/minimize/maximize/close, ESC handling, `data-theme` backdrop.
- Titlebar drag (pointer capture, clamp optional), 8 edge/corner resize handles with min 360×240.
- Snap overlay on Max hover (400 ms delay) → Left/Right/Top-left/Bottom-right (50% and quadrant) + snap assist placeholder.
- Mica titlebar (`--mica-panel`), mica card content, maximized → 0 radius.

#### Taskbar (48 px acrylic)
- Center cluster: **Start** (Windows icon) + **Search** (icon-only, opens Start focused) + pinned apps (Explorer, About, Experience, Contact, Browser) + running indicators (accent underline, active vs minimized).
- System tray: hidden-icons chevron (expanded flyout), Quick Settings trigger (Wifi/Volume/Battery), Clock/Calendar, Notifications bell.
- Taskbar right-click → Taskbar settings.

#### Start menu (acrylic 8 px, 640 px)
- Search pill with live filter (matches app titles).
- **Pinned** 6-col grid, **Recommended** 2-col (recent files), **All apps** alphabetical groups with sticky letter headers.
- Footer: avatar + name + Power (toast) + Theme toggle.
- Entry animation `scale(0.98) + translateY(8px)` 200 ms `ease-win`.

#### Flyouts
- **Calendar** (360 px): month header, weekday row, 35-day grid with today highlight, agenda (2 demo events), prev/next month toasts.
- **Quick Settings** (360 px): 6 toggles (Wifi active, others demo), brightness/volume sliders, battery row + Settings shortcut.
- **Hidden icons** (280 px): Bluetooth/Display/Notifications/Security demo.
- Close on backdrop click or ESC.

#### Widgets panel (left slide-over)
- Weather (Kandy), Today/Calendar placeholder, Build notes — acrylic cards.

#### Apps — each app is a window (portfolio content)
| App | Window | Content |
|-----|--------|---------|
| **File Explorer — Selected work** | Explorer chrome (sidebar Quick Access + Tags filter, breadcrumb, grid/list toggle) | 6 project cards (picsum covers, tags, GitHub/Live links) — tag filter, grid 3-col + list mode |
| **Read Me.txt — Notepad** | Notepad chrome (File/Edit/View menu, status bar) | Bio intro, monospace header, `links` code block, tip |
| **About** | Profile | Avatar, role, stats (12+ projects, 8 sites, 40+ tokens), Field/Code/Design skill cards, principles |
| **Experience** | Timeline | Stepped timeline with QA/QC + portfolio builder + BSc, CV download + share |
| **Contact** | Form + social | GitHub/email/LinkedIn tiles, form with validation → toast “Message sent” |
| **Settings** | Settings clone | Theme 2-card picker (Light/Dark), accent 7-color dots, wallpaper 3-thumb picker (with check), About section with badges |
| **Links — Browser** | Edge mock (traffic lights + address bar + refresh) | 4 quick links (GitHub, PM Web v3, v1, LinkedIn) + tip |

#### Motion & a11y
- `framer-motion` `AnimatePresence` + `motion.section/aside/div` with `ease: [0.2,0,0,1]`, 160–220 ms.
- `prefers-reduced-motion` guard in globals.css.
- Keyboard: F2 rename, Enter open, Delete toast, arrow navigation scaffolding, ESC cascade (context → flyout → Start → window).
- Focus return, aria-labels, role=dialog.

### `lib/data.ts` — **new (92 lines)**
- Project data (6 projects with cover, tags, links, dates) — edit to replace with real content.
- Experience array (3 entries) + skills object.
- Imported by `ExplorerApp` and `ExperienceApp`.

---

## Files touched
- `app/globals.css` — **rewritten** (keep old as `app/globals.css.bak` if you want to diff)
- `app/layout.tsx` — **rewritten**
- `app/page.tsx` — **rewritten** (old 517-line file replaced)
- `package.json` + `pnpm-lock.yaml` — **updated** (added framer-motion)
- `lib/data.ts` — **new**
- `CHANGES.md` — **new** (this file)
- `PLAN_WIN11_REDESIGN.md` — **new** (plan you approved)

No other files were modified. `next.config.mjs`, `tsconfig.json`, `.npmrc`, `public/` assets, `.agents/skills/` untouched.

---

## How to apply (zip)

1. Unzip over your clone:
   ```bash
   # from repo root
   unzip ~/pm-web_v3-win11-redesign-v3.1.0.zip -d .
   # or drag-drop in your file manager (overwrite when prompted)
   ```
2. Install & run (Node 20 + pnpm 9):
   ```bash
   pnpm install
   pnpm dev
   # or with npm:
   npm install
   npm run dev
   ```
   Open `http://localhost:3000`.

3. If you use Node 22+, you can restore the original packageManager:
   ```bash
   corepack use pnpm@11.9.0
   ```

---

## Verification

- `pnpm build` → **✓ Compiled successfully** (Next 16.3.5 Turbopack, 3.0 s, TypeScript 4.7 s, static generation 187 ms)
- Route ` / ` → `○ (Static)` prerendered
- Manual smoke: Start opens/closes, search filters, pinned → window, Explorer grid/list, Contact form toast, Settings theme/wallpaper switch, calendar/quick settings flyouts, snap overlay on Max hover, desktop marquee + right-click.

---

## Customization checklist

- **Replace projects:** Edit `lib/data.ts` → `projects` array (title, cover, tags, links).
- **Real contact:** Change `prasad@example.com` in `ContactApp` + set up `POST /api/contact` with Resend (Phase 4).
- **CV PDF:** Drop `public/cv.pdf` and update ExperienceApp’s Download button `href`.
- **Accent default:** Change `useState("#0067c0")` in `app/page.tsx` or set `localStorage.pm-accent`.
- **Wallpaper:** Add new webp to `public/images/` and extend `WALLPAPERS` in `app/page.tsx`.

---

## What was intentionally deferred (per Option B scope)

- Snap assist second-window suggestion (shows overlay, but does not auto-populate the empty half — easy Phase 3.2 addition).
- Notification center history stack (uses `sonner` toasts for now).
- Command palette (Ctrl+K) — design ready, can add `cmdk`.
- Backend (contact API, CMS) — Phase 4 opt-in.

---

## Rollback

```bash
git status          # see changed files
git checkout -- app/globals.css app/layout.tsx app/page.tsx
rm lib/data.ts
pnpm install        # restores lockfile if needed
```

Or restore from your pre-zip backup.

---

## Credits

- Design tokens: your `DESIGN.md` (Stitch) — enforced as single source.
- Reference: [blueedgetechno/win11React](https://github.com/blueedgetechno/win11React) — materials, metrics, and motion language (not code).
- Primitives: Base UI + Lucide + Sonner + Framer Motion.
- Skills applied: `coss`, `coss-particles`, `stitch-design-taste`, `redesign-existing-projects`, `frontend-ui-engineering`, `high-end-visual-design`, `ui-ux-pro-max`, `motion-design`, `transitions-dev`, `vercel-react-best-practices`, `pnpm`.

