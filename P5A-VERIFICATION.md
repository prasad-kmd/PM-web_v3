# Phase 5a verification — six mechanical tools

**Scope:** P5a only. No v1 formula, table or flow was trusted; each documented P5a issue was fixed first and covered by a standalone pure-logic gate. P5b is verified in `P5B-VERIFICATION.md`.  
**Cumulative zip:** `PM-Web-V3-Phase5a.zip` (P1 + P2 + P3 + P4 + P5a repo files); P5b supersedes it for clean clones.  
**Command:** `tsc -p /tmp/tsconfig.p5a.json && node /tmp/p5averify.mjs` → **ALL 8 P5A LOGIC GATES PASSED**. Cumulative rerun: P2 **12/12**, P3 **8/8**, P4 **12/12**, P5a **8/8** = **40 gates**.

## Fix-first audit

| Tool              | v1 defect                                                                                                              | Fix                                                                                              |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Moment of inertia | `html2canvas` + `jsPDF` PDF export forced a dark `#020617` canvas; `moi-*` `usePersistentState` keys; `parseFloat(...) |                                                                                                  | 0` hid invalid geometry.                                                              | Local copy / CSV export, pure geometry with positive finite checks, and no persistence keys.                                              |
| ISO fits          | `parseInt` without radix, `                                                                                            |                                                                                                  | 0`tolerance fallback, simplified`p` deviation table, no invalid-class/diameter guard. | Explicit IT6–IT9 arrays, strict H/f/g/h/p class regex, `Number.parseInt(..., 10)`, up-to-and-including size steps and fit classification. |
| Beam deflection   | `parseFloat(...)                                                                                                       |                                                                                                  | 0` hid invalid P/L/E/I; boundary cases were not documented.                           | Two Euler–Bernoulli cases with strict validation, max moment, end slope and the 16× boundary ratio.                                       |
| Gear ratio        | Help text said `τout = τin / ratio` while code used `τin × ratio`; no efficiency input.                                | Explicit `τout = τin × ratio × η`, integer teeth, 0–100% efficiency, power in/out.               |
| Bolt torque       | Mixed static property-class values; assumptions were only prose.                                                       | One consistent M3–M20 VDI 2230-style local dataset with µ ≈ 0.14 / 90% yield note and local CSV. |
| Material database | Units were implicit; CFRP claimed a single 3500 °C "melting point".                                                    | Explicit kg/m³, GPa, W/m·K, °C, MPa fields and `null` melting point where not single-valued.     |

## Standalone gates

| #   | Gate                                                         | Golden result                                                                                                                                                                                                                                                                                                   |
| --- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Rectangle 100 × 200 mm                                       | `Ixx = 66,666,666.6667 mm⁴`, `Iyy = 16,666,666.6667 mm⁴`, `A = 20,000 mm²`.                                                                                                                                                                                                                                     |
| 2   | Circle d = 100 mm; I-beam B = 150, tf = 10, Hw = 300, tw = 8 | Circle `I ≈ 4,908,738.5212 mm⁴`, `A ≈ 7,853.9816 mm²`; I-beam `Ixx = 90,100,000 mm⁴`, `Iyy = 5,637,800 mm⁴`, `A = 5,400 mm²`.                                                                                                                                                                                   |
| 3   | Invalid geometry                                             | Zero rectangle width and `B ≤ tw` I-beam return an error, not a zero result.                                                                                                                                                                                                                                    |
| 4   | ISO 286 H7/g6 at 25 mm and 50 mm                             | `Ø25`: hole `0…+21 µm`, shaft `−20…−7 µm`, clearance `7…41 µm`; `Ø50`: `9…50 µm` clearance.                                                                                                                                                                                                                     |
| 5   | p6 / h6 / strict classes / radix                             | `Ø25 H7/p6` is interference (`−35…−1 µm`); `H7/h6` starts at `0 µm`; `K7`, `> 500 mm` rejected; `parseInt` uses radix 10.                                                                                                                                                                                       |
| 6   | Beam cases                                                   | `1000 N / 2000 mm / 210000 MPa / 500000 mm⁴`: cantilever `25.3968253968 mm`, simply supported `1.5873015873 mm`, ratio `16×`; zero load rejected.                                                                                                                                                               |
| 7   | Gear ratio                                                   | `12 → 36` at `1500 rpm / 5 N·m`: `3:1`, `500 rpm`, `15 N·m`; 80% efficiency → `12 N·m`; zero driver rejected.                                                                                                                                                                                                   |
| 8   | Bolt/material + source hygiene                               | `M8` = `24 / 35 / 41 N·m`; 6061-T6 = `2700 kg/m³`, `68.9 GPa`, `167 W/m·K`, `582 °C`, `276 MPa`; CFRP melting point `null`; no forbidden `usePersistentState`, `html2canvas`, `jsPDF`, `#020617`, `vd-*`, `pcb-imp-*`, `localStorage`, `setInterval`, `recharts`, `parseFloat(` or `\|\| 0` in P5a logic/views. |

## External references

ISO 286 IT6/IT7 widths, H/h/g6/p6 deviations and the `Ø25 H7/g6 = 7–41 µm` clearance were checked against published ISO 286 fit charts [1](https://cnccode.com/2026/10/23/iso-286-fits-and-tolerances-chart-h7-g6-h7-h6-h7-p6-hole-shaft-limits-explained/), [3](https://checkedcalc.com/iso-286-fit-tolerance-chart/) and the ISO tolerance calculator reference [5](https://online-tools.work/metal/en/tolerance). Beam `PL³/3EI` and `PL³/48EI` closed-form cases come from Euler–Bernoulli references [1](https://industrialcalculators.com/beam-stress-calculator/), [2](https://engineerscalc.com/calculator/strength-of-materials-mechanics/beam-deflection-calculator/) and [3](https://optimalbeam.com/engineering-guides/cantilever-beam). The M3–M20 torque dataset uses a consistent VDI 2230-style metric coarse chart with µ ≈ 0.14 and 90% yield utilisation [4](https://www.ekinsun.com/custom-fasteners/metric-bolt-torque-chart/), cross-checked against other metric torque charts [1](https://gearheadgrove.com/bolt-torque-chart/). Aluminium 6061-T6 density, modulus, conductivity, solidus and yield values were verified against a published material datasheet [1](https://www.glemco.com/capabilities/material-expertise/aluminum-6061-t6/) and corroborating 6061-T6 references [2](https://langhe-industry.com/6061-t6-aluminum/), [3](https://steel1stop.com/aluminum/6061-t6-aluminum-tube-2/).

## Static / architecture guards

- `corepack pnpm@10.15.0 typecheck` passed.
- Prettier `--write` / `--check` passed on 62 earlier repo files, 12 new P5a logic/view files and the root docs.
- `node --check public/sw.js` passed; `SW_VERSION = 3` and cache names unchanged.
- `app/tools.css` braces: **223/223**.
- Catalogue: **23 ported · 11 planned · 1 soon**, 35 unique IDs; **23 lazy loaders / 23 dynamic imports**.
- `package.json`, `pnpm-lock.yaml`, `app/manifest.ts`, `lib/pwa.ts` match HEAD; `public/sw.js`, `lib/legal.ts` match the P4 zip.
- No new dependency, storage key, cache name, `COOKIE_NOTICE_VERSION`, manifest, lockfile or unrelated desktop UI change.
- `git status --porcelain --untracked-files=all`: **75 dirty repo files**; remote `main` remains `56297e7b68ae7acab80c5c4c37b211417abe742c`; no commit/push.

## Manual checklist

1. Open each of the six P5a tools from the catalogue; confirm the lazy view loads with the shared header, breadcrumb and no network request.
2. Moment of inertia: try the rectangle, circle and I-beam golden cases above; confirm local copy and CSV work and that no PDF button exists.
3. ISO fits: confirm `Ø25 H7/g6`, `Ø50 H7/g6`, `H7/p6` and `H7/h6`; invalid classes or `> 500 mm` show an error.
4. Beam deflection: confirm both boundary cases, the 16× ratio and strict validation of zero/text input.
5. Gear ratio: confirm `3:1 / 500 rpm / 15 N·m`, `80% → 12 N·m`, and that fractional teeth or efficiency outside 0–100% are rejected.
6. Bolt torque: confirm `M8 = 24 / 35 / 41 N·m`, search, copy, CSV and the visible friction/yield assumptions.
7. Material database: confirm 6061-T6 units/values, CFRP/polycarbonate **not single-valued** melting point, search and category filter.
8. Toggle light/dark and a narrow window; tables scroll, result grids stack, focus rings remain visible, and reduced motion suppresses chart animation.
9. Confirm the sidebar foot reads **27 ready · 7 planned · 1 available soon**; the LaTeX slot still shows **Available soon**; Privacy Policy still lists only `pm-tools-state-v1`.
10. In a production PWA install, confirm the service worker warms all twenty-three tool chunks and each P5a tool opens offline after a hard offline load.

See `docs/tools-and-offline.md` → **"P5a verification checklist (manual)"** for the in-repo copy. A completed `next build` and live `next dev` smoke test remain required locally; earlier P1 builds and the P2 dev server were OOM-killed in this sandbox. No lint run was added because ESLint is not declared/installed.

## Next gate

P5b is now shipped in `PM-Web-V3-Phase5b.zip` with its own fix-first verification gate. **Stop before P6.**
