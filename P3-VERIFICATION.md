# Phase 3 verification — fix-first gates

**Date:** 2026-11-02  
**Trigger:** you said **"Continue to next phase"** after the P2 handoff, which was read as P2 sign-off and authorization to start P3.  
**Scope:** six converters/simple calculators. No v1 formula/flow was trusted; each documented P3 issue was fixed first and covered by a pure-logic gate.  
**Cumulative zip:** `PM-Web-V3-Phase3.zip` (P1 + P2 + P3 repo files); superseded for clean clones by `PM-Web-V3-Phase5b.zip`.  
**Companion:** `CHANGELOG-Phase3.md`, `docs/tools-and-offline.md` → "P3 verification checklist (manual)". P4 adds `P4-VERIFICATION.md` and `CHANGELOG-Phase4.md`.

## Automated logic gates

All logic modules under `lib/tools/logic/` (P2 + P3) and the P2 inline worker source were compiled with TypeScript to CommonJS and exercised with Node `assert/strict`:

```bash
corepack pnpm@10.15.0 exec tsc -p /tmp/tsconfig.p3.json
node /tmp/p3verify.mjs
node /tmp/p2verify.mjs
```

Results: **ALL 8 P3 LOGIC GATES PASSED**, **ALL 12 P2 LOGIC GATES PASSED** and **ALL 12 P4 LOGIC GATES PASSED** — 32 cumulative gates.

| #   | P3 gate                                                       | What it proves                                                                                                                                                                                                                                                                                                                  |
| --- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Unit converter uses exact factors and affine temperature      | `0 °C → 32 °F`, `32 °F → 0 °C`, `0 K → −273.15 °C`, `1 mi → 1609.344 m`, `1 kWh → 3.6 MJ`, `1 lb → 0.45359237 kg`. Fixes v1's 1609.34 mile factor and `factor                                                                                                                                                                   |     | 1`; `convertLinear(5, 0, 1)`returns`null` instead of guessing. Invalid text and unknown units return errors. |
| 2   | CSS units validate context and keep zero values               | Defaults give `1 rem`, `1 em`, `100%`, `0.833 vw`, `1.481 vh`; custom base/viewport works; `px = 0` stays `0`; base `0`, viewport `0` and `px = "abc"` return explicit errors instead of falling back to 16 / 1920 / 1080.                                                                                                      |
| 3   | Contrast ratio is WCAG-correct and rejects invalid hex        | `#000/#fff = 21.00:1` with all four WCAG rows passing; `#777/#fff = 4.48:1` with AA normal failing; `#abc` expands to `#AABBCC`; `#12345`, `rgb(0,0,0)`, invalid foreground and invalid background all return errors before any ratio is shown. Fixes v1's luminance 0 for bad hex.                                             |
| 4   | Compressor detects support and formats sizes without guessing | `formatSize`, savings, filename generation, invalid-format gate and "no active `@ts-expect-error`" checks pass. `getStreamSupport()` reports the browser APIs explicitly.                                                                                                                                                       |
| 5   | Compressor gzip/deflate/deflate-raw round-trips Unicode text  | A repeated `Stream compressor round-trip 🌍 සිංහල` blob compresses smaller and decompresses back byte-for-byte in all three formats. Node 20 exposes the stream globals, so this is a real API round-trip, not a mock.                                                                                                          |
| 6   | Unsupported `CompressionStream` returns a clear error         | With both constructors removed from `globalThis`, `getStreamSupport()` reports `false`, `canUseCompression("compress", "gzip")` fails with a named `CompressionStream` message, and `transformBlob()` returns a readable error rather than crashing.                                                                            |
| 7   | PWM validates duty, peak and target voltage                   | `5 V` at `0/50/100%` → `0/2.5/5 V`, `3.3 V` at `50%` → `1.65 V`; 8-bit register `128`, 10-bit `512` at 50%; `6 V` target at `5 V` is impossible; `101%` duty, `0 V` peak and `abc` peak all return errors.                                                                                                                      |
| 8   | LED resistor uses exact Ohm's law, E-series and power safety  | `5 V / 2 V / 20 mA / 1 LED` → `150 Ω`, `0.06 W`, `0.125 W` recommendation, E12/E24 `150 Ω`; `12 V / 2 V / 20 mA / 3 LEDs` → `300 Ω` exact, E12 `330 Ω`, E24 `300 Ω`, `0.25 W`; `130 Ω` → E12 `150 Ω` / E24 `130 Ω`; `9.5 Ω` → `10 Ω`; invalid margin, zero LED count, non-numeric current and unknown series all return errors. |

## Other automated checks

| Check                                                                                 | Result                                                                                                                   |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `corepack pnpm@10.15.0 typecheck` (`tsc --noEmit`)                                    | Passed after all P3 files and formatting.                                                                                |
| `corepack pnpm@10.15.0 exec prettier --check` on all changed TS/TSX/CSS/MD repo files | Passed.                                                                                                                  |
| `node --check public/sw.js`                                                           | Passed (unchanged since P1).                                                                                             |
| Catalogue guard                                                                       | 11 `ported`, 23 `planned`, 1 `soon`, 35 unique ids.                                                                      |
| `next build` (Turbopack and webpack)                                                  | **Skipped** — both killed by the sandbox memory limit (exit 137 / V8 OOM) in P1/P2.                                      |
| `next dev --webpack`                                                                  | **Skipped** — P2 attempt started then OOM-killed while compiling `/`; no runtime smoke test is possible in this sandbox. |
| `pnpm lint`                                                                           | Not run; `eslint` is not declared in this checkout.                                                                      |

## Manual UI / offline checklist

See `docs/tools-and-offline.md` → **"P3 verification checklist (manual)"**. It covers all six views, golden cases, light/dark, narrow-window stacking, focus rings, the **27 ready · 7 planned · 1 available soon** sidebar count after P5a, the Privacy Policy storage row, and first-offline-visit chunk warming.

## Known limitations

- 23 tools still show **Not installed yet**; `latex-mathml-studio` still shows **Available soon**.
- Recents still record any catalogue selection, including placeholders, so the navigation is testable.
- `em` and `%` assume the parent font size equals the root font size; `vw`/`vh` use the configured viewport, not the live window.
- PWM register values assume a linear duty-to-register mapping and an ideal low-pass filter.
- The compressor uses the browser's native Compression Streams; unsupported browsers get a named fallback message, not a polyfill.
- Production build and dev server were not completed in this sandbox; local `pnpm build` / `pnpm dev` with normal memory is required before merging.
