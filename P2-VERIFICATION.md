# Phase 2 verification — fix-first gates

**Date:** 2026-11-02  
**Scope:** five P2 text/data tools. No v1 formula/flow was trusted; each known defect was fixed first and covered by a pure-logic gate.  
**Cumulative zip:** `PM-Web-V3-Phase2.zip` (P1 + P2 repo files).  
**Companion:** `CHANGELOG-Phase2.md`, `docs/tools-and-offline.md` → "P2 verification checklist (manual)".

## Automated logic gates

The pure logic modules under `lib/tools/logic/` and the inline worker source were compiled with TypeScript to CommonJS and exercised with Node `assert/strict`:

```bash
corepack pnpm@10.15.0 exec tsc -p /tmp/tsconfig.p2.json
node /tmp/p2verify.mjs
```

Result: **ALL 12 P2 LOGIC GATES PASSED**.

| # | Gate | What it proves |
|---|------|----------------|
| 1 | JSON format 2-space, minify, Unicode keys | Sinhala keys survive, 2-space output is correct, minify round-trips through `JSON.parse`. |
| 2 | JSON rejects invalid syntax and bad indent values | `{"a":}` errors cleanly; `parseJsonIndent("abc")`, `"99"` fall back to 2, `"4"` → 4, `0` → 0; empty input is safe. Fixes v1 `parseInt` without radix / NaN indent. |
| 3 | HTML round-trip preserves literal markup | `<div class="x">Tom's & "quote" 🌍</div>` encodes and decodes back exactly; `&amp; &lt; &gt; &quot; &#39; &#039;` all resolve. Fixes v1 `DOMParser().textContent` losing markup. |
| 4 | HTML nested decode, numeric entities, unknown entities | Two-pass decode resolves `&amp;lt;b&amp;gt;` → `<b>`; decimal/hex `&#128512;` / `&#x1F600;` → 😀; unknown `&notanentity;` and lone surrogate `&#xD800;` are left unchanged. |
| 5 | UTF-8 / emoji / Sinhala round-trips for all four codecs | `Hello 🌍 é සිංහල \n tab\t` round-trips through Base64, URL, hex and binary. Fixes v1 `btoa`/`atob` Unicode failure and `charCodeAt(0)` surrogate breakage; binary decode added. |
| 6 | Data transform rejects malformed input | Odd/invalid hex, bad binary length/digits, invalid Base64 length and malformed `%` URL all return readable errors. 200,001-character input is capped. |
| 7 | Diff identical texts, CRLF normalisation, empty input | `a\r\nb\r\n` vs `a\nb\n` is identical; empty/empty is identical with zero rows. |
| 8 | Diff insert / delete / change / moved blocks use LCS | `a\nb\nc` → `a\nx\nc` = 1 added + 1 removed + 2 unchanged; insert, delete and moved `a,b,c,d` → `c,d,a,b` all produce correct counts. Replaces v1's 10-line look-ahead. |
| 9 | Diff caps oversized input | 1,050-line and >200,000-character inputs set `truncated: true` instead of freezing the UI. |
| 10 | Regex flag sanitising and limits | `ggim` → `gim`; unsupported `z` errors; `timeoutMs = 300`, `maxMatches = 500`; worker source contains no `eval(` or `new Function`. |
| 11 | Regex worker global/non-global, groups, zero-length, invalid pattern | `a/g` on `banana` → 3 matches at 1,3,5; non-global → 1; named/unnamed capture groups serialise; `(?=a)/g` → 3 zero-length matches; `[` returns an error. Fixes v1's unguarded `exec` loop. |
| 12 | Regex highlight segments handle zero-length and overlap safely | Segments rebuild the original string exactly, with a separate zero-length marker and no overlapping spans. |

### Catastrophic-backtracking gate (manual)

The worker-timeout path cannot be proven by a synchronous Node assertion without hanging the test process. It is covered by:

- `REGEX_LIMITS.timeoutMs = 300` and a `window.setTimeout` that terminates the Blob worker;
- `MAX_ITERATIONS = 10000` and zero-length `lastIndex` advancement inside the worker;
- manual checklist item 6: enter `(a+)+$` with a long non-matching `a…b` string and confirm the UI shows **"Stopped after 300 ms…"** instead of freezing.

## Other automated checks

| Check | Result |
|-------|--------|
| `corepack pnpm@10.15.0 typecheck` (`tsc --noEmit`) | Passed after P2 files and formatting. |
| `corepack pnpm@10.15.0 exec prettier --check` on all changed TS/TSX/CSS/MD repo files | Passed. |
| `node --check public/sw.js` | Passed (unchanged from P1). |
| Catalogue guard | 5 `ported`, 29 `planned`, 1 `soon`, 35 unique ids. |
| `next build` (Turbopack and webpack) | **Skipped** — both killed by the sandbox memory limit (exit 137 / V8 OOM). |
| `next dev --webpack` | **Skipped** — started in 585 ms then OOM-killed while compiling `/` (heap limit). No runtime smoke test was possible in this sandbox. |
| `pnpm lint` | Not run; `eslint` is not declared in this checkout. |

## Manual UI / offline checklist

See `docs/tools-and-offline.md` → **"P2 verification checklist (manual)"**. It covers all five views, light/dark, narrow-window stacking, focus rings, the **5 ready · 29 planned · 1 available soon** sidebar count, the Privacy Policy storage row, and first-offline-visit chunk warming.

## Known limitations

- P3 is now shipped in `PM-Web-V3-Phase3.zip` (see `P3-VERIFICATION.md`). After P3, 23 catalogue entries still show **Not installed yet** and the LaTeX slot still shows **Available soon**.
- Recents still record any catalogue selection, including placeholders, so the navigation is testable.
- The production build and dev server could not be completed in this sandbox; local `pnpm build` / `pnpm dev` with normal memory is required before merging.
