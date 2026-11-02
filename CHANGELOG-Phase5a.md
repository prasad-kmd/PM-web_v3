# Changelog — Phase 5a

**Date:** 2026-11-02  
**Scope:** P5a only, then continue to the already-authorized P5b. `PM-Web-V3-Phase5a.zip` is **cumulative** — it contains every P1, P2, P3 and P4 file plus the P5a changes. P5b is delivered separately in `PM-Web-V3-Phase5b.zip` and supersedes this zip for clean clones. Stop before P6.  
**Remote:** `main` remains `56297e7b68ae7acab80c5c4c37b211417abe742c`; no commit or push was made.

## Shipped tools

| Tool                           | Pure logic                             | View                                                   | Fix-first change                                                                                                                                                    |
| ------------------------------ | -------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `moment-of-inertia-calculator` | `lib/tools/logic/moment-of-inertia.ts` | `components/tools/views/MomentOfInertiaCalculator.tsx` | Replaced the v1 dark `#020617` html2canvas/jsPDF PDF export and `moi-*` persistence keys with strict geometry, local result copy and CSV download.                  |
| `iso-fits-tolerances`          | `lib/tools/logic/iso-fits.ts`          | `components/tools/views/IsoFitsTolerances.tsx`         | Explicit IT6–IT9 tables, `Number.parseInt(..., 10)`, strict H/f/g/h/p classes, up-to-and-including size steps and clearance/transition/interference classification. |
| `beam-deflection-calculator`   | `lib/tools/logic/beam-deflection.ts`   | `components/tools/views/BeamDeflectionCalculator.tsx`  | Two validated Euler–Bernoulli boundary cases with strict P/L/E/I parsing, max moment, end slope and the 16× cantilever/simply-supported ratio.                      |
| `gear-ratio-calculator`        | `lib/tools/logic/gear-ratio.ts`        | `components/tools/views/GearRatioCalculator.tsx`       | Corrected the v1 help text that divided torque; the module multiplies torque by ratio × efficiency and keeps speed independent of efficiency.                       |
| `bolt-torque-chart`            | `lib/tools/logic/bolt-torque.ts`       | `components/tools/views/BoltTorqueChart.tsx`           | Replaced the mixed v1 static table with one consistent VDI 2230-style local dataset, explicit assumptions, search, copy and CSV.                                    |
| `material-database`            | `lib/tools/logic/material-database.ts` | `components/tools/views/MaterialDatabase.tsx`          | Explicit units for every property, verified 6061-T6 values and null melting point for CFRP/polycarbonate rather than a single invented temperature.                 |

## Supporting changes

- `components/tools/views/shared.tsx`: added `ToolDataTable`, `ToolCheckboxField`, `ToolSparkline` and `ToolDownloadButton` for P5a/P5b.
- `app/tools.css`: added semantic-token table, checkbox and reduced-motion sparkline styles; braces are balanced at 223/223.
- `lib/tools/registry.ts`: six more lazy loaders; **23 total**.
- `lib/tools/catalog.ts`: six P5a entries flipped to `ported`; **23 ported · 11 planned · 1 soon**, 35 unique IDs.
- `lib/tools/warm.ts`: comment now says twenty-three loaders.
- `README.md`, `docs/tools-and-offline.md` and `docs/pwa-and-boot.md`: P5a shipped, twenty-three tool chunks, P5a fix-first table and manual checklist.
- Root planning artifacts: `tools-inventory-v2.csv` P5a rows are `ported (P5a)`; `PM-Web-V3-Tools-Plan-v2.md` and `PLAN-REVISIONS.md` mark P5a shipped and P5b authorized.
- Earlier changelog/verification records were updated to note that P5a was the current clean-clone zip at this point, with the 23/11/1 count. P5b now supersedes it.

No new dependency, storage key, cache name, `SW_VERSION`, `COOKIE_NOTICE_VERSION`, manifest, lockfile, service-worker change or unrelated desktop UI change was introduced. `package.json`, `pnpm-lock.yaml`, `app/manifest.ts` and `lib/pwa.ts` still match HEAD; `public/sw.js` and `lib/legal.ts` are unchanged from the P4 zip.

## Validation

- `corepack pnpm@10.15.0 typecheck` — passed.
- `prettier --write` then `--check` on the 62 earlier repo files, the 12 new P5a logic/view files and the root docs — passed.
- `tsc -p /tmp/tsconfig.p5a.json` — compiled all P2–P5a pure logic modules.
- `node /tmp/p5averify.mjs` — **8/8 P5a logic gates passed**.
- Cumulative rerun: `node /tmp/p2verify.mjs` **12/12**, `node /tmp/p3verify.mjs` **8/8**, `node /tmp/p4verify.mjs` **12/12** = **40 cumulative gates**.
- `node --check public/sw.js` — passed.
- Catalogue guard — **23 ported, 11 planned, 1 soon**, 35 unique IDs; **23 lazy loaders / 23 dynamic imports**.
- CSS braces — **223/223**.
- `git status --porcelain --untracked-files=all` — **75 dirty repo files**.
- `git ls-remote` — remote `main` unchanged at `56297e7b68ae7acab80c5c4c37b211417abe742c`.

A completed `next build` and a live `next dev` smoke test remain **required locally**: earlier P1 builds and the P2 dev server were OOM-killed in this sandbox. No lint run was added because ESLint is not declared/installed. See `P5A-VERIFICATION.md` for the gate table, external references and manual checklist.

## Zip contents

`PM-Web-V3-Phase5a.zip` contains all modified/new repo files with paths relative to `pm-web_v3/`, plus these nine root documents:

- `CHANGELOG-Phase1.md`
- `CHANGELOG-Phase2.md`
- `CHANGELOG-Phase3.md`
- `CHANGELOG-Phase4.md`
- `CHANGELOG-Phase5a.md`
- `P2-VERIFICATION.md`
- `P3-VERIFICATION.md`
- `P4-VERIFICATION.md`
- `P5A-VERIFICATION.md`

Unzip into the repository root of a clean clone and overwrite. It does **not** contain `node_modules`, `.next`, build output, the planning documents or the earlier phase zips.

## Next gate

P5b was also authorized by **"Both P5a + P5b now"** and is now shipped in `PM-Web-V3-Phase5b.zip` with its own fix-first verification gate. **Stop before P6.**
