# PM Web v3 — Phase 4 verification (six electronics tools)

**Date:** 2026-11-02  
**Trigger:** you said **"Continue to Next phase"** after the P3 handoff, which was read as P3 sign-off and authorization to start **P4 only**.  
**Scope:** six electronics tools. No v1 formula/flow was trusted; each documented P4 issue was fixed first and covered by a pure-logic gate.  
**Cumulative zip:** `PM-Web-V3-Phase4.zip` (P1 + P2 + P3 + P4 repo files).  
**Companion:** `CHANGELOG-Phase4.md`, `docs/tools-and-offline.md` → "P4 verification checklist (manual)".

## Standalone logic gates

All logic modules under `lib/tools/logic/` (P2 + P3 + P4) and the P2 inline worker source were compiled with TypeScript to CommonJS and exercised with Node `assert/strict`:

- `tsc -p /tmp/tsconfig.p2.json` → `/tmp/p2verify/`
- `tsc -p /tmp/tsconfig.p3.json` → `/tmp/p3verify/`
- `tsc -p /tmp/tsconfig.p4.json` → `/tmp/p4verify/`
- `node /tmp/p2verify.mjs` — **ALL 12 P2 LOGIC GATES PASSED**
- `node /tmp/p3verify.mjs` — **ALL 8 P3 LOGIC GATES PASSED**
- `node /tmp/p4verify.mjs` — **ALL 12 P4 LOGIC GATES PASSED**

**32 cumulative gates pass.**

|   # | P4 gate                                                                 | What it proves                                                                                                                                                                     |
| --: | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   1 | 555 astable golden case uses coherent ln(2) timing                      | `R1 = R2 = 10 kΩ`, `C = 10 µF` gives `4.808983 Hz`, `207.944 ms` period, `138.629 ms` high, `69.315 ms` low, `66.6667%` duty; `tH + tL = T` and duty > 50%.                        |
|   2 | 555 monostable golden case and strict input validation                  | `R = 10 kΩ`, `C = 10 µF` gives `0.109861 s` from `ln(3)`; zero/text/bad-mode input is rejected instead of hidden by a zero fallback.                                               |
|   3 | 555 fixes v1 rounded 1.44/1.1 and hidden zero defaults                  | Active code uses `Math.LN2` / `Math.log(3)`, not the rounded constants or `parseFloat(x) * scale                                                                                   |     | 0`.                                                                                          |
|   4 | Voltage divider 5 V → 3.3 V, 1 mA balances voltage and current          | Full E24 grid selects `R1 = 1.8 kΩ`, `R2 = 3.3 kΩ`; `3.235294 V`, `1.960784%` error, `0.980392 mA`, `28224` pairs checked; numeric-ohm power and ±1% worst-case Vout are coherent. |
|   5 | Voltage divider full E-series search improves E24 and rejects bad input | `5 V → 2.5 V` gives E24 a lower balanced score than E12; E12 checks `7056` pairs and E24 `28224`; zero current, `Vout >= Vin`, and an unknown series are rejected.                 |
|   6 | Resistor 4/5/6-band golden cases decode correctly                       | `brown-black-red-gold` = `1 kΩ ±5%`; `brown-black-black-red-brown` = `10 kΩ ±1%`; adding a red sixth band = `50 ppm/K`.                                                            |
|   7 | Resistor band table, `None` ±20%, defaults and illegal bands            | 13 colours, role-specific tables, valid 4/5/6 defaults, `None` = `±20%`, gold-as-digit and `None`-as-multiplier rejected; temp-coefficient options exclude white/gold/silver/none. |
|   8 | Op-amp sign, rail clipping and strict validation                        | Non-inverting `1 k / 10 k / 1 V` = `+11` / `+11 V`; inverting = `−10` / `−10 V`; `5 V` rail clips to `+5 V`; `R1 = 0`, negative `Rf`, text `Vin` rejected.                         |
|   9 | IPC-2221 trace width golden external/internal ratio                     | `1 A / 1 oz / 10 °C` gives `0.3004 mm` external, `0.7814 mm` internal, ratio `≈2.60`; `k = 0.048 / 0.024`, `b = 0.44`, `c = 0.725`, `1 oz = 1.378 mil`; 20% margin.                |
|  10 | IPC-2141 microstrip 50 Ω sanity and stripline `2h+t` fix                | `εr 4.3, h 0.2, w 0.33, t 0.035` gives `50.47 Ω` microstrip; `εr 4.2, h 0.18, w 0.2, t 0.035` gives `39.46 Ω` stripline; formula uses `1.9(2h + t)`, not `1.9h`.                   |
|  11 | IPC-2141 rejects bad geometry and warns outside validity range          | Negative thickness, `εr <= 1`, zero `h` and zero `w` are rejected; `w/h = 0.001` returns `ok` with `geometryValid = false` and an explicit comfort-range warning.                  |
|  12 | P4 source fixes all documented v1 high-risk patterns                    | Active P4 logic contains no `parseFloat`, no `                                                                                                                                     |     | 0`, and no `usePersistentState`; forbidden `vd-_`/`pcb-imp-_` keys are absent from the port. |

## Fix-first decisions

- **555 timer:** v1 used `parseFloat(x) * scale || 0`, rounded `1.44` / `1.1`, and a static waveform. P4 validates positive finite R/C, scales kΩ and µF explicitly, and derives astable high/low/period from `ln(2)` and the monostable pulse from `ln(3)` so frequency, period and duty are internally consistent [2](https://rftools.io/calculators/general/555-timer/) [3](https://www.partandstock.com/tools/ne555-timer). Standard astable duty is always above 50% unless a diode is added across R2 [3](https://www.partandstock.com/tools/ne555-timer).
- **Voltage divider:** v1 stored forbidden `vd-*` keys, reset zero current to 1 mA, searched only nearest ±1 E-series neighbours, and computed power from formatted `"kΩ"` strings. P4 uses no persistence, searches the full E12/E24 grid with a balanced relative voltage/current score, and keeps numeric ohms for power and ±tolerance worst-case Vout.
- **Resistor colour code:** v1 had no `None` ±20% band, turned invalid digits/tolerances into `±0%`, broke 5/6-band defaults, and had no accessible labels. P4 separates digit/multiplier/tolerance/TCR roles, rejects illegal bands, and adds a neutral inline SVG with an accessible label and per-band titles. The digit, multiplier, tolerance, `None` ±20% and TCR tables follow the standard colour-code chart [1](https://www.wellpcb.com/blog/pcb-basics/resistor-values/) [3](https://codingace.net/electrical/resistor_band_color_chart.html).
- **Op-amp:** v1 checked only `R1 > 0`, hid bad input behind `parseFloat || 0`, and ignored rails. P4 requires `R1 > 0`, `Rf >= 0`, finite `Vin` and optional positive rails, keeps the inverting sign explicit, and reports clipping.
- **PCB trace width:** v1 approximated 1 oz copper as `1.37` mils and kept constants in the view. P4 centralises IPC-2221 `I = k · ΔT^0.44 · A^0.725` with `k = 0.048` external / `0.024` internal, `b = 0.44`, `c = 0.725`, `1 oz/ft² ≈ 1.378 mil` and `0.0254 mm/mil` [1](https://tools.circuitmix.com/pcb-trace-width-calculator/) [5](https://www.atlaspcb.com/tools/trace-width-calculator/). A 20% design margin is reported separately.
- **PCB impedance:** v1 used forbidden `pcb-imp-*` keys, left thickness unchecked and used `1.9h` for symmetric stripline. P4 uses the IPC-2141 microstrip form `Z0 = 87 / √(εr + 1.41) · ln(5.98h / (0.8w + t))` and symmetric-stripline form `Z0 = 60 / √εr · ln(1.9(2h + t) / (0.8w + t))` [1](https://www.flux.ai/p/tools/pcb-impedance-calculator) [3](https://codingace.net/eng/stripline_impedance.html). It validates `t >= 0`, `h > 0`, `w > 0`, `1 < εr < 15`, and warns when `0.1 < w/h < 3` is violated [1](https://www.flux.ai/p/tools/pcb-impedance-calculator). Stripline `h` is the distance to each reference plane, not total board thickness [3](https://codingace.net/eng/stripline_impedance.html).

## Validation performed

| Check                                                                  | Result                                                                                                                                                                                                                                                                |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `corepack pnpm@10.15.0 typecheck` (`tsc --noEmit`)                     | Passed after all P4 files and formatting.                                                                                                                                                                                                                             |
| `prettier --write` / `--check` on changed/new TS/TSX/CSS/MD repo files | Passed on 62 repo files.                                                                                                                                                                                                                                              |
| `tsc -p /tmp/tsconfig.p4.json`                                         | Compiled all 17 logic modules plus the P2 worker source to CommonJS.                                                                                                                                                                                                  |
| `node /tmp/p4verify.mjs`                                               | **12/12 P4 gates passed**.                                                                                                                                                                                                                                            |
| `node /tmp/p3verify.mjs`                                               | **8/8 P3 gates passed**.                                                                                                                                                                                                                                              |
| `node /tmp/p2verify.mjs`                                               | **12/12 P2 gates passed**.                                                                                                                                                                                                                                            |
| `node --check public/sw.js`                                            | Passed; worker unchanged from P3.                                                                                                                                                                                                                                     |
| Catalogue guard                                                        | **17 ported · 17 planned · 1 soon**, 35 unique IDs.                                                                                                                                                                                                                   |
| Loader guard                                                           | 17 lazy `TOOL_LOADERS` / 17 dynamic imports.                                                                                                                                                                                                                          |
| CSS guard                                                              | `app/tools.css` braces **210 / 210**, balanced.                                                                                                                                                                                                                       |
| Working tree                                                           | 63 dirty repo files; remote `main` still `56297e7b68ae7acab80c5c4c37b211417abe742c`.                                                                                                                                                                                  |
| Forbidden-file parity                                                  | `package.json`, `pnpm-lock.yaml`, `app/manifest.ts`, `lib/pwa.ts` match `HEAD`; `public/sw.js` and `lib/legal.ts` match the P3 zip. `SW_VERSION = 3`, `COOKIE_NOTICE_VERSION = 2` unchanged; no `vd-*` / `pcb-imp-*` / `usePersistentState` / new `localStorage` key. |
| `next build` (Turbopack and webpack)                                   | **Skipped** — both killed by the sandbox memory limit (exit 137 / V8 OOM) in P1/P2.                                                                                                                                                                                   |
| `next dev --webpack`                                                   | **Skipped** — P2 attempt started then OOM-killed while compiling `/`; no runtime smoke test is possible in this sandbox.                                                                                                                                              |
| Lint                                                                   | **Not run** — `eslint` is not declared in this checkout.                                                                                                                                                                                                              |

## Manual checklist

See `docs/tools-and-offline.md` → **"P4 verification checklist (manual)"**. It covers all six views, golden 555 / divider / resistor / op-amp / IPC-2221 / IPC-2141 cases, light/dark, narrow-window stacking, focus rings, the **17 ready · 17 planned · 1 available soon** sidebar count, the Privacy Policy storage row, and first-offline-visit warming of all seventeen tool chunks.

## Known limitations

- Production build and dev server were not completed in this sandbox; local verification is required before merging.
- IPC-2221 and IPC-2141 are legacy/closed-form estimates; controlled-impedance and high-current designs still need the fabricator's stack-up and a field/thermal solver [1](https://www.flux.ai/p/tools/pcb-impedance-calculator) [5](https://www.atlaspcb.com/tools/trace-width-calculator/).
- No commit or push was made.

## Next gate

**Stop here for review before P5.** P5a (six mechanical tools) and P5b (four mechatronics tools) start only after you approve P4.
