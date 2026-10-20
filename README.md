# PM Web v3.1.0 — Windows 11 Desktop Portfolio

> A personal engineering portfolio presented as a **Windows 11 desktop workspace** — Mica titlebars, Acrylic taskbar & flyouts, Fluent motion.

This is **v3.1.0 (Option B — Full Fidelity)**, rebuilt from scratch from v3.0.0 per `PLAN_WIN11_REDESIGN.md`. The desktop now feels like an OS: draggable/resizable windows, Snap Layouts, Start menu with search + All apps, Quick Settings, Calendar, Widgets, 7 portfolio apps, and theme-aware wallpapers.

Follows the [blueedgetechno/win11React](https://github.com/blueedgetechno/win11React) material language (Mica/Acrylic, 48 px taskbar, 32 px titlebar, 8 px rounding) and your `DESIGN.md` tokens — re-engineered with Base UI, Tailwind v4, and Framer Motion.

---

## ✨ What’s new in v3.1.0

- **Desktop shell** — 7 icons, marquee lasso, inline rename (F2), desktop & icon context menus (View/Sort/Personalize).
- **Window manager** — drag via titlebar, 8 resize handles, minimize/maximize/close, Snap overlay on Max hover, z-stack, mica chrome.
- **Taskbar (48 px acrylic)** — Start + Search (icon-only) + pinned/running apps + system tray (Wifi/Volume/Battery + chevron) + Clock/Calendar + Notifications.
- **Start menu** — search with live filter, Pinned 6-col, Recommended 2-col, All apps alphabetical, user footer with Power + theme toggle.
- **Flyouts** — Calendar (35-day grid + agenda), Quick Settings (6 toggles + sliders), Hidden icons, Widgets panel (weather/today/notes).
- **Apps (7)** — File Explorer (6 projects, grid/list + tag filter), Notepad (bio), About (stats + skills), Experience (timeline), Contact (form → toast), Settings (theme/accent/wallpaper picker), Browser (Edge mock with links).
- **Design system** — tokens rewritten from `DESIGN.md` (Fluent accent #0067c0/#4cc2ff, Mica #f3f3f3, Acrylic blur 20 px saturate 3, ease `cubic-bezier(0.2,0,0,1)`).

See [`CHANGES.md`](./CHANGES.md) for the full diff and `PLAN_WIN11_REDESIGN.md` for the approved plan.

---

## 🚀 Run locally

```bash
# Node 20 → use pnpm 9 (compatible)
pnpm install
pnpm dev

# or with npm
npm install
npm run dev

# Node 22+ → you can use the original pnpm version
corepack use pnpm@11.9.0
pnpm install && pnpm dev
```

Open `http://localhost:3000`.

Build check:

```bash
pnpm build   # ✓ Compiled successfully (Next 16.3.5 Turbopack)
pnpm typecheck
```

---

## 🖥️ Interactions

- **Desktop:** Click select, Ctrl+Click multi, drag empty → marquee, double-click open, right-click → View/Sort/Personalize, F2 rename, Del → toast.
- **Windows:** Drag titlebar to move, drag edges/corners to resize, double-click titlebar to maximize, hover Maximize → Snap overlay (Left/Right/quadrants), Min/Close, click window to focus, ESC to close top.
- **Taskbar:** Start → Pinned/All apps/Recommended, Search → filtered Start, click app icon → open/minimize/restore, system tray → Quick Settings, clock → Calendar.
- **Start:** Type to filter apps, All apps → alphabetical, Recommended → open app, footer theme toggle saves to `localStorage`.
- **Contact:** Fill name/email/message → toast “Message sent”.
- **Settings:** Light/Dark cards, 7 accent dots, 3 wallpapers (Bloom/Hill/Workbench) — all persist to `localStorage`.

---

## 🎨 Wallpapers & theme

Three wallpapers in `public/images/` — switch in **Settings** or via code:

```ts
// app/page.tsx
const WALLPAPERS = {
  bloom:    "/images/desktop-bloom-wallpaper.webp",
  hill:     "/images/hill-country-wallpaper.webp",
  workbench:"/images/workbench-wallpaper.webp",
}
```

Theme is `data-theme="light|dark"` on `<html>` (read before paint to avoid flash). Accent is `--flu-accent` CSS var.

---

## 📁 Structure

```
app/
  layout.tsx       # metadata + before-paint theme script
  globals.css      # Fluent tokens + Mica/Acrylic + chrome (rewritten)
  page.tsx         # Desktop shell — windows, taskbar, Start, flyouts, apps
lib/
  data.ts          # projects + experience (edit your content here)
public/
  images/          # bloom, hill-country, workbench
  icons/thesvg/    # Windows 11, Azure folder/file, Notepad++
  icons/fluent-color/ # Fluent app icons
```

---

## 🛠️ Customize

- **Projects:** Edit `lib/data.ts` → `projects` (title, cover, tags, links).
- **Experience:** Edit `lib/data.ts` → `experience`.
- **Contact email:** Search `prasad@example.com` in `app/page.tsx` → replace + add `POST /api/contact` (Resend) for real sending.
- **CV:** Drop `public/cv.pdf` and update Experience’s Download button.
- **Links:** Edit `BrowserApp` in `app/page.tsx` → `links` array.
- **Accent:** Change `useState("#0067c0")` default or set `localStorage.pm-accent`.

---

## 📦 Icons & assets

- `public/icons/thesvg/` from [theSVG](https://thesvg.org/) (Windows 11, Azure Folder Blank/File, Files, Notepad++).
- `public/icons/fluent-color/` — Fluent folder icons.
- Lucide for UI controls, picsum.photos for project covers (replace with your images).

---

## 📄 License

AGPL-3.0 — see `LICENSE`.

---

## 🙏 Credits

Design tokens from `DESIGN.md` (Google Stitch extraction), reference [win11React](https://github.com/blueedgetechno/win11React), built with Next.js 16 + Tailwind v4 + Base UI + Framer Motion + Sonner.
