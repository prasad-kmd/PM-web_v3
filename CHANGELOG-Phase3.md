# PM Web v3 — Phase 3 changelog (six converters / simple calculators)

**Date:** 2026-11-02  
**Trigger:** you said **"Continue to next phase"** after the P2 handoff. That was read as P2 sign-off and authorization to start **P3 only**.  
**Scope:** P3, then stop for review. `PM-Web-V3-Phase3.zip` is **cumulative** — it contains every P1 and P2 file plus the P3 changes, so it supersedes both earlier phase zips for a clean clone.  
**Target:** clean `pm-web_v3` at remote `main` `56297e7b68ae7acab80c5c4c37b211417abe742c`. No commit or push was made. `package.json`, `pnpm-lock.yaml`, `app/manifest.ts`, `lib/pwa.ts`, `lib/legal.ts`, `public/sw.js`, `SW_VERSION`, cache names and `COOKIE_NOTICE_VERSION` are unchanged in P3; no new dependency or storage key was added.

## What shipped

| Catalogue id | Tool | v1 defect fixed |
| ------------ | ---- | --------------- |
| `unit-converter` | Precision Unit Converter | mile factor `1609.34` → exact `1609.344`; `factor || 1` replaced with positive-factor validation; temperature now affine through Celsius; `1 kWh → 3.6 MJ`. |
| `css-unit-converter` | CSS Unit Converter | `parseFloat(x) || default` replaced with explicit finite/positive parsing; zero base/viewport no longer silently becomes 16 / 1920 / 1080. |
| `color-contrast-checker` | Color Contrast Checker | invalid hex no longer returns luminance 0 and a plausible ratio; strict 3/6-digit validation runs before WCAG 2.1 luminance, ratio and AA/AAA rows. |
| `compressor` | Stream Compressor | `@ts-expect-error` removed; structural stream types plus explicit `CompressionStream` / `DecompressionStream` feature detection; gzip, deflate and raw deflate round-trip; named unsupported-browser error. |
| `pwm-voltage-converter` | PWM to Voltage Converter | `parseFloat(x) || 0` replaced with validation of peak, duty and target; 8/10-bit register values; impossible targets flagged. |
| `led-resistor-calculator` | LED Series Resistor | `|| 0` / `|| 1` defaults removed; exact Ohm's law, integer LED count, voltage-margin check, next-higher E12/E24 resistor and 2× power recommendation. |

Catalogue is now **11 ported · 23 planned · 1 `Available soon`**. The sidebar foot count updates automatically. No v1 formula/flow was copied unchanged; see `P3-VERIFICATION.md` for the 8 P3 gates and the 12 cumulative P2 gates.

## New repo files

| Path | Purpose |
| ---- | ------- |
| `components/tools/views/UnitConverter.tsx` | Category / from / to selects, numeric input, swap, exact result card. |
| `components/tools/views/CssUnitConverter.tsx` | px, base, viewport context; five result cards; generated CSS example. |
| `components/tools/views/ColorContrastChecker.tsx` | Colour picker + hex fields, live preview, ratio and four WCAG compliance rows. |
| `components/tools/views/Compressor.tsx` | Local file drop, algorithm select, compress/decompress/download, support and size states. |
| `components/tools/views/PwmVoltageConverter.tsx` | Peak/duty/target inputs, average voltage, required duty and register results. |
| `components/tools/views/LedResistorCalculator.tsx` | Circuit inputs, LED presets, E12/E24 select, resistance/power/standard-value results. |
| `lib/tools/logic/units.ts` | Exact unit factors, affine temperature, validated linear conversion. |
| `lib/tools/logic/css-units.ts` | Explicit CSS context parsing and px/rem/em/%/vw/vh conversion. |
| `lib/tools/logic/color-contrast.ts` | Strict hex parsing, WCAG 2.1 luminance, ratio and compliance. |
| `lib/tools/logic/compressor.ts` | Stream support detection, size/savings/filename helpers, guarded blob transform. |
| `lib/tools/logic/pwm.ts` | Validated PWM average voltage, required duty and register values. |
| `lib/tools/logic/led.ts` | Ohm's law, E12/E24 series, power rating and LED presets. |

## Modified repo files

| Path | Change |
| ---- | ------ |
| `components/tools/views/shared.tsx` | Added `ToolNumberField`, `ToolSelectField`, `ToolResultGrid`, `ToolResultCard`, `ToolComplianceRow`, `ToolColorField`, `ToolBadge`, `formatDecimal`, and an optional `error` prop on `ToolField`. |
| `lib/tools/catalog.ts` | Six `status: "planned"` → `"ported"`. |
| `lib/tools/registry.ts` | Six more lazy `TOOL_LOADERS` entries; eleven total. |
| `app/tools.css` | Phase 3 styles: form/result grids, numeric units, colour picker/preview, compliance rows, file drop/row, badges, responsive stacking. |
| `docs/tools-and-offline.md` | P3 section, updated counts/statuses/offline notes, P3 manual checklist, remaining phases. |
| `docs/pwa-and-boot.md` | Offline-warming note updated from "later phases" to the eleven P2/P3 chunks. |
| `README.md` | Feature bullet now names eleven ported tools. |

P1 and P2 repo files are included unchanged in the zip except where listed above. Planning artifacts in the workspace root — `PM-Web-V3-Tools-Plan-v2.md`, `tools-inventory-v2.csv`, `PLAN-REVISIONS.md` and `PM-Web-V3-Tools-Plan-v2.zip` — were refreshed to mark P3 shipped; they are **not** repo files and are not inside `PM-Web-V3-Phase3.zip`.

## Validation performed

- `corepack pnpm@10.15.0 install --frozen-lockfile` — already passed in P1; `node_modules` still present, no reinstall needed.
- `corepack pnpm@10.15.0 typecheck` — **passed** after all P3 files.
- `corepack pnpm@10.15.0 exec prettier --check` on all changed/new TS/TSX/CSS/MD repo files — **passed**.
- Pure logic compiled with `tsc -p /tmp/tsconfig.p3.json` and exercised by `node /tmp/p3verify.mjs` — **8/8 P3 gates passed**.
- Cumulative P2 gates re-run with `node /tmp/p2verify.mjs` — **12/12 passed**.
- `node --check public/sw.js` — **passed** (unchanged).
- Catalogue guard — **11 ported, 23 planned, 1 soon**.
- `next build` and `next dev --webpack` — **skipped**: earlier attempts were killed by the sandbox memory limit (exit 137 / V8 OOM), not by a reported code error. Per your instruction, no further slow validation was attempted; the zip is for local application/testing.
- No lint run because `eslint` is not declared in this checkout.

## Apply the zip

`PM-Web-V3-Phase3.zip` contains all modified/new repo files with paths relative to `pm-web_v3/`, plus `CHANGELOG-Phase1.md`, `CHANGELOG-Phase2.md`, `CHANGELOG-Phase3.md`, `P2-VERIFICATION.md` and `P3-VERIFICATION.md` at the zip root. Unzip into the repository root of a clean clone and overwrite. It does **not** contain `node_modules`, `.next`, build output, the planning documents or the earlier phase zips.

```bash
pnpm install --frozen-lockfile
pnpm dev        # or pnpm build with your real NEXT_PUBLIC_SITE_URL
```

Then run the manual checklists in `docs/tools-and-offline.md` (P1 + P2 + P3) and review `P3-VERIFICATION.md`.

## Known limitations

- 23 tools still show **Not installed yet**; `latex-mathml-studio` still shows **Available soon**.
- Recents record any catalogue selection, including placeholders.
- `em`/`%` assume parent font size equals root; `vw`/`vh` use the configured viewport, not the live window.
- PWM register values assume a linear mapping and an ideal low-pass filter.
- The compressor uses native browser streams; unsupported browsers get a named fallback, not a polyfill.
- Production build and dev server were not completed in this sandbox; local verification is required before merging.

## Next gate

**Stop here for review.** P4 (six electronics tools: 555 timer, voltage divider, resistor colour code, op-amp gain, PCB trace width, PCB impedance) starts only after you approve P3, with its own cumulative zip and fix-first verification gate.
