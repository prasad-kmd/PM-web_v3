# Phase 5b verification — four mechatronics tools

**Scope:** the second and final authorized P5 batch. No v1 formula or flow was trusted; each documented P5b issue was fixed first and covered by a standalone pure-logic gate.  
**Cumulative zip:** `PM-Web-V3-Phase5b.zip` (P1 + P2 + P3 + P4 + P5a + P5b repo files); it supersedes `PM-Web-V3-Phase5a.zip` for clean clones.  
**Command:** `tsc -p /tmp/tsconfig.p5b.json && node /tmp/p5bverify.mjs` → **ALL 8 P5B LOGIC GATES PASSED**. Cumulative rerun: P2 **12/12**, P3 **8/8**, P4 **12/12**, P5a **8/8**, P5b **8/8** = **48 gates**.

## Fix-first audit

| Tool                  | v1 defect                                                                                                              | Fix                                                                                                                                                                                                                                   |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stepper motor         | `parseFloat(...)                                                                                                       |                                                                                                                                                                                                                                       | default`turned a blank lead into`1 mm/rev`, a blank microstep into `1`, and a blank belt pitch into `1 mm`. | Strict positive finite step angle, integer microstepping, positive lead and positive integer pulley teeth; explicit lead-screw vs belt formulas. |
| Battery life          | hidden zero defaults, hardcoded `H = 20`, no efficiency, no exponent validation, reserve outside 0–100% allowed.       | Rated-hour Peukert formula with explicit `C`, `I`, `H`, `k`, efficiency and reserve; `1 ≤ k ≤ 2` and strict 0–100% bounds.                                                                                                            |
| Sensor scaling        | `parseFloat(...)                                                                                                       |                                                                                                                                                                                                                                       | 0`, only `x1 === x2` checked, out-of-range values extrapolated with no warning or clamp.                    | `y = m·x + b` with raw/clamped values, slope, offset, reverse-range support and finite-value validation.                                         |
| PID controller studio | two separate v1 tools; `setInterval` explicit Euler could diverge; integral windup; no reduced-motion or cleanup plan. | One merged tool with bounded semi-implicit Euler, derivative on measurement, conditional-integration anti-windup, output clamping, divergence guard, static semantic SVG, `requestAnimationFrame` cleanup and reduced-motion support. |

## Standalone gates

| #   | Gate                        | Golden result                                                                                                                                                                                                                                                                                                                                                                                    |
| --- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Stepper lead screw          | `1.8° / 1/16 / 2 mm lead` → `3,200 steps/rev`, `1,600 steps/mm`, `0.000625 mm/step`.                                                                                                                                                                                                                                                                                                             |
| 2   | Belt drive + invalid inputs | `2 mm belt pitch × 20 teeth` → `40 mm/rev`, `80 steps/mm`; zero lead and fractional pulley teeth rejected.                                                                                                                                                                                                                                                                                       |
| 3   | Ideal battery runtime       | `2000 mAh / 100 mA / 20% reserve / 100% efficiency` → `20 h` theoretical, `16h 0m` usable; `80%` efficiency → `12.8 h`.                                                                                                                                                                                                                                                                          |
| 4   | Peukert behaviour           | At rated C/20 current, `k = 1.0` and `k = 1.2` both give `20 h`; at `400 mA` they give `5 h` and `3.7892914163 h`.                                                                                                                                                                                                                                                                               |
| 5   | Battery invalid inputs      | Zero/negative capacity or load, `120%` reserve, `0%` efficiency and `k < 1` all return errors.                                                                                                                                                                                                                                                                                                   |
| 6   | 4–20 mA scaling             | `12 mA → 50 bar`, slope `6.25`, offset `−25`; `2 mA → raw −12.5 / clamped 0`; `22 mA → raw 112.5 / clamped 100`; unclamped returns raw.                                                                                                                                                                                                                                                          |
| 7   | Sensor edge cases           | Equal input min/max and `NaN` input rejected; reverse `0–10 V → 100–0%` at `2.5 V` gives `75%`.                                                                                                                                                                                                                                                                                                  |
| 8   | PID + source hygiene        | Default `Kp 2.5 / Ki 1.2 / Kd 0.5` produces 200 finite samples without divergence; low output limit activates anti-windup and clamps all controls; P5b sources contain no forbidden persistence, timer, chart dependency, `parseFloat(` or `\|\| 0` patterns; the PID view has `requestAnimationFrame`, `cancelAnimationFrame` and `prefers-reduced-motion`; the sparkline uses semantic tokens. |

## External references

Peukert's rated-hour form `t = H·(C/(I·H))^k`, the `k = 1` ideal limit and typical chemistry ranges were checked against the Peukert's-law reference [1](https://en.wikipedia.org/wiki/Peukert's_law), an engineering Peukert guide [2](https://engicalchub.com/guides/peukert-battery-guide/) and a runtime calculator reference [3](https://miniwebtool.com/peukert-battery-runtime-calculator/). Conditional integration / clamping anti-windup and the reason clamping alone does not stop windup were checked against the integral-windup reference [1](https://grokipedia.com/page/Integral_windup), an applied PID anti-windup guide [2](https://industrialmonitordirect.com/blogs/knowledgebase/stm32-pid-controller-integral-windup-and-overshoot-fix) and a conditional-clamping implementation note [4](https://www.luisllamas.es/en/anti-windup-and-actuator-saturation/). Stepper steps/mm and linear sensor mapping are deterministic algebra; the golden cases above are the verification basis.

## Static / architecture guards

- `corepack pnpm@10.15.0 typecheck` passed.
- Prettier `--write` / `--check` passed on 75 earlier repo files, 8 new P5b logic/view files and the root docs.
- `node --check public/sw.js` passed; `SW_VERSION = 3` and cache names unchanged.
- `app/tools.css` braces: **223/223**.
- Catalogue: **27 ported · 7 planned · 1 soon**, 35 unique IDs; **27 lazy loaders / 27 dynamic imports**.
- `package.json`, `pnpm-lock.yaml`, `app/manifest.ts`, `lib/pwa.ts` match HEAD; `public/sw.js`, `lib/legal.ts` match the P4 zip.
- No new dependency, storage key, cache name, `COOKIE_NOTICE_VERSION`, manifest, lockfile or unrelated desktop UI change.
- The PID chart is an inline SVG using `var(--primary)`, `var(--border)` and `var(--muted-foreground)`; no Recharts, gradients or persistent animation.
- `git status --porcelain --untracked-files=all`: **83 dirty repo files**; remote `main` remains `56297e7b68ae7acab80c5c4c37b211417abe742c`; no commit/push.

## Manual checklist

1. Open each of the four P5b tools from the catalogue; confirm the lazy view loads with the shared header, breadcrumb and no network request.
2. Stepper motor: confirm the lead-screw and belt golden cases and that blank, zero or fractional inputs show errors.
3. Battery life: confirm `16h 0m`, `12.8 h`, Peukert at C/20 and `400 mA`, and that invalid reserve / efficiency / exponent are rejected.
4. Sensor scaling: confirm `12 mA → 50 bar`, `2 mA → 0 clamped`, `22 mA → 100 clamped`, raw extrapolated values and the equal-endpoint error.
5. PID studio: confirm the default step response is finite and stable; high gain with a low output limit activates anti-windup and clamps the controls. Confirm Run / Pause / Reset, the static SVG chart and reduced-motion behaviour.
6. Toggle light/dark and a narrow window; result grids stack, focus rings remain visible and reduced motion suppresses chart animation.
7. Confirm the sidebar foot reads **27 ready · 7 planned · 1 available soon**; the LaTeX slot still shows **Available soon**; Privacy Policy still lists only `pm-tools-state-v1`.
8. In a production PWA install, confirm the service worker warms all twenty-seven tool chunks and each P5b tool opens offline after a hard offline load.

See `docs/tools-and-offline.md` → **"P5b verification checklist (manual)"** for the in-repo copy. A completed `next build` and live `next dev` smoke test remain required locally; earlier P1 builds and the P2 dev server were OOM-killed in this sandbox. No lint run was added because ESLint is not declared/installed.

## Next gate

**Stop before P6.** P6a starts only after you approve both P5 batches.
