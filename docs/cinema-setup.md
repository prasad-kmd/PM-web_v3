# Cinema Studio — setup

Admin-only streaming studio inside the DesktopOS shell, at `/cinema`.

It is guarded exactly like Invoice Studio: `app/cinema/page.tsx` calls
`getAdminSession()` and throws a **stealth 404** when the owner is not signed in,
so the route does not advertise itself. The window only opens for a signed-in
owner, from **Profile → Studio → Cinema Studio**, the command palette, or the URL.

---

## 1. Environment

Exactly **three** new variables. Everything else — provider order, timeouts,
locale, paging, cache windows — is a literal in `lib/cinema/config.ts`.

| Variable                     | Required | Notes                                                                                                                                     |
| ---------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `TMDB_API_KEY`               | **yes**  | v3 key (32 chars) **or** v4 read token (`eyJ…`). The client sniffs the shape and uses `?api_key=` or `Authorization: Bearer` accordingly. |
| `OMDB_API_KEY`               | no       | Adds IMDb + Metacritic chips. Without it those chips simply do not render.                                                                |
| `NOTION_CINEMA_FAVORITES_ID` | no       | Data source id of the library database. Without it the studio runs in **session** mode (see §4).                                          |

No `YTS_*` variable exists: YTS is a keyless API and its base URL is hard-coded.

There is **no dedicated Notion integration** for this feature. The library uses
the same token the rest of the site uses:

```
NOTION_API_KEY  →  NOTION_AUTH_TOKEN  →  NOTION_API_TOKEN  →  NOTION_TOKEN
```

(the first one that is set wins).

---

## 2. Create the library database

1. In Notion, create a database (any parent page).
2. **Share it with the same integration** you already use for content/invoices
   (`•••` → _Connections_ → your integration). No new integration, no new token.
3. Copy the database id from its URL — the 32-character id after the last `/`
   and before the `?`, or the `data_source_id` if you already have it.
4. Set `NOTION_CINEMA_FAVORITES_ID` to that id.

### Schema

Only **one** column is required. The app introspects the schema on first write,
matches columns by **name alias** and **type**, and skips anything absent — so a
minimal database works, and a rich one reads well inside Notion itself.

| Column                        | Type         | Aliases accepted                                                             | Required             |
| ----------------------------- | ------------ | ---------------------------------------------------------------------------- | -------------------- |
| `Title` (or any title column) | Title        | auto-detected                                                                | **yes**              |
| `Payload JSON`                | Rich text    | `Payload`, `Cinema JSON`, `JSON`, `Data`                                     | strongly recommended |
| `TMDB ID`                     | Number       | `Tmdb Id`, `TMDB`, `TmdbID`                                                  | no                   |
| `Media Type`                  | Select       | `Type`, `Kind` (`Movie` / `TV`)                                              | no                   |
| `Year`                        | Number       | `Release Year`                                                               | no                   |
| `Status`                      | Select       | `Library Status` (`Favorite`, `Watchlist`, `Watching`, `Watched`, `Dropped`) | no                   |
| `My Rating`                   | Number       | `Rating`, `Score` (1–10)                                                     | no                   |
| `Genres`                      | Multi-select | `Genre`                                                                      | no                   |
| `Poster`                      | URL          | `Poster URL`, `Cover`                                                        | no                   |
| `Runtime`                     | Number       | `Runtime (min)`                                                              | no                   |
| `Seasons`                     | Number       | `Season Count`                                                               | no                   |
| `Progress`                    | Rich text    | `Watch Progress`, `Episode` (`S02E05`)                                       | no                   |
| `Notes`                       | Rich text    | `Comment`, `Review`                                                          | no                   |
| `Added`                       | Date         | `Added At`, `Date Added`                                                     | no                   |

### How rows are written

- One row per title, keyed on `movie:<tmdbId>` / `tv:<tmdbId>`.
- `Payload JSON` holds a lossless envelope:

  ```json
  { "__kind": "cinema", "v": 1, "data": { …the whole entry… } }
  ```

  On read the envelope wins, so a deleted column never loses data. If the
  envelope is missing (someone created the row by hand), the app rebuilds the
  entry from the visible columns instead of dropping it.

- Archiving uses `in_trash` — removing a title in the app does **not** delete the
  page permanently.
- Rich text is chunked at 1,850 characters, and the schema is cached for
  five minutes per data source.

### Preferences row

One row in the _same_ database, titled `__cinema_prefs`, holds app preferences
(starting provider, poster density) in its payload. That is why there is no
second database and no second variable. The row is skipped when the
library is listed.

---

## 3. Playback

Provider chain (`lib/cinema/config.ts`), `vidsrc.to` first:

```
vidsrc.to → vidsrcme.su → vidsrc-embed.su → vidsrc-embed.ru → vsrc.su
```

- `/api/cinema/player` probes each **origin** (2s each, parallel, cached 5 min) and
  re-orders the chain: reachable → unprobed → unreachable. A failed probe is
  advisory, never a veto — these hosts routinely reject server requests while
  working fine inside an iframe.
- The player has a **9s watchdog**. On first stall it advances one provider
  automatically and says so; after that it offers _Switch provider_ / _Reload_.
- The provider that last fired `onLoad` is remembered in
  `pm.cinema.provider.v1` and tried first next time.
- CSP: `next.config.mjs` `frame-src` must list the same five origins. **If you add
  a provider to `config.ts`, add its origin to `frame-src` too** or the iframe is
  blocked before the provider ever answers.

Season 0 is labelled _Specials_ and is never coerced to season 1.

---

## 4. Storage modes

| Mode      | When                                       | Behaviour                                                                                           |
| --------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `cloud`   | token **and** `NOTION_CINEMA_FAVORITES_ID` | Rows are written to Notion. Survives restarts and other devices.                                    |
| `session` | anything missing                           | Rows live in server memory for the life of the process; the toolbar pill reads **Session library**. |

If a cloud read fails, the store degrades to `session` **and** returns a notice,
which the UI prints — it never silently pretends the data is durable.

Watch position before the library phase is kept client-side in
`pm.cinema.progress.v1`; the library row (`Progress`, e.g. `S02E05`) is the
authoritative copy once a title is saved.

---

## 5. Downloads

YTS is always available (no flag). It is keyless and rate-limited; results are
cached for 12 hours. The panel distinguishes three outcomes explicitly:

- `ready` — releases listed, sorted quality → seeds → size
- `unavailable` — YTS answered but has no release for that IMDb id
- `error` — YTS did not answer

Third-party torrents are unlicensed distribution in most jurisdictions. The page
is owner-only and noindexed, which limits exposure but is not a legal shield.

---

## 6. Troubleshooting

| Symptom                                           | Cause                                                                            | Fix                                                             |
| ------------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `/cinema` returns 404 while signed in             | Session cookie expired, or `ADMIN_*` auth not configured                         | Sign in again; check `docs/admin-suite-setup.md`                |
| "TMDB is not configured yet"                      | `TMDB_API_KEY` missing or unreadable at runtime                                  | Set it and redeploy — env is read server-side only              |
| Posters do not load                               | CSP `img-src` missing `https://image.tmdb.org`                                   | Restore the entry in `next.config.mjs`                          |
| Player is a black rectangle, no strip error       | `frame-src` missing the provider origin                                          | Add it to the CSP **and** to `CINEMA_PLAYBACK_PROVIDERS`        |
| Library pill says "Session library"               | `NOTION_CINEMA_FAVORITES_ID` unset, or the DB is not shared with the integration | §2                                                              |
| Rows appear but status/rating are blank in Notion | Those columns do not exist, or use unexpected names                              | Add them, or rely on `Payload JSON`                             |
| Notion write fails with a validation error        | A column exists but has an incompatible type                                     | The writer only sets types it recognises; check the column type |
