# Tool Bench and offline contract (Phases 1–2)

Phase 1 added one native DesktopOS window — **Tool Bench** — and the local
infrastructure every later phase reuses. Phase 2 ports the first five text/data
tools. No v1 formula or flow was copied unchanged: every port keeps the
project's fix-first verification gate, and the five known P2 v1 defects were
fixed before the tools were marked `ported`.

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
registered as lazy loaders in `lib/tools/registry.ts`. `warmToolModules()` now
warms five chunks. No new storage key, dependency, cache name or service-worker
version was introduced. Full golden-case results are in `P2-VERIFICATION.md`.

## Catalogue statuses

- `ported` — a loader exists in `lib/tools/registry.ts` and the view renders.
- `planned` — reserved catalogue space; the shell shows **Not installed yet**
  and the phase that will add it.
- `soon` — one reserved space for the deferred LaTeX editor/converter; the shell
  shows **Available soon**.

P1 shipped zero `ported` entries; **P2 ships five**. The remaining 29 `planned`
entries and the one `soon` entry can still be searched, opened, starred and
remembered locally, but their workspaces show **Not installed yet** or
**Available soon**.

### Scope decisions carried into the catalogue

- Dropped: `user-persona-creator`, `student-guide-navigator`.
- Merged: the PID simulator and tuner became one `pid-controller-studio`.
- Excluded: the four v1 discovery links (`../researches`, `../open-books`,
  `../feeds`, `../game-deal`) are not tools.
- Deferred: `latex-mathml-studio` keeps one catalogue slot. It is not counted
  as a shipped tool in Phase 6b.

## Adding a ported tool in a later phase

1. Verify the v1 formula/flow first; do not assume it is correct. The v2 inventory
   lists 12 known defects. **P2 fixed five**: the naive diff, Unicode `btoa`,
   `charCodeAt` surrogate pairs, unguarded `RegExp`/no timeout, and `parseInt`
   without radix / NaN indent. Remaining gates cover the eval-based calculator,
   `CompressionStream` feature detection, colour validation, sanitised preview,
   LaTeX conversion, PID Euler divergence, PDF dark theme, resume migrations and
   Tailwind v3 presets. Each port has its own verification gate in the phase
   plan.
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
  the worker. P2 registers five loaders, so those chunks are warmed on idle.
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
    five P2 tool chunks should also open offline.
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
8. Confirm the sidebar foot now reads **5 ready · 29 planned · 1 available
   soon**, and Privacy Policy still lists only `pm-tools-state-v1` as new
   storage.

## Later phases

P2 is **shipped**. Remaining: P3 converters/simple calculators (6), P4
electronics (6), P5a mechanical (6), P5b mechatronics (4), P6a math/data (4),
P6b content/core (3 shipped + the deferred LaTeX slot). Each phase is delivered
as its own cumulative zip with its own verification gate; stop for review after
each one.
