---
name: Animate UI DesktopOS
reference: https://animate-ui.com/docs
product-topology: Interactive desktop workspace
colors:
  background-light: oklch(1 0 0)
  foreground-light: oklch(0.145 0 0)
  card-light: oklch(1 0 0)
  border-light: oklch(0.922 0 0)
  muted-light: oklch(0.97 0 0)
  muted-foreground-light: oklch(0.556 0 0)
  background-dark: oklch(0.145 0 0)
  foreground-dark: oklch(0.985 0 0)
  card-dark: oklch(0.205 0 0)
  border-dark: oklch(1 0 0 / 10%)
  muted-dark: oklch(0.269 0 0)
  muted-foreground-dark: oklch(0.708 0 0)
  destructive-light: oklch(0.577 0.245 27.325)
  destructive-dark: oklch(0.704 0.191 22.216)
typography:
  ui:
    fontFamily: Outfit, Arial, sans-serif
    fontSize: 14px
    fontWeight: "400"
    lineHeight: 20px
  titlebar:
    fontFamily: Outfit, Arial, sans-serif
    fontSize: 13px
    fontWeight: "500"
    lineHeight: 16px
  metadata:
    fontFamily: Outfit, Arial, sans-serif
    fontSize: 12px
    fontWeight: "500"
    lineHeight: 16px
  code:
    fontFamily: SFMono-Regular, Consolas, Liberation Mono, monospace
    fontSize: 12px
    fontWeight: "400"
    lineHeight: 18px
rounded:
  compact: 0.375rem
  DEFAULT: 0.625rem
  window: 0.625rem
spacing:
  baseline: 4px
  space-xs: 4px
  space-sm: 8px
  space-md: 12px
  space-lg: 16px
  space-xl: 24px
---

## Brand & Style

This design system keeps **PM Web v3 as an interactive DesktopOS**. It is not a documentation website and must not become a generic header, sidebar, or card-grid portfolio.

The interface retains a full-screen workspace canvas, persistent menubar, desktop shortcuts, concurrent application windows, drag/resize behavior, edge snap, and browser-persisted window geometry. Animate UI Docs supplies the visual language: neutral semantic surfaces, Outfit typography, compact control geometry, live Base UI primitives, and restrained motion.

The visual atmosphere is precise and quiet. The desktop is a solid semantic canvas with intentional open space. Windows are deliberate work surfaces with minimal, neutral chrome. The result should feel like a purpose-built workspace assembled from Animate UI components.

## Colors

The system uses Animate UI’s exact semantic CSS variables and a root `.dark` class. Components consume semantic tokens only; raw replacement values and custom palette extensions are not permitted.

### Primary foundation

- **Background / Light** — `oklch(1 0 0)`: Menubar, desktop canvas, and quiet structural surface.
- **Foreground / Light** — `oklch(0.145 0 0)`: Main text, symbols, and primary controls.
- **Card / Light** — `oklch(1 0 0)`: Window and application surface.
- **Border / Light** — `oklch(0.922 0 0)`: Hairline structural separation.
- **Muted / Light** — `oklch(0.97 0 0)`: Hover and secondary surface.
- **Background / Dark** — `oklch(0.145 0 0)`: Exact near-black Animate UI desktop base; never forced `#000`.
- **Foreground / Dark** — `oklch(0.985 0 0)`: Primary dark-mode text and controls.
- **Card / Dark** — `oklch(0.205 0 0)`: Elevated window and popover surface.
- **Border / Dark** — `oklch(1 0 0 / 10%)`: Dark-mode structural hairline.
- **Muted / Dark** — `oklch(0.269 0 0)`: Hover, selected, and secondary surface.
- **Destructive** — `oklch(0.577 0.245 27.325)` in light mode and `oklch(0.704 0.191 22.216)` in dark mode: close action feedback only.

### Functional states

- **Primary** is neutral near-black in light mode and near-white in dark mode. It is used for the PM mark and high-contrast identity only.
- **Accent** is the reference muted surface (`oklch(0.97 0 0)` light / `oklch(0.269 0 0)` dark). It is used for hover, selected, and open states.
- **Ring** is `oklch(0.708 0 0)` in light mode and `oklch(0.556 0 0)` in dark mode. It remains visible for keyboard focus.
- The defined semantic palette and surface treatments are the complete visual vocabulary.

## Typography

The typographic engine is **Outfit** (bundled locally as a variable font). It gives interface text the same compact, technical clarity as the Animate UI docs reference. Monospace is reserved for source, file metadata, and technical content.

Window titles use 13px medium weight and remain centered. Standard menu items, controls, and body text use 14px. Supporting status, date/time, shortcut labels, and sectional labels use 12–13px. Numeric status values use tabular figures.

Typography uses sentence case, practical weight hierarchy, and normal readable tracking. Decorative display faces, gradient text, typewriter effects, oversized hero headings, and all-caps decoration are excluded.

## Layout & Spacing

The layout follows a strict desktop-workspace model with a 4px spacing rhythm.

- **Menubar:** Fixed to the top edge; 40px tall; full width; page-background surface with a 1px bottom border.
- **Workspace:** Starts below the menubar and fills the remaining viewport. It is an intentionally open spatial canvas.
- **Desktop shortcuts:** Right-aligned grid with 88px columns, 82px-wide shortcut controls, 36px icon tiles, and 12px labels.
- **Windows:** Open in a cascade, retain their saved geometry, and stay independent of one another. They may be dragged, resized, maximized/restored, closed, focused, and edge-snapped.
- **Application interiors:** Use compact vertical spacing and bounded reading widths inside the window body. Settings has a small app sidebar; Read Me uses documentation-quality text and code—but both remain applications inside a desktop window.
- **Direct routes:** `/settings` and `/readme` render the same app bodies in a contained desktop-style surface with a clear route back to the workspace.

Navigation remains local to the menubar, shortcut canvas, window controls, and contextual menus.

## Elevation & Depth

Depth is functional, not atmospheric. The desktop canvas remains flat and quiet so that the active window is the only strong elevation cue.

Top-level windows use a single restrained shadow, a 1px semantic border, and the card surface. Inactive windows reduce title contrast and shadow density. Popup menus retain the exact published Animate UI/Base UI popover treatment, including its component-provided backdrop blur; this remains scoped to transient primitives.

Maximized windows meet the workspace edge and lose their outer corner radius. Elevation remains limited to clear structural hierarchy, with no decorative layers competing with the work surface.

## Shapes

The core radius is **10px** (`0.625rem`). Compact controls use 6px. Shortcut icon tiles use 8px. The shape language is measured, not pill-like.

- Menubar icon actions: 28px square with 6px radius.
- Menubar composition: 32px high with compact rounded triggers.
- Desktop shortcut: 10px radius.
- Window and settings cards: 10px radius.
- Window titlebar: 40px high.
- Window controls: two 40px-wide actions—maximize/restore and close only.
- Maximized windows: 0px outer radius.

Window actions are limited to maximize/restore and close. Icon tiles use single-stroke Hugeicons, and radii remain compact and consistent.

## Components

### Menubar

The menubar is a persistent desktop affordance with a compact PM identity mark on the left, the real Animate UI Base UI Menubar, and a theme control plus date/time status on the right. Its dark form is near-black because it inherits the reference dark background token; it is not an isolated forced-black bar.

Use the published Menubar composition: one animated popup is handed between triggers, item highlights and keyboard behavior are owned by the primitive, and menus preserve their reference origin, radius, border, shadow, and semantic tokens.

### Desktop shortcuts and context menus

Shortcuts remain real buttons with select, multi-select, F2 rename, Enter open, marquee selection, and right-click behavior. They use single-stroke Hugeicons-style icons in neutral icon tiles with clean text treatment.

Empty-canvas and shortcut context menus use the actual Animate UI Base UI Context Menu primitive: `Root → Trigger → Portal → Positioner → Popup`. Collision handling, keyboard behavior, focus management, reduced-motion support, and popup motion belong to the primitive.

### Windows

Windows are non-modal Animate UI dialogs with an independent outer geometry layer. The exact lifecycle is:

```txt
Dialog.Root modal={false} → Dialog.Portal → Dialog.Popup
```

The popup owns Animate UI’s entrance, exit, and reduced-motion behavior. The outer layer owns drag, resize, position, dimensions, z-order, maximize/restore, and invisible edge snap. Do not replace the dialog motion with a custom popup animation or add a Snap-preview overlay.

Window chrome uses a card surface, a 1px border, a centered title, and only maximize/restore plus close controls. The close action turns destructive only on hover/focus.

### Settings and Read Me

Settings offers the exact light and dark reference modes. Read Me is a clean technical document inside the app, with a compact toolbar, readable body copy, bounded code presentation, and copy feedback.

### Motion and accessibility

Animate UI motion is functional and restrained. Primitives are used directly where available; custom motion does not imitate or compete with their lifecycles.

- Animate transforms, opacity, and filter—not layout properties—for visual transitions.
- Entrances use short strong ease-out or spring responses; exits are quicker.
- Repeated interaction retargets instead of restarting.
- Reduced motion, keyboard navigation, collision handling, and focus behavior remain enabled.
- Sidebar-style indicators, when used within an app, follow the reference springs:

```ts
{ type: "spring", stiffness: 500, damping: 35 } // indicator
{ type: "spring", stiffness: 200, damping: 20 } // label shift
```

All interactive controls must retain semantic elements, accessible names, visible `ring` focus states, and sufficient contrast in both theme modes.

---

For visual and primitive reference: [Animate UI Docs](https://animate-ui.com/docs) · [Animate UI v2 source](https://github.com/imskyleen/animate-ui)
