# Changelog — Phase 5b

**Date:** 2026-11-02  
**Scope:** the second and final authorized P5 batch. `PM-Web-V3-Phase5b.zip` is **cumulative** — it contains every P1, P2, P3, P4 and P5a file plus the P5b changes, and it supersedes `PM-Web-V3-Phase5a.zip` for clean clones. **Stop before P6.**  
**Remote:** `main` remains `56297e7b68ae7acab80c5c4c37b211417abe742c`; no commit or push was made.

## Shipped tools

| Tool                        | Pure logic                          | View                                                 | Fix-first change                                                                                                                                                                                                                |
| --------------------------- | ----------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stepper-motor-calculator`  | `lib/tools/logic/stepper-motor.ts`  | `components/tools/views/StepperMotorCalculator.tsx`  | Strict step angle, integer microstepping and lead/belt validation; no `parseFloat(...)                                                                                                                                          |     | default` hidden 1 mm/rev or 1× microstep. |
| `battery-life-estimator`    | `lib/tools/logic/battery-life.ts`   | `components/tools/views/BatteryLifeEstimator.tsx`    | Explicit rated-hour Peukert `t = H·(C/(I·H))^k`, efficiency, reserve, 1 ≤ k ≤ 2 and strict capacity/current checks.                                                                                                             |
| `sensor-scaling-calculator` | `lib/tools/logic/sensor-scaling.ts` | `components/tools/views/SensorScalingCalculator.tsx` | Linear map with raw/clamped values, slope, offset, reverse-range support and an equal-endpoint error.                                                                                                                           |
| `pid-controller-studio`     | `lib/tools/logic/pid-controller.ts` | `components/tools/views/PidControllerStudio.tsx`     | Merged simulator/tuner with bounded semi-implicit Euler, derivative on measurement, conditional anti-windup, output clamping, divergence guard, semantic SVG chart, `requestAnimationFrame` cleanup and reduced-motion support. |

## Supporting changes

- `components/tools/views/shared.tsx`: P5a's `ToolDataTable`, `ToolCheckboxField`, `ToolSparkline` and `ToolDownloadButton` are reused by P5b; the sparkline uses semantic `var(--primary)`, `var(--border)` and `var(--muted-foreground)` tokens.
- `app/tools.css`: P5 table/checkbox/sparkline styles remain; braces are balanced at 223/223.
- `lib/tools/registry.ts`: four more lazy loaders; **27 total**.
- `lib/tools/catalog.ts`: four P5b entries flipped to `ported`; **27 ported · 7 planned · 1 soon**, 35 unique IDs.
- `lib/tools/warm.ts`: comment now says twenty-seven loaders.
- `README.md`, `docs/tools-and-offline.md` and `docs/pwa-and-boot.md`: both P5 batches shipped, twenty-seven tool chunks, P5b fix-first table and manual checklist.
- Root planning artifacts: `tools-inventory-v2.csv` P5b rows are `ported (P5b)`; `PM-Web-V3-Tools-Plan-v2.md` and `PLAN-REVISIONS.md` mark both P5 batches shipped with the next gate at P6.
- Earlier changelog/verification records were updated to note that P5b is the current clean-clone zip and to carry the 27/7/1 count forward.

No new dependency, storage key, cache name, `SW_VERSION`, `COOKIE_NOTICE_VERSION`, manifest, lockfile, service-worker change or unrelated desktop UI change was introduced. `package.json`, `pnpm-lock.yaml`, `app/manifest.ts` and `lib/pwa.ts` still match HEAD; `public/sw.js` and `lib/legal.ts` are unchanged from the P4 zip. The PID tool uses no Recharts and no timer-based loop.

## Validation

- `corepack pnpm@10.15.0 typecheck` — passed.
- `prettier --write` then `--check` on the 75 earlier repo files, the 8 new P5b logic/view files and the root docs — passed.
- `tsc -p /tmp/tsconfig.p5b.json` — compiled all P2–P5b pure logic modules.
- `node /tmp/p5bverify.mjs` — **8/8 P5b logic gates passed**.
- Cumulative rerun: `node /tmp/p2verify.mjs` **12/12**, `node /tmp/p3verify.mjs` **8/8**, `node /tmp/p4verify.mjs` **12/12**, `node /tmp/p5averify.mjs` **8/8**, `node /tmp/p5bverify.mjs` **8/8** = **48 cumulative gates**.
- `node --check public/sw.js` — passed.
- Catalogue guard — **27 ported, 7 planned, 1 soon**, 35 unique IDs; **27 lazy loaders / 27 dynamic imports**.
- CSS braces — **223/223**.
- `git status --porcelain --untracked-files=all` — **83 dirty repo files**.
- `git ls-remote` — remote `main` unchanged at `56297e7b68ae7acab80c5c4c37b211417abe742c`.

A completed `next build` and a live `next dev` smoke test remain **required locally**: earlier P1 builds and the P2 dev server were OOM-killed in this sandbox. No lint run was added because ESLint is not declared/installed. See `P5B-VERIFICATION.md` for the gate table, external references and manual checklist.

## Zip contents

`PM-Web-V3-Phase5b.zip` contains all modified/new repo files with paths relative to `pm-web_v3/`, plus these eleven root documents:

- `CHANGELOG-Phase1.md`
- `CHANGELOG-Phase2.md`
- `CHANGELOG-Phase3.md`
- `CHANGELOG-Phase4.md`
- `CHANGELOG-Phase5a.md`
- `CHANGELOG-Phase5b.md`
- `P2-VERIFICATION.md`
- `P3-VERIFICATION.md`
- `P4-VERIFICATION.md`
- `P5A-VERIFICATION.md`
- `P5B-VERIFICATION.md`

Unzip into the repository root of a clean clone and overwrite. It does **not** contain `node_modules`, `.next`, build output, the planning documents or the earlier phase zips.

## Next gate

**Stop here for review before P6.** P6a (four math/data tools) starts only after you approve both P5 batches.
