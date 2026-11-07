# Cinema Studio — apply this delivery

Admin-only film & TV studio for **pm-web_v3**, at `/cinema`.
Built against the repo as cloned (`PM-Web_V3 v3.2.9`, Next 16.3.5, React 19.2.8, pnpm 11.9.0).

**78 files · no `.diff`/`.patch` · no new npm dependencies · lockfile untouched.**
This archive supersedes every previous drop — unzip it over the same paths.

---

## 1. Apply

```bash
# from the repo root
unzip -o cinema-studio.zip -d .
rm APPLY.md            # optional — the guide is also in docs/cinema-setup.md
```

Two paths moved in the second drop, so **delete the old ones first** if you
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
| `.env.example` | the four Cinema variables, documented | appended block |

Nothing else in the repo is touched. `app/globals.css` is **untouched** — all
cinema styling lives in the new `app/cinema.css`.

### What changed in this drop

**Iteration 5 — Stats and taste**

- The new **Stats** tab has a deep link at `/cinema/stats` and derives its charts,
  counts, insights and taste profile from the existing library. Counts update
  when you edit a title. Watch time and episode counts are estimates, not a
  stopwatch: progress records a selected episode rather than confirmed viewing.
- The **taste rail** sits immediately below the rotating hero. Rate two titles
  to start a low-confidence profile; a positive, resolvable genre signal and at
  least four unowned TMDB results are also needed. “Why?” explains the weights;
  “Another angle” changes the discover sort. TMDB errors hide the rail quietly.
- Newly added series save an optional episode count in the existing Notion
  payload and, if present, an Episodes column. Old rows still work, but may not
  have enough data for a series estimate. No migration is required; see the
  setup guide before removing/re-adding an old entry to populate this field.
- No new dependency, database, Notion integration or environment variable.
- This drop was checked with TypeScript, Prettier on changed files, PostCSS and
  fixture-based logic / stubbed route tests. No production build or interactive
  browser test was run here. Please verify those locally.

**Iteration 4.1 — key crew rail**

- A new **Key crew** rail sits directly above Cast: director, creators, writers,
  producers, executive producers, composer, cinematographer, editor, production
  and costume designers, casting director and VFX supervisor — one card each,
  labelled with the most central job that person held on this title. The
  allowlist and its order live in `parts/crew-jobs.ts`.
- The existing **Crew** rail is unchanged in spirit but now starts where the key
  crew stops: stunts, assistant directors, sound, art department, gaffers and
  everyone else TMDB lists, with no repeated faces.
- The textual “Crew” card in the right column is gone — the rail above the cast
  says the same thing, with faces and links.

**Iteration 4 — collections, settings page, crew, layout**

1. **Eight real collections**, each a TMDB discover spec with a fallback chain
   so a merged company id can never leave an empty shelf:
   *Marvel Cinematic Universe* (Marvel Studios 420, newest first),
   *DC — DCEU & DCU* (DC Films 128064 | DC Studios 184898),
   *HBO prestige* (network 49, series), *Paramount* (company 4),
   *A24 & friends* (41077), *Studio Ghibli* (10342), *Deep space* (sci-fi +
   adventure), and *On your services* — `with_watch_providers=8|9|337|1899|350`
   filtered to your saved region, i.e. Netflix, Prime Video, Disney+, Max and
   Apple TV. The grid now auto-fits instead of a fixed three columns, and every
   tile's “See all” walks the same fallbacks.
2. **Settings moved to a Notion page.** `NOTION_CINEMA_SETTINGS_PAGE_ID` names a
   plain page (no database); the studio writes exactly **one** `json` code block
   and rewrites it in place on every save, so the page never accumulates copies.
   Ladder: settings page → `__cinema_prefs` row → this process. The Settings
   screen shows which rung you are on.
3. **Region and language pickers.** 20 regions and 22 languages, saved with the
   rest of the settings. Region drives the certificate chain (US → GB → CA → AU
   → NZ → DE → FR → IN), release dates and the “where to watch” row; language is
   TMDB's `language` parameter. Both are read through a 60-second cache and
   saving either clears this tab's response cache.
4. **Crew rail.** Director, writers, producers, composer, camera, editing,
   design, casting, VFX and sound now get faces like the cast does — one card
   per person, their jobs on the label, ordered by role then by whether TMDB has
   a portrait. Both rails are clickable through to a filmography.
5. **Layout.** Cast and Crew now sit under the player in the left column, which
   is where the empty space was; reviews, recommendations and downloads stay
   full width.

**Iteration 3.1 — console clean-up**

1. **“Maximum update depth exceeded” fixed.** `PlayerStage` called
   `onEpisodeChange` from an effect that listed the callback in its deps; the
   parent hands over a new closure every render, so *write progress → re-render →
   new closure → write progress* never settled. The callback now lives in a ref
   and the write is guarded by the last value reported, so progress is written
   once per episode change. `EpisodeBar` also memoises its `items` array, which
   Base UI re-registers on identity change.
2. **Reopening the studio starts at `/cinema`.** Closing the window and
   reopening it from the desktop icon, the Start menu or `⌘K` now lands on the
   browse screen instead of the last film or episode you had open. The rule that
   already applied to collection windows (`route memory belongs to a live
   window`) now covers every `deepLinks` app; clicking the icon while the window
   is still open keeps you where you are.
3. **Duplicate React key on the score row.** OMDb repeats IMDb and Metacritic,
   which the dedicated chips already show; the extra entries are filtered and
   keys are index-qualified.

**Iteration 3 — title page, detail depth, hero timing**

1. **One back button, not two.** The title banner no longer carries its own back
   arrow; the studio toolbar owns Back (`⌘[` still works).
2. **Two columns under the banner.** Left: episode picker + player — theater mode
   still escapes the column and fills the window. Right: poster and airing card,
   then the **library panel**, then synopsis and every detail card. Collapses to
   a single column below ~900 px of window width.
3. **Far more detail.** The title route now asks TMDB for `credits, videos,
   keywords, external_ids, alternative_titles, watch/providers` plus
   `release_dates` (films) or `content_ratings` + `aggregate_credits` (series) in
   one request, and renders: original title, status, release date, first/last air
   dates, series type + in-production flag, season and episode counts, episode
   length, next and last episode, certificate (US → GB → CA → AU → DE → FR),
   budget and box office, countries, languages, original language, networks,
   studios, collection, creators, a role-grouped crew (written / produced /
   music / camera / editing / design / casting / VFX / sound), TMDB votes and
   popularity, IMDb and Wikidata ids, keywords, alternate titles, an OMDb card
   (rated, released, runtime, awards, box office), “where to watch” providers,
   outward links (site, IMDb, Wikidata, Facebook, Instagram, X, TMDB), member
   reviews, extra videos, and a 30-deep cast rail. Anything TMDB omits is simply
   not rendered, so sparse titles still read as a finished page.
4. **Hero pauses instead of restarting.** The 9 s dwell is driven by
   `requestAnimationFrame` and keeps its elapsed time, so hovering pauses both
   the slide and the hairline exactly where they were and resumes from there.
5. **Dead CSS removed** (`title-body`, `title-info`, `title-meta`,
   `title-overview`, `title-actions`, banner back-button rules); the stylesheet
   is still the single `app/cinema.css`, and it is PostCSS-clean.

**Iteration 2 — URLs, cache, player**

1. **Real URLs.** One catch-all page (`app/cinema/[[...segments]]/page.tsx`)
   plus a `deepLinks` flag in the registry means `/cinema/movie/550`,
   `/cinema/tv/1396`, `/cinema/person/287`, `/cinema/list/row/trending`,
   `/cinema/search?q=…`, `/cinema/library` and `/cinema/settings` are real,
   shareable, reloadable addresses. Browser **Back/Forward work**, and the window
   no longer reloads on every step, because the app id resolves from the path
   prefix instead of falling through to `null`.
2. **Caching.** `store/use-cinema-fetch.ts` keeps a five-minute module cache, so
   going Back to a title paints from memory with no skeleton and no refetch.
3. **Player up front.** Title pages mount the player immediately — no Play gate.
4. **No autoplay query.** Embeds are bare
   `{base}/embed/{movie|tv}/{id}[/{s}/{e}]`; `?autoplay=1` is what makes these
   hosts answer “unavailable”.
5. **Spoiler blur removed** everywhere — preference, schema field, setting row, CSS.
6. **YTS** uses `https://movies-api.accel.li/api/v2`.
7. **Animated shell.** Sliding tab pill (`layoutId`), animated view transitions,
   auto-rotating hero.

---

## 2. Environment (3 variables)

```dotenv
TMDB_API_KEY=                 # v3 key (32 chars) OR v4 read token (eyJ…)
OMDB_API_KEY=                 # optional — IMDb + Metacritic chips, awards, box office
NOTION_CINEMA_FAVORITES_ID=   # data source id of your library database
```

- **YTS needs no variable** (keyless public API; base URL is hard-coded).
- **No `CINEMA_*` variables.** Provider order, probe/watchdog timeouts, cache
  windows, paging, locale, region (used for certificates and “where to watch”)
  — all literals in `lib/cinema/config.ts`.
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
   is why there is no second variable. The row holds `defaultProviderId` and
   `posterDensity` only.

Leave the variable unset and the studio still works: it falls back to a
session-only store and the toolbar pill says so.

---

## 4. What you get

**Browse** — a hero that auto-rotates every 9 s (dots, arrows, progress hairline,
hover pauses rather than restarts), mood strip, ranked trending rail, four
curated rails, eight collection tiles. Every “See all” is real and server-paged.

**Search** — debounced 280 ms, films + series + **people** in one response,
filter chips, recents, load-more. The term lives in `?q=`, written with
`replaceState` so typing costs no navigation and Back still returns to the list.

**Title** — banner with score chips (TMDB, IMDb, Metacritic, RT) and genres, then
two columns: episode picker, player, cast and crew rails on the left; poster,
library panel and the full detail stack on the right. Below: reviews,
recommendations, YTS download table.

**Playback** — `vidsrc.to` primary with four mirrors behind it, server-side
reachability probe (2 s, cached 5 min), always-visible provider strip, 9 s
watchdog with one automatic failover, theater mode (Esc exits) that escapes the
two-column grid, remembered provider, season 0 labelled *Specials*, per-episode
progress into the library.

**Filmography** — click any face in a cast list: merged `combined_credits`,
dedupe, self-appearances dropped, filters (films / series / acting / crew) and
four sorts, character names on the tiles.

**Library** — Notion-backed, optimistic, single source of truth, status/type
filters, four sorts, *Continue watching* rail, cloud/session pill that never lies.

**Settings** — region, language, starting provider and poster density, stored on
a Notion page as one JSON block, with the storage rung stated plainly.

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
3. Home renders; the hero **changes on its own** after nine seconds, and hovering
   **pauses** it mid-slide (the hairline stops too) instead of restarting.
4. Open a film → URL becomes `/cinema/movie/{id}`, the player is already there,
   and the page is two columns. Only one back button (toolbar).
5. Hit **theater mode** on the player — it fills the window; Esc returns.
6. Reload that URL — the window comes back on the same film.
7. Press browser **Back** → home grid, no reload flash; **Forward** → the film.
8. If the iframe is black, the CSP `frame-src` edit did not apply — check the
   Network tab for a CSP violation. Switch providers with mouse *and* keyboard.
9. Open a series → season + episode selects, season 0 labelled **Specials**.
10. **Settings → Region / Language**: switch region to `LK` and language to
    `Sinhala`, then reopen a title — the certificate and the “where to watch”
    row change, and the settings page in Notion holds one JSON block (not five).
11. Home → **collections**: MCU, DC, HBO prestige, Paramount, A24, Ghibli, Deep
    space and *On your services* (this one follows the region you just set).
10. Save a title to **Watchlist** → toolbar pill, Library tab and the Notion row
    agree within a second.
11. Open a cast member → filmography → open a credit → Back twice.
12. Add three titles and rate at least two with known genres. Open **Stats**,
    check the estimate and charts, reload `/cinema/stats`, and try Back/Forward.
13. Return to Browse: where sufficient candidates exist, check the taste rail,
    “Why?” and “Another angle”; edit a rating, then return to Browse and verify
    the recommendations refresh and exclude library titles.

---

## 6. Rollback

Delete (all new, nothing else imports them):

```
lib/cinema/                app/cinema.css        app/cinema/            app/api/cinema/
components/admin/cinema/   docs/cinema-setup.md
```

(`lib/cinema/settings.ts`, `parts/FaceRail.tsx` and `parts/CrewRail.tsx` are new
in this drop; they live inside those directories.)

Then restore the 13 pre-existing files from git:

```bash
git checkout -- lib/registry.ts components/apps/AppBody.tsx \
  components/desktop/MenuBar.tsx components/desktop/DesktopIcons.tsx \
  components/desktop/Desktop.tsx components/command/CommandPalette.tsx \
  components/legal/CookieNotice.tsx components/system/states/route-state.ts \
  components/system/states/LoadingView.tsx hooks/useWindowManager.ts \
  app/layout.tsx next.config.mjs .env.example
```

Remove the four cinema env vars, and archive the Notion database if you no longer want
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
- **No autoplay.** The session starts paused inside the provider's own player.
- **Detail depth is TMDB's, not ours.** Budget, revenue and certificates exist
  for most films and few series; “where to watch” follows the saved region
  in TMDB's provider feed, which is availability metadata — not a stream.
- **The five-minute cache is per tab.** A hard reload always refetches; nothing
  is persisted to storage.
- **TMDB's `discover/tv` has no `with_cast`.** TV filmography is filtered
  client-side from `combined_credits`.
- **Notion rate limits** (≈3 req/s) apply to writes. Saves are sequential and
  optimistic, and a failure rolls back rather than drifting.
- **Legal**: `vidsrc.*` embeds and YTS torrents are unlicensed third-party
  distribution in most jurisdictions. The page is owner-only and noindexed,
  which limits exposure but is not a shield.
- **Not run here**: `next build`. The turbopack production build exceeded the
  sandbox, so verification rests on `tsc --noEmit` (clean), `prettier --check`
  (clean), a **PostCSS parse** of `app/cinema.css` (clean — the same parser the
  build uses), and a Node harness that feeds realistic TMDB payloads through the
  zod schema and the title mapper for both `movie` and `tv`. Your local
  `pnpm build` is still the real gate — nothing here adds a dependency.
