# PM Web v3 — Phase 1 changelog (Tool Bench shell)

**Date:** 2026-11-02  
**Scope:** P1 only. No v1 tool calculation was ported. Stop here for review before P2.  
**Target:** clean `pm-web_v3` at remote `main` `56297e7b68ae7acab80c5c4c37b211417abe742c`. No commit or push was made. `package.json`, `pnpm-lock.yaml`, `app/manifest.ts`, `lib/pwa.ts`, `SW_VERSION` and cache names are unchanged; no new dependency was added.

## Amendments applied (supersede parts of v2)

1. **LaTeX deferred.** `latex-mathml-studio` keeps one catalogue slot with status `soon` and renders **Available soon**, with a note pointing to `prasad-kmd/latex2mathml_next`. No editor, no converter, no `temml`. Active tool count is **34 planned + 1 deferred slot** (not 35 shipped).
2. **Animate UI gliding-tab highlight kept.** The sidebar uses `Tabs` + `TabsHighlight` + `TabsHighlightItem` + vertical `TabsList`, matching `SettingsApp` and `app/globals.css`.
3. **Tool recents/favourites added.** One visitor-only `localStorage` key `pm-tools-state-v1` (`lib/tools/storage.ts`) holds up to 8 recents and 40 favourites, filters unknown ids, syncs across tabs, and is registered in `STORAGE_REGISTER`, the cookie notice, Privacy Policy prose, `docs/pwa-and-boot.md` and `docs/tools-and-offline.md`.
4. **No other UI changes.** No menubar chip, open-windows list, Settings → Tools, first-run hint, profile/minimise change or icon-map centralisation. The only new UI is the Tools shortcut, connectivity toast, gliding tabs and recents/favourites.

`PM-Web-V3-Tools-Plan-v2.md`, `tools-inventory-v2.csv`, `PLAN-REVISIONS.md` and `PM-Web-V3-Tools-Plan-v2.zip` in the workspace root were refreshed with a short amendment note so the stale v2 decisions are not applied by mistake. The v2 plan remains historical otherwise.

## New files

| Path | Purpose |
| ---- | ------- |
| `app/tools/page.tsx` | `/tools` metadata + null-returning route; DesktopOS opens the window. |
| `app/tools.css` | Three-pane Tool Bench layout, gliding-tab styles, responsive/reduced-motion/focus rules. |
| `components/tools/ToolsApp.tsx` | Tabs, search, recents/favourites state, `history.replaceState` deep links. |
| `components/tools/ToolCatalog.tsx` | Searchable/filterable catalogue rows, status badges, favourite toggles. |
| `components/tools/ToolShell.tsx` | Selected-tool header, lazy view boundary, copy-link/close actions. |
| `components/tools/ToolStates.tsx` | Empty / Not installed yet / Available soon states. |
| `components/system/ConnectivityListener.tsx` | v1-style sonner online/offline toast, Hugeicons, initial-offline fix. |
| `hooks/use-tool-state.ts` | Local recents/favourites hook with hydration guard. |
| `lib/tools/storage.ts` | Shared `pm-tools-state-v1` key. |
| `lib/tools/catalog.ts` | 35 local entries: 34 `planned`, 1 `soon`, all offline-capable. |
| `lib/tools/registry.ts` | Empty `TOOL_LOADERS` map + types for P2+ ports. |
| `lib/tools/warm.ts` | Idle chunk warming once the service worker controls the page. |
| `docs/tools-and-offline.md` | P1 contract, porting steps, storage/privacy, offline design, manual checklist. |

## Modified files

| Path | Change |
| ---- | ------ |
| `lib/registry.ts` | Added `tools` to `AppId`, `APP_REGISTRY`, `DESKTOP_APPS`; removed the dead `icon` field and 16 unused `/icons/fluent-color/*` strings. |
| `components/apps/AppBody.tsx` | Dynamic `ToolsApp` with `WindowBreadcrumb`; no route-surface freeze. |
| `components/desktop/DesktopIcons.tsx` | `ToolsIcon` shortcut glyph. |
| `components/command/CommandPalette.tsx` | `ToolsIcon` palette entry. |
| `components/desktop/Desktop.tsx` | Mounts `ConnectivityListener` and calls `warmToolModules()` once. |
| `app/layout.tsx` | Imports `tools.css`. |
| `app/sitemap.ts`, `app/llms.txt/route.ts` | Add `/tools`. |
| `app/~offline/page.tsx` | Add Tools to cached-area links; clarify offline copy. |
| `public/sw.js` | Static cap 160→240; normalise `?tool=`; install-time `/tools` document + referenced asset precache; `PM_RECACHE_CORE` restores it. `SW_VERSION` stays 3. |
| `lib/legal.ts` | Register `pm-tools-state-v1`; update cookie-notice copy. |
| `components/legal/legal-documents.tsx` | Privacy Policy prose mentions Tool Bench recents/favourites. |
| `docs/pwa-and-boot.md` | Cap, `/tools` precache, storage key, Clear-offline-cache wording. |
| `README.md` | Tool Bench feature bullet + link to new doc. |

## Validation performed

- `corepack pnpm@10.15.0 install --frozen-lockfile --prefer-offline` — **passed** in 14.9 s using a pnpm supported by this sandbox's Node 20.20.2 (declared `pnpm@11.9.0` needs Node 22.13+).
- `corepack pnpm@10.15.0 typecheck` (`tsc --noEmit`) — **passed** after formatting.
- `corepack pnpm@10.15.0 exec prettier --check` on all changed/new TS/TSX/CSS/MD files — **passed**. `public/sw.js` is covered by `node --check` instead because `.prettierignore` excludes `public/*`.
- `node --check public/sw.js` — **passed**.
- Catalogue guard — **34 `planned`, 1 `soon`, 0 `ported`**, 35 unique ids.
- `next build` — **skipped**: both Turbopack and webpack builds were killed by the sandbox's memory limit (exit 137 / V8 OOM) after ~106 s and ~83 s. This is an environment limit, not a reported code error; run `pnpm build` locally with your normal env. Per your instruction, no further slow validation was attempted.

No lint script was run because `eslint` is not declared in this checkout's devDependencies. No dev server/preview was started.

## Apply the zip

`PM-Web-V3-Phase1.zip` contains the new/modified repo files above, with paths relative to `pm-web_v3/`, plus this changelog at the zip root. Unzip into the repository root of a clean clone and overwrite. It does **not** contain `node_modules`, `.next`, build output, the planning documents or the v2 zip. Then run:

```bash
pnpm install --frozen-lockfile
pnpm dev        # or pnpm build with your real NEXT_PUBLIC_SITE_URL
```

Copy the full manual checklist from `docs/tools-and-offline.md` → **P1 verification checklist (manual)**. Key gates: Tools shortcut/direct `/tools`, window drag/snap, gliding tabs, search, recents/favourites persistence, Available soon LaTeX slot, light/dark + narrow layout, offline hard-load toast, first-offline-visit Tool Bench, and Privacy Policy storage row.

## Known P1 limitations

- Zero tool calculations are implemented. Selecting any `planned` entry shows **Not installed yet** and its phase.
- Recents currently record any catalogue selection (including placeholders) so the navigation is testable; later phases can restrict this to `ported` opens if desired.
- The LaTeX slot is a reserved catalogue space only. `temml` and the dual-engine converter remain future, opt-in work.
- The production build was not completed in this sandbox; local verification is required before merging.

## Next gate

**Stop for review.** P2 (5 text/data tools) starts only after you approve P1, with its own zip and fix-first verification gate.
