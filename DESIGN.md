---
name: Fluent Design System
colors:
  surface: '#fcf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae7e7'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1b1c1c'
  on-surface-variant: '#414752'
  inverse-surface: '#303030'
  inverse-on-surface: '#f3f0ef'
  outline: '#717783'
  outline-variant: '#c1c6d4'
  surface-tint: '#005eb1'
  primary: '#004f96'
  on-primary: '#ffffff'
  primary-container: '#0067c0'
  on-primary-container: '#dbe7ff'
  inverse-primary: '#a6c8ff'
  secondary: '#00658d'
  on-secondary: '#ffffff'
  secondary-container: '#4bc1fe'
  on-secondary-container: '#004d6c'
  tertiary: '#4d4f4f'
  on-tertiary: '#ffffff'
  tertiary-container: '#666767'
  on-tertiary-container: '#e6e6e6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d5e3ff'
  primary-fixed-dim: '#a6c8ff'
  on-primary-fixed: '#001c3b'
  on-primary-fixed-variant: '#004787'
  secondary-fixed: '#c6e7ff'
  secondary-fixed-dim: '#81cfff'
  on-secondary-fixed: '#001e2d'
  on-secondary-fixed-variant: '#004c6b'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c7'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#fcf9f8'
  on-background: '#1b1c1c'
  surface-variant: '#e5e2e1'
typography:
  display-window-title:
    fontFamily: Segoe UI, -apple-system, BlinkMacSystemFont, sans-serif
    fontSize: 28px
    fontWeight: '500'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-section:
    fontFamily: Segoe UI, -apple-system, BlinkMacSystemFont, sans-serif
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  title-card:
    fontFamily: Segoe UI, -apple-system, BlinkMacSystemFont, sans-serif
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: '0'
  body-default:
    fontFamily: Segoe UI, -apple-system, BlinkMacSystemFont, sans-serif
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: '0'
  body-secondary:
    fontFamily: Segoe UI, -apple-system, BlinkMacSystemFont, sans-serif
    fontSize: 12.33px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: '0'
  caption-small:
    fontFamily: Segoe UI, -apple-system, BlinkMacSystemFont, sans-serif
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 14px
    letterSpacing: '0'
  code-mono:
    fontFamily: Consolas, source-code-pro, Menlo, Monaco, monospace
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: '0'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 8px
  margin: 12px
  space-xs: 4px
  space-sm: 8px
  space-md: 12px
  space-lg: 16px
  space-xl: 24px
---

## Brand & Style
This design system embodies a serene, natural, and highly polished desktop computing experience inspired by physical materials interacting with digital light. It moves away from harsh flat planes toward gentle layering, tactile translucency, and intentional softness. Every surface feels tangible yet unobtrusive, creating a calm backdrop that lets user content shine while maintaining authoritative desktop window chrome aesthetics.

The visual atmosphere is defined by two foundational materials: **Mica** and **Acrylic**. Mica acts as an ambient canvas material that samples desktop background tones through a fixed, subtle radial tint, giving top-level app windows depth without unnecessary rendering cost. Acrylic brings active translucency, high-saturation color sampling, and Gaussian backdrop blurs to transient surfaces like the centered Taskbar, Start Menu flyouts, Quick Settings, and context menus. Paired with soft 6px-8px rounded corners, precision hairline borders, smooth cubic-bezier transitions, and delicate diffuse drop shadows (`0 0 6px rgba(0, 0, 0, 0.25)`), the interface projects an airy, sophisticated, and dependable environment across both Light and Dark modes.

## Colors
The system uses functional semantic CSS variables and data attributes (`data-theme="light"` and `data-theme="dark"`) to handle seamless system-wide theme switches with high accessibility and contrast.

### Primary Foundation
- **Fluent Accent Blue (Light Mode)** — `#0067c0`: The iconic accent used for primary CTA buttons, active taskbar badges, focused input underscores, and toggle states.
- **Fluent Vibrant Sky Blue (Dark Mode)** — `#4cc2ff`: High-luminosity neon-sky accent tuned specifically for high legibility against dark slate surfaces.
- **Canvas / Wallpaper Theme Base (Light)** — `#eeeeee`: Base desktop backing behind wallpaper canvas.
- **Canvas / Wallpaper Theme Base (Dark)** — `#1e1e26`: Deep obsidian purple-slate backdrop.
- **Mica Base (Light)** — `#f3f3f3` with radial gradient Emulating desktop wallpaper illumination.
- **Taskbar Acrylic Glass (Light)** — `rgba(243, 243, 243, 0.85)` with `backdrop-filter: saturate(3) blur(20px)`: Soft frosted glass running across the screen bottom.

### Functional States
- **Close / Destructive Hover** — `#e81123`: Immediate high-visibility red highlight across the window close button.
- **System Modal Dim Backdrop** — `rgba(0, 0, 0, 0.60)` for focused dialogs and overlays.

## Typography
The typographic engine relies on **Segoe UI** (falling back gracefully to modern native platform fonts). It conveys crisp legibility, generous x-height, and a neutral editorial tone. Headings feature gentle negative tracking (`-0.01em`) to maintain solidity, while body text keeps standard tracking (`0`) for maximal clarity. Baseline heights strictly conform to multiples of 4px.

## Layout & Spacing
The layout model follows a strict 4px baseline rhythm, utilizing a flexible window-based desktop paradigm where elements snap to coordinate grids and maintain breathing room through deliberate, measured whitespace. 

Windows scale across form factors with minimum constraints, collapsing sidebars into drawer overlays on narrow screens while preserving native desktop proportions like the fixed 48px taskbar and 28px titlebars.

## Elevation & Depth
Visual hierarchy is conveyed primarily through tonal layering, translucent acrylic materials, and ambient diffuse drop shadows. Top-level application windows float above the desktop canvas using soft, extra-diffused shadows (`0 0 6px rgba(0, 0, 0, 0.25)`), while transient UI surfaces like flyouts and context menus leverage 20px Gaussian backdrop blurs. Low-contrast hairline borders provide structural separation without visual heaviness.

## Shapes
The shape language favors approachable, gentle curves with a standard roundedness level. Base window corners are set to `6px`, creating a friendly yet precise desktop aesthetic. Smaller elements like buttons, inputs, and list items use `4px` rounded corners. When windows are maximized, their corner radius instantly collapses to `0px` to match native operating system behaviors.

## Components
Consistent styling of common UI components is anchored by the following specifications:

- **Buttons:** Primary action buttons feature the fluent accent color with white/black text, 4px border radius, and smooth opacity transitions. Secondary buttons use transparent fills with subtle hairline borders.
- **Input Fields:** Styled with clean backgrounds, 4px rounded corners, and a distinctive accent-colored bottom underscore or outline on focus.
- **Checkboxes & Radio Buttons:** Compact, geometric selections that adhere to the 4px roundedness scale, utilizing primary accent fills when checked.
- **Cards & Tiles:** Semi-opaque card surfaces with subtle borders and hover states that shift opacity or brightness to indicate interactivity, complete with chevron affordances where applicable.
- **Lists & Menus:** Clean vertical list structures featuring 28px–32px item heights, generous padding, and acrylic background materials with backdrop blurs for floating context menus.

---

For more detailed info - [GitHub Repo](https://github.com/blueedgetechno/win11React) or [Live Preview](https://win11.blueedge.me/)