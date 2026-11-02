# Tool Bench and offline contract (Phases 1–5b)

Phase 1 added one native DesktopOS window — **Tool Bench** — and the local
infrastructure every later phase reuses. Phase 2 ported five text/data tools;
Phase 3 added six converters and simple calculators; Phase 4 added six
electronics tools; Phase 5a added six mechanical tools; Phase 5b adds four
mechatronics tools. No v1 formula or flow was copied unchanged: every port keeps
the project's fix-first verification gate, and the documented P2, P3 and P4 v1
defects were fixed before the tools were marked `ported`.

## What shipped in P1

| Area                 | Implementation                                                                                                                                                                                                                |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App                  | `tools` in `APP_REGISTRY` / `DESKTOP_APPS`; `/tools` route, desktop shortcut, command palette icon, sitemap and `llms.txt` entry.                                                                                             |
| Window               | `AppBody` renders `ToolsApp` through `dynamic(..., { ssr: false })` with the shared `WindowBreadcrumb`. No route-surface freeze, no state loss on drag/snap.                                                                  |
| Navigation           | Animate UI `Tabs` + `TabsHighlight` + `TabsHighlightItem` + vertical `TabsList` for the gliding sidebar highlight; `TabsContents`/`TabsContent` per tab.                                                                      |
| Discovery            | Local search over title, description, id and keywords; six category tabs plus All / Recent / Favourites.                                                                                                                      |
| Recents / favourites | `hooks/use-tool-state.ts` with `pm-tools-state-v1` in `localStorage`; 8 recents max, 40 favourites max, unknown ids filtered out, cross-tab `storage` sync.                                                                   |
| Catalogue            | `lib/tools/catalog.ts`, 35 entries: **34 planned + 1 `soon`**. All are offline-capable.                                                                                                                                       |
| LaTeX                | `latex-mathml-studio` is `soon` and renders **Available soon** with a note pointing at `prasad-kmd/latex2mathml_next`. No implementation, no new dependency, no `temml`.                                                      |
| Connectivity         | `components/system/ConnectivityListener.tsx`, mounted once in `DesktopWorkspace`. v1 strings/ids/durations, Hugeicons wifi glyphs, existing bottom-right sonner Toaster, plus a fix for loading while already offline.        |
| Offline              | `public/sw.js` precaches `/tools` and the `/_next/static/*` assets it references, normalises `?tool=` away, and raises the static cap to 240. `lib/tools/warm.ts` warms ported tool chunks once the worker controls the page. |
| Legal / docs         | `STORAGE_REGISTER`, cookie-notice copy and Privacy Policy prose mention the new key. `docs/pwa-and-boot.md`, `README.md`, `app/~offline/page.tsx` and this document updated.                                                  |

### Explicitly not in P1

No menubar status chip, open-windows list, Settings → Tools section, first-run
hint, profile-widget change, minimise-to-dock behaviour, icon-map
centralisation, or unrelated housekeeping. No `package.json`, lockfile,
manifest, cache-name or `SW_VERSION` change. No new image assets; the 16 dead
`/icons/fluent-color/*` strings were removed from `APP_REGISTRY` because nothing
consumed `icon`.

## What shipped in P2

| Tool              | v1 defect fixed                                                        | Implementation                                                                                                                                                            |
| ----------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `json-formatter`  | `parseInt` without radix / NaN indent                                  | Closed 0/2/4/8 indent set, strict local `JSON.parse`, import/export, Unicode-safe output.                                                                                 |
| `html-encoder`    | `DOMParser().textContent` loses literal markup                         | Explicit named + numeric entity map, non-parsing decode, optional two-pass nested decode.                                                                                 |
| `data-transform`  | `btoa`/`atob` Unicode failure and `charCodeAt` surrogate-pair breakage | UTF-8 `TextEncoder`/`TextDecoder` with `fatal: true`; Base64, URL, hex and binary now all round-trip emoji and Sinhala. Binary decode added.                              |
| `diff-checker`    | 10-line look-ahead guess                                               | Real LCS diff with CRLF normalisation, paired changed rows, line/character caps and optional whitespace trimming.                                                         |
| `regex-architect` | Unguarded `new RegExp`/`exec`, catastrophic backtracking               | Bounded flags, pattern, test string, matches and iterations; matching runs in a 300 ms Blob worker that is terminated on timeout. Zero-length matches are handled safely. |

All five views are pure client code under `components/tools/views/`, share
`shared.tsx` Coss/Base UI primitives, use the P2 CSS in `app/tools.css`, and are
registered as lazy loaders in `lib/tools/registry.ts`. At P2 `warmToolModules()`
warmed five chunks. No new storage key, dependency, cache name or
service-worker version was introduced. Full golden-case results are in
`P2-VERIFICATION.md`.

## What shipped in P3

| Tool                      | v1 defect fixed                                                | Implementation                                                                                                        |
| ------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `unit-converter`          | mile factor 1609.34 and a factor fallback hiding zero          | Exact NIST factors, positive-factor validation, affine temperature through Celsius, 1 kWh → 3.6 MJ.                   |
| `css-unit-converter`      | `parseFloat` with a default fallback replaced zero contexts    | Explicit finite/positive parsing, px/rem/em/%/vw/vh, generated CSS, no guessed defaults.                              |
| `color-contrast-checker`  | invalid hex returned luminance 0 and a plausible ratio         | Strict 3/6-digit hex validation before WCAG 2.1 luminance, ratio and AA/AAA rows.                                     |
| `compressor`              | active `@ts-expect-error` and no `CompressionStream` detection | Structural stream types, explicit support gate, gzip/deflate/deflate-raw round-trip, clear unsupported-browser error. |
| `pwm-voltage-converter`   | `parseFloat` with fallback hid invalid/zero input              | Validated peak, 0–100% duty and target; 8/10-bit register values; impossible targets flagged.                         |
| `led-resistor-calculator` | zero/one defaults and loose E24 rounding                       | Exact Ohm's law, integer LED count, voltage margin check, next-higher E12/E24 value, 2× power recommendation.         |

All six views reuse `components/tools/views/shared.tsx` (extended with numeric,
select, result, compliance and colour fields) and the P3 CSS in
`app/tools.css`. At P3 `TOOL_LOADERS` registered eleven chunks; P4 raised that to
seventeen, P5a to twenty-three and P5b to twenty-seven. No new storage key, dependency, cache name, service-worker
version or other desktop UI change was introduced. Full golden-case results are
in `P3-VERIFICATION.md`.

## What shipped in P4

| Tool                       | v1 defect fixed                                                                                | Implementation                                                                                                                          |
| -------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `555-timer-calculator`     | `parseFloat` with fallback hid invalid values; rounded 1.44/1.1 constants                      | Strict positive finite parsing, explicit kΩ/µF scaling, coherent ln(2) astable timing and ln(3) monostable pulse.                       |
| `voltage-divider-designer` | forbidden `vd-*` keys, zero-current reset to 1 mA, only ±1 pair candidates, string-based power | Full E12/E24 grid with balanced voltage/current error, numeric ohm power, ±tolerance worst-case Vout, no persistence keys.              |
| `resistor-color-code`      | no `None` ±20% band, invalid bands became ±0%, defaults broke 5/6 bands                        | Explicit role-separated band table, valid defaults per band count, illegal-band errors, accessible neutral SVG resistor with labels.    |
| `op-amp-gain-calculator`   | `parseFloat` with fallback, only R1 > 0 checked, no supply clipping                            | Strict R1/Rf/Vin/rail validation, explicit inverting sign, optional rail clipping, ideal-model note.                                    |
| `pcb-trace-width`          | `parseFloat` with fallback, 1 oz approximated as 1.37 mils, constants in view                  | IPC-2221 constants centralised, 1.378 mils/oz, 0.0254 mm/mil, 20% design margin, external/internal k validated.                         |
| `pcb-impedance-calculator` | forbidden `pcb-imp-*` keys, unchecked thickness, wrong stripline `1.9h`, no validity warning   | Corrected `1.9(2h + t)` symmetric stripline, positive geometry checks, `0.1 < w/h < 3` and `1 < εr < 15` warnings, no persistence keys. |

All six views reuse `components/tools/views/shared.tsx` (extended with
`ToolColorSwatches`, `ToolBandField` and `ToolResistorDiagram`) and the P4 CSS in
`app/tools.css`. `TOOL_LOADERS` now registers twenty-seven chunks, so
`warmToolModules()` warms twenty-seven. No KaTeX panel or new dependency was added:
formulas are plain semantic text, and the resistor diagram is an inline SVG with
an accessible label and per-band titles. No new storage key, dependency, cache
name, `SW_VERSION`, `COOKIE_NOTICE_VERSION` or other desktop UI change was
introduced. Full golden-case results are in `P4-VERIFICATION.md`.

## What shipped in P5a

| Tool                           | v1 defect fixed                                                                  | Implementation                                                                                                                   |
| ------------------------------ | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `moment-of-inertia-calculator` | dark `#020617` html2canvas/jsPDF export; `moi-*` persistence; hidden zero inputs | Pure rectangle/circle/I-beam geometry with strict positive finite validation; local result copy and CSV replace the PDF export.  |
| `iso-fits-tolerances`          | `parseInt` without radix; `                                                      |                                                                                                                                  | 0` fallbacks; simplified p deviation | Explicit IT6–IT9 tables, strict H/f/g/h/p classes, radix-10 parsing, up-to-and-including size steps and fit classification. |
| `beam-deflection-calculator`   | hidden zero defaults; boundary cases not documented                              | Two Euler–Bernoulli cases with strict P/L/E/I validation, max moment, end slope and a 16× cantilever/simply-supported check.     |
| `gear-ratio-calculator`        | v1 help divided torque while code multiplied it; no efficiency input             | Explicit reduction direction, integer teeth, 0–100% efficiency and power in/out; speed stays independent of efficiency.          |
| `bolt-torque-chart`            | mixed static property-class values; no explicit assumptions                      | One consistent VDI 2230-style local M3–M20 dataset with µ ≈ 0.14 / 90% yield note, search and local CSV.                         |
| `material-database`            | ambiguous units; invented single melting points for CFRP/polymer                 | Explicit kg/m³, GPa, W/m·K, °C and MPa fields, null melting point where not single-valued, search/category filter and local CSV. |

All six views reuse `components/tools/views/shared.tsx` (extended with
`ToolDataTable`, `ToolCheckboxField`, `ToolSparkline` and `ToolDownloadButton`)
and the P5 CSS in `app/tools.css`. `TOOL_LOADERS` now registers twenty-three
chunks. No new dependency, storage key, cache name, `SW_VERSION`,
`COOKIE_NOTICE_VERSION` or other desktop UI change was introduced. Full
golden-case results are in `P5A-VERIFICATION.md`.

## What shipped in P5b

| Tool                        | v1 defect fixed                                                                 | Implementation                                                                                                                                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `stepper-motor-calculator`  | `parseFloat(...)                                                                |                                                                                                                                                                                                                          | default` hid blank lead / microstep values | Strict step angle, integer microstepping, lead-screw and belt/pulley maths; steps/rev, steps/mm and mm/step with no silent defaults. |
| `battery-life-estimator`    | hidden zero defaults, hardcoded 20 h rate, no efficiency or exponent validation | Explicit rated-hour Peukert `t = H·(C/(I·H))^k`, efficiency, reserve, 1 ≤ k ≤ 2 and strict capacity/current checks.                                                                                                      |
| `sensor-scaling-calculator` | out-of-range inputs were extrapolated without warning or clamping               | Explicit linear map with raw/clamped values, slope, offset, reverse-range support and an equal-endpoint error.                                                                                                           |
| `pid-controller-studio`     | two v1 tools; `setInterval` explicit Euler, integral windup, no reduced motion  | One merged tool with bounded semi-implicit steps, derivative on measurement, conditional anti-windup, output clamping, divergence guard, semantic SVG chart, `requestAnimationFrame` cleanup and reduced-motion support. |

All four views reuse the P5 shared primitives. `TOOL_LOADERS` now registers
twenty-seven chunks. The PID chart is an inline SVG using `var(--primary)`,
`var(--border)` and `var(--muted-foreground)`; it avoids Recharts, gradients and
persistent animation. No new dependency, storage key, cache name, `SW_VERSION`,
`COOKIE_NOTICE_VERSION` or other desktop UI change was introduced. Full
golden-case results are in `P5B-VERIFICATION.md`.

## Catalogue statuses

- `ported` — a loader exists in `lib/tools/registry.ts` and the view renders.
- `planned` — reserved catalogue space; the shell shows **Not installed yet**
  and the phase that will add it.
- `soon` — one reserved space for the deferred LaTeX editor/converter; the shell
  shows **Available soon**.

P1 shipped zero `ported` entries; **P2 shipped five, P3 shipped six more, P4 shipped six more, P5a shipped six
more and P5b shipped four more**, so the catalogue is now **27 ported · 7 planned · 1
`soon`**. The remaining `planned` entries and the one `soon` entry can still be
searched, opened, starred and remembered locally, but their workspaces show
**Not installed yet** or **Available soon**.

### Scope decisions carried into the catalogue

- Dropped: `user-persona-creator`, `student-guide-navigator`.
- Merged: the PID simulator and tuner became one `pid-controller-studio`.
- Excluded: the four v1 discovery links (`../researches`, `../open-books`,
  `../feeds`, `../game-deal`) are not tools.
- Deferred: `latex-mathml-studio` keeps one catalogue slot. It is not counted
  as a shipped tool in Phase 6b.

## Adding a ported tool in a later phase

1. Verify the v1 formula/flow first; do not assume it is correct. The v2
   inventory records the original audit findings; P2, P3, P4, P5a and P5b each added their
   own fix-first gates. P2 fixed five text/data defects; P3 fixed six
   converter/calculator defects; P4 fixed six electronics defects; P5a fixed six
   mechanical defects; P5b fixed four mechatronics defects. Remaining gates
   cover the eval-based calculator, sanitised preview, LaTeX conversion, resume
   migrations, Tailwind v3 presets and the P6 formula checks. Each port has its own verification gate in the
   phase plan.
2. Create `components/tools/views/<Tool>.tsx` as a client component accepting
   `ToolViewProps` (`{ toolId }`). Use the provided Coss/Base UI/Animate UI
   primitives and `DESIGN.md` tokens, not v1's Lucide card grid.
3. Register a lazy loader in `TOOL_LOADERS` keyed by the catalogue id.
4. Flip that entry's `status` from `planned` to `ported` in `lib/tools/catalog.ts`.
5. Run the per-tool fix/verification checks. A failed gate leaves the tool
   `planned` rather than shipping a wrong result.
6. `warmToolModules()` will fetch the new chunk on idle after the service worker
   takes control; no service-worker change is needed.

## Storage and privacy

`pm-tools-state-v1` is a visitor-only `localStorage` key holding two arrays of
catalogue ids: recent opens and favourites. It is never sent to a server. It is
listed in `STORAGE_REGISTER` (which drives the Privacy Policy table and Settings
privacy surface), in the cookie-notice copy, in the Privacy Policy prose, in
`docs/pwa-and-boot.md` and here. Setting **Reset preferences on this device**
clears it with the other named local-storage keys. No `COOKIE_NOTICE_VERSION`
bump was made: the purpose is a new local preference but the scope (first-party,
visitor, no tracking) is unchanged.

## Offline behaviour

- The service worker keeps `SW_VERSION = 3` and the existing `pm-*-v3` cache
  names. Existing keys remain valid.
- On install, `precacheToolsDocument()` fetches `/tools`, stores it in
  `pm-pages-v3` under the absolute `/tools` key, parses its
  `<script src>` / `<link href>` references, and warms those same-origin
  `/_next/static/*` assets into `pm-static-v3`. Failure is swallowed so it can
  never break installation.
- `normalizedPageKey()` deletes `tool` from `/tools` URLs. Selecting a tool uses
  `history.replaceState`, not an RSC navigation, so every selection resolves to
  the same cached document.
- `CACHE_LIMITS[pm-static-v3]` is 240 (was 160) to leave headroom for the shell
  and future lazy tool chunks without a cache-format change.
- `PM_RECACHE_CORE` restores the core **and** the Tool Bench document after
  Settings → Clear offline cache.
- `warmToolModules()` waits for `controllerchange` (or an 8 s fallback) before
  loading `TOOL_LOADERS`, so first-install chunks are actually intercepted by
  the worker. P5b registers twenty-seven loaders in total, so all ported chunks are
  warmed on idle.
- API calls are still excluded. Search, tabs, recents and favourites are entirely
  local. The connectivity toast is informational and does not gate the UI.

## P1 verification checklist (manual)

1. `pnpm install --frozen-lockfile` (or a pnpm supported by local Node), then
   `pnpm dev` / `pnpm build`.
2. Open `/` and confirm the **Tools** shortcut appears; open it and confirm the
   window title, breadcrumb, drag, resize, snap and close all behave like other
   native windows.
3. Visit `/tools` directly; the Tools window opens and focuses. Reload with
   `/tools?tool=json-formatter`; the matching catalogue row is active and the
   JSON formatter renders (P1 showed **Not installed yet** before P2).
4. Click category tabs: the Animate UI highlight glides between them. Keyboard
   Up/Down/Home/End work on the vertical tablist. Reduced-motion preference is
   respected.
5. Type a query; all tabs filter. Clear with the inline button.
6. Open a few tools, star some. Check **Recent** and **Favourites** tabs, counts
   in the sidebar, reload persistence, cross-tab sync, and **Clear recents**.
7. Open `latex-mathml-studio` and confirm **Available soon**, the
   `latex2mathml_next` reference note and no dependency prompt.
8. Toggle light/dark and a narrow window; three panes -> stacked layout, no
   horizontal overflow, visible focus rings.
9. Go offline on a hard load: confirm the persistent **You are offline** toast;
   come back online: **Back online** auto-dismisses after 5 s. Load while already
   offline to confirm the initial-state fix.
10. In a production PWA install, go offline before ever visiting `/tools` and
    open **Tools** from the offline page or shortcut; the shell, catalogue,
    search and favourites should work. After the worker has warmed them, the
    twenty-seven P2/P3/P4/P5a/P5b tool chunks should also open offline.
11. Check Privacy Policy / Settings storage table lists `pm-tools-state-v1`.
12. Confirm no other desktop UI changed (no menubar chip, no new Settings tab,
    no open-windows list).

## P2 verification checklist (manual)

1. Open each of the five P2 tools from the catalogue; confirm the lazy view
   loads with the shared header, breadcrumb and no network request.
2. JSON: format/minify `{ "නම":"Prasad","items":[1,2,3] }` with 0/2/4/8
   indentation; invalid JSON shows a readable error; import/export work.
3. HTML: round-trip `<div class="x">Tom's & "quote" 🌍</div>`; enable
   **Decode nested entities** and confirm `&amp;lt;b&amp;gt;` resolves to `<b>`.
4. Data transform: round-trip `Hello 🌍 é සිංහල` through Base64, URL, hex and
   binary; malformed hex/binary/base64/URL input shows an error, not a crash.
5. Diff: identical `a\r\nb` vs `a\nb` reports identical; insert/delete/move
   blocks produce correct `+`/`−` counts; a 1,050-line paste reports the cap.
6. Regex: the default email pattern highlights two matches; non-global flags
   return one; `(?=a)` with `g` shows three zero-length markers; `[` shows an
   error; a deliberately catastrophic pattern is stopped after 300 ms.
7. Toggle light/dark and a narrow window; the two-pane grids stack, focus rings
   remain visible, and no tool uses v1's Lucide card grid or gradients.
8. Confirm the sidebar foot now reads **27 ready · 7 planned · 1 available
   soon** after P5b, and Privacy Policy still lists only `pm-tools-state-v1` as
   new storage.

## P3 verification checklist (manual)

1. Open each of the six P3 tools from the catalogue; confirm the lazy view loads
   with the shared header, breadcrumb and no network request.
2. Unit converter: `0 °C → 32 °F`, `1 mi → 1609.344 m`, `1 kWh → 3.6 MJ`;
   invalid text shows an error, swap copies the result into the input.
3. CSS units: defaults `16 px / 16 px / 1920 / 1080` give `1 rem`, `100%`,
   `0.833 vw`, `1.481 vh`; a zero base or viewport reports an error rather than
   falling back to a default.
4. Contrast: `#000/#fff` reports `21.00:1` with all four WCAG rows passing;
   `#777/#fff` reports `4.48:1` with AA normal failing; `rgb(0,0,0)` is
   rejected before any ratio appears.
5. Compressor: gzip, deflate and raw-deflate round-trip a Unicode text file;
   the unsupported-browser path shows a named `CompressionStream` error; no file
   is uploaded.
6. PWM: `5 V` at `0/50/100%` gives `0/2.5/5 V`; a `6 V` target at `5 V` is
   marked impossible; `101%` duty reports an error.
7. LED: `5 V / 2 V / 20 mA / 1 LED` gives `150 Ω`, `0.06 W` and a `0.125 W`
   recommendation; `12 V / 2 V / 20 mA / 3 LEDs` gives `300 Ω` exact and
   `330 Ω` E12; `V_s ≤ N × V_f` reports an error.
8. Toggle light/dark and a narrow window; form grids and result grids stack,
   focus rings remain visible, and no tool uses v1's Lucide card grid or
   gradients.

## P4 verification checklist (manual)

1. Open each of the six P4 tools from the catalogue; confirm the lazy view loads
   with the shared header, breadcrumb and no network request.
2. 555 timer: astable `R1 = R2 = 10 kΩ`, `C = 10 µF` gives about `4.809 Hz`,
   `207.94 ms` period, `138.63 ms` high, `69.31 ms` low and `66.67%` duty;
   monostable `R = 10 kΩ`, `C = 10 µF` gives about `109.86 ms`; zero or text
   input shows an error instead of a hidden zero.
3. Voltage divider: `5 V → 3.3 V`, `1 mA`, `E24`, `±1%` selects `R1 = 1.8 kΩ`
   and `R2 = 3.3 kΩ`, reports `3.235 V`, `1.96%` error and about `4.90 mW`
   total dissipation; switching to `5 V → 2.5 V` gives E24 a better balanced
   score than E12; zero current is rejected rather than reset to 1 mA.
4. Resistor colour code: `brown-black-red-gold` gives `1 kΩ ±5%`;
   `brown-black-black-red-brown` gives `10 kΩ ±1%`; adding a red sixth band
   gives `50 ppm/K`; `None` as the tolerance band gives `±20%`; gold in a digit
   slot shows an error. Confirm the SVG has an accessible label, band titles
   and visible focus rings on the colour swatches.
5. Op-amp: `R1 = 1 kΩ`, `Rf = 10 kΩ`, `Vin = 1 V` gives `+11` / `+11 V`
   non-inverting and `−10` / `−10 V` inverting; entering `5 V` rails clips the
   non-inverting output to `+5 V`; `R1 = 0` is rejected.
6. PCB trace width: `1 A / 1 oz / 10 °C` gives about `0.300 mm` external and
   `0.781 mm` internal (≈2.6×); the recommended width is 20% larger; zero
   current or copper weight shows an error.
7. PCB impedance: microstrip `εr = 4.3`, `h = 0.2 mm`, `w = 0.33 mm`,
   `t = 0.035 mm` gives about `50.47 Ω`; stripline `εr = 4.2`, `h = 0.18 mm`,
   `w = 0.2 mm`, `t = 0.035 mm` gives about `39.46 Ω`; negative thickness is
   rejected and a `w/h` ratio outside 0.1–3 shows a warning.
8. Toggle light/dark and a narrow window; form grids, result grids and band
   swatches stack, focus rings remain visible, and no tool uses v1's Lucide card
   grid, gradients or KaTeX dependency.
9. Confirm the sidebar foot reads **27 ready · 7 planned · 1 available soon**;
   the LaTeX slot still shows **Available soon**; Privacy Policy still lists
   only `pm-tools-state-v1`; no other desktop UI changed.
10. In a production PWA install, confirm the service worker warms all twenty-seven
    tool chunks and each P4 tool opens offline after a hard offline load.

## P5a verification checklist (manual)

1. Open each of the six P5a tools from the catalogue; confirm the lazy view
   loads with the shared header, breadcrumb and no network request.
2. Moment of inertia: rectangle `100 × 200 mm` gives `6.6667e7 mm⁴` Ixx and
   `1.6667e7 mm⁴` Iyy; circle `d = 100 mm` gives about `4.9087e6 mm⁴`; I-beam
   `B = 150, tf = 10, Hw = 300, tw = 8` gives `9.0100e7 mm⁴` Ixx and
   `5.6378e6 mm⁴` Iyy. Copy and CSV are local; no PDF button appears.
3. ISO fits: `Ø25 H7/g6` gives `0 … +21 µm` hole, `−20 … −7 µm` shaft and
   `7 … 41 µm` clearance; `Ø50 H7/g6` gives `9 … 50 µm`; `Ø25 H7/p6` is
   interference; `Ø25 H7/h6` starts at zero clearance. Invalid classes or
   `> 500 mm` show an error.
4. Beam deflection: `1000 N / 2000 mm / 210000 MPa / 500000 mm⁴` gives
   `25.3968 mm` cantilever and `1.5873 mm` simply supported (16× ratio); zero
   or text input is rejected.
5. Gear ratio: `12 → 36` teeth at `1500 rpm / 5 N·m` gives `3:1`, `500 rpm`,
   `15 N·m`; `80%` efficiency gives `12 N·m`. Fractional teeth, zero driver or
   efficiency outside 0–100% show an error.
6. Bolt torque: `M8` is `24 / 35 / 41 N·m` for classes `8.8 / 10.9 / 12.9`;
   search, copy and CSV work locally and the friction/yield assumptions are
   visible.
7. Material database: `Aluminium 6061-T6` shows `2700 kg/m³`, `68.9 GPa`,
   `167 W/m·K`, `582 °C` and `276 MPa`; CFRP and polycarbonate show **not
   single-valued** melting point. Search and category filter work offline.
8. Toggle light/dark and a narrow window; tables scroll horizontally, result
   grids stack, focus rings remain visible and reduced motion suppresses chart
   animation.
9. Confirm the sidebar foot reads **27 ready · 7 planned · 1 available soon**;
   the LaTeX slot still shows **Available soon**; Privacy Policy still lists
   only `pm-tools-state-v1`; no other desktop UI changed.
10. In a production PWA install, confirm the service worker warms all
    twenty-seven tool chunks and each P5a tool opens offline after a hard
    offline load.

## P5b verification checklist (manual)

1. Open each of the four P5b tools from the catalogue; confirm the lazy view
   loads with the shared header, breadcrumb and no network request.
2. Stepper motor: `1.8° / 1/16 / 2 mm lead` gives `3,200 steps/rev`,
   `1,600 steps/mm` and `0.000625 mm/step`; `2 mm belt pitch / 20 teeth` gives
   `80 steps/mm`. Blank, zero or fractional pulley teeth show an error.
3. Battery life: `2000 mAh / 100 mA / 20% reserve / 100% efficiency` gives
   `16h 0m`; `80%` efficiency gives `12.8 h`. At the rated C/20 current,
   Peukert `k = 1.0` and `k = 1.2` both give `20 h`; at `400 mA` they give `5 h`
   and about `3.789 h`. Invalid reserve, efficiency or exponent show an error.
4. Sensor scaling: `4–20 mA → 0–100 bar` gives `50 bar` at `12 mA`, slope
   `6.25` and offset `−25`; `2 mA` clamps to `0` and `22 mA` clamps to `100`
   while the raw extrapolated values remain visible. Equal input min/max shows
   an error.
5. PID studio: the default `Kp = 2.5 / Ki = 1.2 / Kd = 0.5` step response is
   finite and stable; high gain with a low output limit activates anti-windup
   and keeps every control sample clamped. Confirm Run / Pause / Reset, the
   static SVG chart and that reduced motion reveals all samples immediately.
6. Toggle light/dark and a narrow window; result grids stack, focus rings
   remain visible and reduced motion suppresses chart animation.
7. Confirm the sidebar foot reads **27 ready · 7 planned · 1 available soon**;
   the LaTeX slot still shows **Available soon**; Privacy Policy still lists
   only `pm-tools-state-v1`; no other desktop UI changed.
8. In a production PWA install, confirm the service worker warms all
   twenty-seven tool chunks and each P5b tool opens offline after a hard
   offline load.

## Later phases

P2, P3, P4, P5a and P5b are **shipped**. Remaining: P6a math/data (4),
P6b content/core (3 shipped + the deferred LaTeX slot). Each phase is delivered as its own cumulative zip with its own
verification gate; stop for review after each one.
