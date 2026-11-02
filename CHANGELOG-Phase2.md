# PM Web v3 — Phase 2 changelog (five text/data tools)

**Date:** 2026-11-02  
**Trigger:** you approved P1 and chose **"Approve P1 → start P2"** when asked how to continue.  
**Scope:** P2 only, then stop for review. `PM-Web-V3-Phase2.zip` is **cumulative** — it contains every P1 file plus the P2 changes, so it superseded `PM-Web-V3-Phase1.zip` for a clean clone; it is now itself superseded by `PM-Web-V3-Phase3.zip`.  
**Target:** clean `pm-web_v3` at remote `main` `56297e7b68ae7acab80c5c4c37b211417abe742c`. No commit or push was made. `package.json`, `pnpm-lock.yaml`, `app/manifest.ts`, `lib/pwa.ts`, `lib/legal.ts`, `public/sw.js`, `SW_VERSION` and cache names are unchanged in P2; no new dependency or storage key was added.

## What shipped

| Catalogue id | Tool | v1 defect fixed |
| ------------ | ---- | --------------- |
| `json-formatter` | JSON Structure Validator | `parseInt` without radix / NaN indent → closed 0/2/4/8 set parsed with radix 10. |
| `html-encoder` | Security & Syntax Escaper | `DOMParser().textContent` loses literal markup → explicit named + numeric entity map, optional two-pass nested decode. |
| `data-transform` | Data Transformation Suite | `btoa`/`atob` fail on Unicode; `charCodeAt(0)` breaks surrogate pairs; no binary decode → UTF-8 `TextEncoder`/`TextDecoder` with `fatal: true` across Base64, URL, hex and binary. |
| `diff-checker` | Diff Comparison Engine | 10-line look-ahead guess → real LCS diff with CRLF normalisation, paired changed rows and size caps. |
| `regex-architect` | Regex Pattern Architect | Unguarded `new RegExp`/`exec`, no timeout → bounded flags/pattern/test string/matches/iterations, 300 ms Blob worker terminated on timeout, safe zero-length matches. |

Catalogue is now **5 ported · 29 planned · 1 `Available soon`**. The sidebar foot count updates automatically. No v1 formula/flow was copied unchanged; see `P2-VERIFICATION.md` for the 12 passing logic gates.

## New repo files

| Path | Purpose |
| ---- | ------- |
| `components/tools/views/shared.tsx` | Shared Coss/Base UI view primitives: card sections, panes, textareas, output, copy button, status, actions, options. |
| `components/tools/views/JsonFormatter.tsx` | JSON format/minify, 0/2/4/8 indent select, import/export, Unicode-safe output. |
| `components/tools/views/HtmlEncoder.tsx` | Encode/decode with literal-text semantics, swap, nested two-pass decode switch. |
| `components/tools/views/DataTransform.tsx` | Four UTF-8 codecs, encode/decode, swap, bounded input. |
| `components/tools/views/DiffChecker.tsx` | Side-by-side LCS diff table, unified-diff copy, whitespace-trim switch, cap warning. |
| `components/tools/views/RegexArchitect.tsx` | Debounced worker matching, highlighted preview, capture-group list, guard notes. |
| `lib/tools/logic/json.ts` | Pure JSON format/minify + indent parsing. |
| `lib/tools/logic/html.ts` | Pure HTML entity map + numeric/nested decode. |
| `lib/tools/logic/data-transform.ts` | Pure UTF-8 Base64/URL/hex/binary codecs. |
| `lib/tools/logic/diff.ts` | Pure LCS line diff with caps and CRLF normalisation. |
| `lib/tools/logic/regex.ts` | Flag validation, limits and highlight-segment builder. |
| `lib/tools/regex-worker-source.ts` | Inline Blob-worker source; no network request, CSP-compatible. |

## Modified repo files

| Path | Change |
| ---- | ------ |
| `lib/tools/catalog.ts` | Five `status: "planned"` → `"ported"`. |
| `lib/tools/registry.ts` | Five lazy `TOOL_LOADERS` entries; P2 comment. |
| `app/tools.css` | Ported-view styles: two-pane grids, cards, textareas, output, status, options, regex preview/matches, diff table, responsive + reduced-motion rules. |
| `docs/tools-and-offline.md` | P2 section, updated counts/statuses/offline notes, P2 manual checklist, remaining phases. |
| `README.md` | Feature bullet now names the five P2 tools. |

P1 files are included unchanged in the zip except where listed above. Planning artifacts in the workspace root — `PM-Web-V3-Tools-Plan-v2.md`, `tools-inventory-v2.csv`, `PLAN-REVISIONS.md` and `PM-Web-V3-Tools-Plan-v2.zip` — were refreshed to mark P2 shipped; they are **not** repo files and are not inside `PM-Web-V3-Phase2.zip`.

## Validation performed

- `corepack pnpm@10.15.0 install --frozen-lockfile` — already passed in P1; `node_modules` still present, no reinstall needed.
- `corepack pnpm@10.15.0 typecheck` — **passed** after all P2 files.
- `corepack pnpm@10.15.0 exec prettier --check` on all changed/new TS/TSX/CSS/MD repo files — **passed**.
- Pure logic compiled with `tsc` and exercised by `node /tmp/p2verify.mjs` — **12/12 gates passed** (full table in `P2-VERIFICATION.md`).
- `node --check public/sw.js` — **passed** (unchanged).
- Catalogue guard — **5 ported, 29 planned, 1 soon**.
- `next build` (Turbopack + webpack) and `next dev --webpack` — **skipped**: all three attempts were killed by the sandbox memory limit (exit 137 / V8 OOM), not by a reported code error. Per your instruction, no further slow validation was attempted; the zip is for local application/testing.
- No lint run because `eslint` is not declared in this checkout.

## Apply the zip

`PM-Web-V3-Phase2.zip` contains all modified/new repo files with paths relative to `pm-web_v3/`, plus `CHANGELOG-Phase1.md`, `CHANGELOG-Phase2.md` and `P2-VERIFICATION.md` at the zip root. Unzip into the repository root of a clean clone and overwrite. It does **not** contain `node_modules`, `.next`, build output, the planning documents or the P1 zip.

```bash
pnpm install --frozen-lockfile
pnpm dev        # or pnpm build with your real NEXT_PUBLIC_SITE_URL
```

Then run the manual checklists in `docs/tools-and-offline.md` (P1 + P2) and review `P2-VERIFICATION.md`.

## Known limitations

- 29 tools still show **Not installed yet**; `latex-mathml-studio` still shows **Available soon**.
- Recents record any catalogue selection, including placeholders.
- Regex timeout is proven by the worker design plus a manual case, not by an automated hang test.
- Production build and dev server were not completed in this sandbox; local verification is required before merging.

## Next gate

P2 was approved by **"Continue to next phase"**; P3 shipped in `PM-Web-V3-Phase3.zip` with `CHANGELOG-Phase3.md` and `P3-VERIFICATION.md`. This file is kept as the P2 record. **Next gate:** stop for review before P4.
