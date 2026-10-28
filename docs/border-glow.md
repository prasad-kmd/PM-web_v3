# Border glow

The résumé's card edges use React Bits' **BorderGlow** — the component v2's
`components/portfolio/PointerGradientBorder.tsx` was built from. Layering is
BorderGlow's; the palette is v2's.

- Component: `components/ui/beam-card.tsx` (`BeamCard`)
- Styles: `app/globals.css`, the `Beam card` block
- Palettes: `--beam-palette` — monochrome by default, v2's spectrum with
  `<BeamCard tone="spectrum">` (the résumé hero)

The point of this document is fidelity: if the numbers below look arbitrary,
they are not — each one comes from the original component and is named after it.

---

## 1 · The two numbers

BorderGlow is a thin component. It writes two custom properties on the card and
lets CSS do the rest.

| property           | source                                              | range                                                                     |
| ------------------ | --------------------------------------------------- | ------------------------------------------------------------------------- |
| `--cursor-angle`   | `atan2(dy, dx) * 180 / π + 90`, normalised to 0–360 | bearing from the card's centre to the pointer, 0 at 12 o'clock, clockwise |
| `--edge-proximity` | `1 / min(cx / \|dx\|, cy / \|dy\|)`                 | 0 in the middle of the card, 100 on the perimeter                         |

Written by `write()` in `beam-card.tsx` on every `pointermove`, `pointerenter`
and `pointerdown` — exactly as the original does. There is no lerp: the original
sets the values directly, and the layers are soft enough that interpolation only
adds lag.

`--cursor-angle` is registered with `@property` (`syntax: "<angle>"`,
`inherits: true`) so it can be animated by CSS if we ever want to; the sweep in
§4 animates it from JS instead.

---

## 2 · The three layers

| layer                | what it draws                                                                                                            | appears above                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| `.beam::before`      | the rim: a 1px conic band over the pointer's half of the border, cut to the border with `mask-composite: exclude`        | `--color-sensitivity` = `--edge-sensitivity + 20` (50) |
| `.beam-edge`         | the bloom: a `--beam-glow` (40px) oversized box, masked to a narrow cone around the pointer (`2.5% / 10% / 90% / 97.5%`) | `--edge-sensitivity` (30)                              |
| `.beam-edge::before` | the original's seven-step `box-shadow` ladder, inset back to the card box                                                | — (inherits the parent's cone and opacity)             |

Opacity of each fading layer is the original's linear ramp:

```css
opacity: calc(
  (var(--edge-proximity) - var(--sensitivity)) / (100 - var(--sensitivity))
);
```

so nothing shows while the pointer is in the middle of the card, and the layer
is fully on at the perimeter.

v2's band is a conic with a transparent middle and two lit shoulders, and the
pointer's bearing is the conic's start:

```css
conic-gradient(
  from calc(var(--cursor-angle) + var(--beam-spin)),
  transparent 20%,
  rgb(49 134 255 / 13%) 34%,
  rgb(147 120 255 / 19%) 37%,
  rgb(249 107 214 / 50%) 39%,
  rgb(252 65 61 / 73%) 41%,
  #fc413d 48%, #ff6b2b 50%, #fec700 52%, #ffdb0f 56%,
  #88de42 58%, #0ebc5f 61%, #2eaab2 70%,
  rgb(49 134 255 / 73%) 73%,
  transparent 95%
)
```

`--beam-spin` is `180deg`, and it matters: v2's palette is authored with its
brightest stop at the conic's **50% mark** (the point opposite the start), while
`--cursor-angle` points straight at the pointer. The half turn reconciles the
two, so the hot part of the band lands under the pointer rather than behind it.
The monochrome default is built the same way — transparent 25%, a shoulder at
41%, a bright stop at 50%, a shoulder at 59%, transparent 75%.

---

## 3 · Leaving

The original fades the whole edge out slowly when the pointer leaves:

```css
.beam:not([data-hovered]):not([data-sweep])::before,
.beam:not([data-hovered]):not([data-sweep]) .beam-edge {
  opacity: 0;
  transition: opacity 750ms ease-in-out;
}
```

In: 250ms. Out: 750ms. `data-hovered` is set on entry, cleared on
`pointerleave`; `data-sweep` is held by the arrival animation.

---

## 4 · Arrival

`<BeamCard intro>` replays the original's sweep, with its timings:

| #   | property           | from → to     | duration | ease           | delay  |
| --- | ------------------ | ------------- | -------- | -------------- | ------ |
| 1   | `--edge-proximity` | 0 → 100       | 500ms    | ease-out cubic | 0      |
| 2   | `--cursor-angle`   | 110° → 287.5° | 1500ms   | ease-in cubic  | 0      |
| 3   | `--cursor-angle`   | 287.5° → 465° | 2250ms   | ease-out cubic | 1500ms |
| 4   | `--edge-proximity` | 100 → 0       | 1500ms   | ease-in cubic  | 2500ms |

Total: 4s. At the end, `data-sweep` is removed so the pointer takes over.

---

## 5 · What changed for this design system

DESIGN.md is monochrome, so the original's coloured pieces collapse:

| React Bits                     | here                                        | why                                                                            |
| ------------------------------ | ------------------------------------------- | ------------------------------------------------------------------------------ |
| `colors` (7 colour mesh)       | one `--beam-rim` tint                       | monochrome                                                                     |
| `glowColor` + `glowIntensity`  | `--glow-rgb` at the original's alpha ladder | one hue, no rainbow                                                            |
| `backgroundColor`              | the card's own background                   | cards keep their own surfaces                                                  |
| `borderRadius`                 | `--beam-radius: 10px`                       | DESIGN.md radius                                                               |
| `glowRadius: 40`               | `--beam-glow: 40px`                         | unchanged                                                                      |
| `coneSpread: 25`               | `--cone-spread: 25`                         | unchanged                                                                      |
| `edgeSensitivity: 30`          | `--edge-sensitivity: 30`                    | unchanged                                                                      |
| `mix-blend-mode: plus-lighter` | `plus-lighter` in dark, `normal` in light   | adding light does nothing on a white page                                      |
| `inset` shadows (inner sheen)  | omitted                                     | they need an opaque content wrapper; these cards sit transparent on the window |

The light theme therefore glows with a dark tint at the same alphas, the way the
original's `--light` variant does.

---

## 6 · Tuning

| to change                 | edit                                                                         |
| ------------------------- | ---------------------------------------------------------------------------- |
| how far the bloom reaches | `--beam-glow` on `.beam`                                                     |
| how wide the cone is      | the four percentages in `.beam-edge`'s masks, or `--cone-spread` for the rim |
| when each layer starts    | `--edge-sensitivity` / `--color-sensitivity`                                 |
| brightness                | the alpha ladder in `.beam-edge::before`, or `--glow-rgb`                    |
| rim thickness             | `padding: 1px` on `.beam::before`                                            |

Browsers without `mask-composite` get the plain hairline and no bloom
(`@supports not (mask-composite: exclude)`); `prefers-reduced-motion` drops the
transitions and the sweep.
