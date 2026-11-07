# Cinema Studio — apply this delivery

Admin-only film & TV studio for **pm-web_v3**, at `/cinema`.
Built against the repo as cloned (`PM-Web_V3 v3.2.9`, Next 16.3.5, React 19.2.8, pnpm 11.9.0).

**65 files · no `.diff`/`.patch` · no new npm dependencies · lockfile untouched.**
This archive supersedes the previous drop — unzip it over the same paths.

---

## 1. Apply

```bash
# from the repo root
unzip -o cinema-studio.zip -d .
rm APPLY.md            # optional — the guide is also in docs/cinema-setup.md
```

Two paths moved since the last drop, so **delete the old ones first** if you
applied it:

```bash
rm -f app/cinema/page.tsx app/cinema/loading.tsx \
      components/admin/cinema/parts/SeasonPicker.tsx
```

Every file in the archive is a **complete file at its final path**. Thirteen of
them are existing files that were edited; they are shipped whole so nothing
needs merging:

| Edited file | What changed | Lines touched |
| --- | --- | --- |
| `lib/registry.ts` | `"cinema"` added to `AppId` + `APP_REGISTRY` (`adminOnly: true`, `deepLinks: true`); `getAppIdFromPathname` accepts sub-paths for deep-link apps | 3 blocks |
| `components/apps/AppBody.tsx` | `dynamic(..., { ssr:false })` import + `case "cinema"` gated by `useAdminAuth()` | 2 blocks |
| `components/desktop/MenuBar.tsx` | `Film02Icon` import + `Studio → Cinema Studio` item | 2 blocks |
| `components/desktop/DesktopIcons.tsx` | glyph map entry | 2 lines |
| `components/desktop/Desktop.tsx` | `closeApp("cinema")` on sign-out | 1 line |
| `components/command/CommandPalette.tsx` | `APP_ICON` entry + `Studio` command | 2 blocks |
| `components/legal/CookieNotice.tsx` | `"cinema"` added to `ADMIN_ROUTE_SEGMENTS` | 1 line |
| `components/system/states/route-state.ts` | `cinema` → loading layout | 3 lines |
| `components/system/states/LoadingView.tsx` | `"cinema"` layout + skeleton block | 2 blocks |
| `hooks/useWindowManager.ts` | default window size for the app | 1 block |
| `app/layout.tsx` | `import "./cinema.css"` | 1 line |
| `next.config.mjs` | CSP `img-src` += `image.tmdb.org`, `frame-src` += 5 provider origins, `remotePatterns` += `image.tmdb.org` | 3 blocks |
| `.env.example` | the three Cinema variables, documented | appended block |

Nothing else in the repo is touched. `app/globals.css` is **untouched** — all
cinema styling lives in the new `app/cinema.css`.

### What changed in this drop

1. **Real URLs.** One catch-all page (`app/cinema/[[...segments]]/page.tsx`)
   plus a `deepLinks` flag in the registry means `/cinema/movie/550`,
   `/cinema/tv/1396`, `/cinema/person/287`, `/cinema/list/row/trending`,
   `/cinema/search?q=…`, `/cinema/library` and `/cinema/settings` are all real,
   shareable, reloadable addresses. Browser **Back/Forward now work** and the
   window no longer reloads on every step, because the app id is resolved from
   the path prefix instead of falling through to `null`.
2. **Caching.** `store/use-cinema-fetch.ts` keeps a five-minute module cache, so
   going Back to a title paints from memory with no skeleton and no refetch.
3. **Title page.** Full-width backdrop **banner** with scrim, back button in the
   corner, then the **player mounted immediately** — no Play gate — then poster,
   facts, cast, seasons, recommendations, downloads.
4. **Autoplay query removed.** Embeds are built as bare
   `{base}/embed/{movie|tv}/{id}[/{s}/{e}]` — no `?autoplay=1`, no query string
   at all. That parameter is what makes these hosts answer “unavailable”.
5. **Spoiler blur is gone** — the preference, the schema field, the setting row
   and the CSS. Synopses always readable.
6. **YTS** now calls `https://movies-api.accel.li/api/v2`.
7. **Hero auto-rotates** every 9 s (cross-fade, hairline progress, pauses on
   hover/focus/hidden tab, off under `prefers-reduced-motion`), and the
   top tabs slide with an Animate UI-style shared pill plus an animated view
   transition between screens.

---

## 2. Environment (3 variables)

```dotenv
TMDB_API_KEY=                 # v3 key (32 chars) OR v4 read token (eyJ…)
OMDB_API_KEY=                 # optional — IMDb + Metacritic chips
NOTION_CINEMA_FAVORITES_ID=   # data source id of your library database
```

- **YTS needs no variable** (keyless public API; base URL is hard-coded).
- **No `CINEMA_*` variables.** Provider order, probe/watchdog timeouts, cache
  windows, paging, locale — all literals in `lib/cinema/config.ts`.
- **No dedicated Notion integration.** The library reuses the existing chain
  (`NOTION_API_KEY` → `NOTION_AUTH_TOKEN` → `NOTION_API_TOKEN` → `NOTION_TOKEN`).

---

## 3. Notion library database

Full detail in `docs/cinema-setup.md`. The short version:

1. Create a database, **share it with the integration you already use**.
2. Copy its id (`data_source_id` preferred) into `NOTION_CINEMA_FAVORITES_ID`.
3. Add columns if you want them visible in Notion — **only a Title column is
   required**; everything else (status, rating, year, genres, poster, progress,
   notes, TMDB id) is matched by name-alias and type and simply skipped if
   absent. `Payload JSON` (rich text) holds a lossless envelope, so no data is
   lost even with a two-column database.
4. Preferences live as one `__cinema_prefs` row in the **same** database — that
   is why there is no second variable. The row now holds `defaultProviderId` and
   `posterDensity` only (the spoiler flag is gone).

Leave the variable unset and the studio still works: it falls back to a
session-only store and the toolbar pill says so.

---

## 4. What you get

**Browse** — a hero that auto-rotates every 9 s (dots, arrows, progress
hairline, pause on hover/focus), mood strip, ranked trending rail, four curated
rails, six collection tiles. Every “See all” is real and server-paged.

**Search** — debounced 280 ms, films + series + **people** in one response,
filter chips, recents, load-more. The term lives in `?q=`, written with
`replaceState` so typing costs no navigation and Back still returns to the list.

**Title** — banner header, metadata in tabular figures, TMDB/IMDb/Metacritic
chips, synopsis, player immediately, in-page season chips, cast rail,
recommendations, YTS download table, library panel (status / 1–10 rating /
notes).

**Playback** — `vidsrc.to` primary with four mirrors behind it, server-side
reachability probe (2 s, cached 5 min), always-visible provider strip, 9 s
watchdog with one automatic failover, theater mode (Esc exits), remembered
provider, season 0 labelled *Specials*, per-episode progress into the library.

**Filmography** — click any face in a cast list: merged `combined_credits`,
dedupe, self-appearances dropped, filters (films / series / acting / crew) and
four sorts, character names on the tiles.

**Library** — Notion-backed, optimistic, single source of truth, status/type
filters, four sorts, *Continue watching* rail, cloud/session pill that never lies.

**Settings** — starting provider, poster density (real, not decorative), Notion
status.

---

## 5. Verify (5 minutes)

```bash
pnpm install          # no lockfile change expected
pnpm typecheck        # passed here on tsc 5.x
pnpm dev
```

Manual checklist:

1. Signed out → `http://localhost:3000/cinema/movie/550` returns a **404**. That
   is the stealth guard, not a bug.
2. Sign in → **Profile → Studio → Cinema Studio** (also `⌘K` → “Cinema Studio”).
3. Home renders and the hero **changes on its own** after nine seconds; hovering
   pauses it. Posters load (this proves CSP `img-src`).
4. Open a film → the URL becomes `/cinema/movie/{id}` and the player is already
   there. **Reload that URL** — the window comes back on the same film.
5. Press browser **Back** → you return to the home grid with no reload flash;
   press **Forward** → the film again. `⌘[` / `Ctrl+[` does the same.
6. If the iframe is black, the CSP `frame-src` edit did not apply — check the
   Network tab for a CSP violation. Switch providers with mouse *and* keyboard.
7. Open a series → pick a season including **Specials** if present.
8. Save a title to **Watchlist** → toolbar pill, Library tab and the Notion row
   agree within a second.
9. Open a cast member → filmography → open a credit → Back twice.

---

## 6. Rollback

Delete (all new, nothing else imports them):

```
lib/cinema/                app/cinema.css        app/cinema/            app/api/cinema/
components/admin/cinema/   docs/cinema-setup.md
```

Then restore the 13 pre-existing files from git:

```bash
git checkout -- lib/registry.ts components/apps/AppBody.tsx \
  components/desktop/MenuBar.tsx components/desktop/DesktopIcons.tsx \
  components/desktop/Desktop.tsx components/command/CommandPalette.tsx \
  components/legal/CookieNotice.tsx components/system/states/route-state.ts \
  components/system/states/LoadingView.tsx hooks/useWindowManager.ts \
  app/layout.tsx next.config.mjs .env.example
```

Remove the three env vars, and archive the Notion database if you no longer want
it. The app leaves no other trace.

---

## 7. Honest limits

- **VidSrc availability is out of our hands.** These aggregator domains rotate
  and die. What the app guarantees is that a dead provider is *visible* and one
  click away from another — not that any provider works forever. `vidsrc.to` is
  first because you asked for it; the four mirrors exist for the days it isn't.
- **The probe is advisory.** It checks the provider's origin, not every embed
  path. A red dot means “did not answer a server request”, which these hosts
  sometimes do while serving fine in an iframe.
- **No autoplay.** The session starts paused inside the provider's own player,
  because every query parameter we tried on these hosts — `?autoplay=1`
  included — pushed them into “unavailable”.
- **The five-minute cache is per tab.** A hard reload always refetches; nothing
  is persisted to storage, so stale data cannot outlive the visit.
- **TMDB's `discover/tv` has no `with_cast`.** TV filmography is therefore
  filtered client-side from `combined_credits`; films could be paged
  server-side, series cannot.
- **Notion rate limits** (≈3 req/s) apply to writes. Saves are sequential and
  optimistic, and a failure rolls back rather than drifting.
- **Legal**: `vidsrc.*` embeds and YTS torrents are unlicensed third-party
  distribution in most jurisdictions. The page is owner-only and noindexed,
  which limits exposure but is not a shield.
- **Not run here**: `next build`. The turbopack production build exceeded the
  sandbox, so verification rests on `tsc --noEmit` (clean) plus prettier. Your
  local `pnpm build` is the real gate — nothing in this delivery adds a
  dependency, so a lockfile surprise is not possible.
