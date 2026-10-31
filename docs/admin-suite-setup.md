# Owner Workstation Suite Setup (`pm-web_v3`)

This document covers configuration for the private owner suite integrated into `pm-web_v3`:

1. **Owner Sign-In & Workstation Lock Curtain** (`MenuBar` profile dropdown + `⌘⇧L`)
2. **OG Image Studio** (`05 · Bloom spotlight` + admin-only `/api/og-custom`)
3. **Invoice Studio** (`01 · Split ledger studio` + Notion `2026-03-11` ledger + client-side `@react-pdf/renderer` PDF export)

> **Public Surface Hygiene:** All UI labels, error messages, and client bundles intentionally omit third-party provider names (such as Notion) and internal authentication mechanics (`.env`, cookie formats, hashing details). Technical details are documented solely in this file.

---

## 1. Owner Authentication (`.env.local`)

Authentication is single-owner and stateless—no external auth database is required.

### Generate Credentials

Run the included helper script locally to derive a `scrypt` password hash and a 32-byte session signing secret:

```bash
node scripts/hash-admin-password.mjs "your-strong-passphrase"
```

Copy the output into `.env.local` (uses `:` delimiters so Next.js `.env` variable expansion never alters `$` segments):

```dotenv
ADMIN_USERNAME=prasad
ADMIN_PASSWORD_HASH=scrypt:<saltHex>:<derivedHex>
ADMIN_SESSION_SECRET=<random-32-byte-base64url-secret>
ADMIN_SESSION_TTL_HOURS=12
```

- **Local development fallback:** You may set `ADMIN_PASSWORD=...` instead of `ADMIN_PASSWORD_HASH` during local testing (`ADMIN_PASSWORD_HASH` always takes precedence when set).
- **Session cookie:** Issues `__Host-pm_admin` (`HttpOnly; Secure; SameSite=Strict; Path=/`) over HTTPS in production and `pm_admin` on `http://localhost`.

### Two-Step TOTP, Trusted Browsers & Emergency Recovery Codes (Optional)

Run the offline TOTP enrollment helper to generate a 160-bit Base32 RFC 6238 secret, render a **scannable QR code directly in your terminal**, verify a live 6-digit code interactively, and derive 5 `scrypt`-hashed emergency recovery codes:

```bash
node scripts/generate-admin-totp.mjs
```

Paste the printed lines into `.env.local` (or your hosting environment variables):

```dotenv
ADMIN_TOTP_SECRET=<32-char-base32-secret>
ADMIN_TRUST_TTL_DAYS=30
ADMIN_RECOVERY_HASHES=scrypt:<saltHex>:<derivedHex>,scrypt:<saltHex>:<derivedHex>,...
```

How the hardened two-step unlock behaves:

1. **Stealthy Step-Up Flow:** Public visitors only ever see the standard two-input **Username** + **Password** curtain (`GET /api/admin/session` never reveals whether TOTP is enabled when signed out). Only after primary credentials pass does the server issue a **90-second**, IP + User-Agent bound HMAC challenge token (`step: "totp"`) and reveal the 6-box authenticator input.
2. **Brute-Force & Replay Hardening:** Step 2 enforces a strict **5-failure / 10-minute** IP limiter, burns the active 90-second challenge token automatically after **4 wrong codes** (requiring primary password re-entry), uses a tight **±1 step (`±30s`)** tolerance, and blocks replaying an already-accepted 6-digit step within the same warm server instance.
3. **30-Day Trusted Workstation Cookie:** Checking **Trust this browser for 30 days** during Step 2 issues an `HttpOnly; SameSite=Strict` cookie (`__Host-pm_admin_trust` on HTTPS / `pm_admin_trust` on localhost) bound to your User-Agent and an active credential fingerprint (`ADMIN_USERNAME` + password hash + `ADMIN_TOTP_SECRET`). Rotating any secret revokes all trusted browsers immediately, and you can manually clear trust anytime from **MenuBar Profile → Forget trusted browser** (set `ADMIN_TRUST_TTL_DAYS=0` to disable browser trust).
4. **Emergency Recovery Codes:** Save the 5 plaintext `XXXX-XXXX-XXXX` recovery codes shown once by `scripts/generate-admin-totp.mjs` in your password manager. Clicking **Use an emergency recovery code** on Step 2 verifies against `ADMIN_RECOVERY_HASHES`. Rotate `ADMIN_TOTP_SECRET` and `ADMIN_RECOVERY_HASHES` after using an emergency code.
5. **Telegram Sign-In Audit Alerts:** When `TELEGRAM_TOKEN` and `TELEGRAM_CHAT_ID` are set, every admin sign-in attempt — whether successful, failed (wrong password, wrong/replayed TOTP code, invalid recovery code, expired challenge, malformed payload), cross-origin blocked, or rate-limited — dispatches a non-blocking Telegram notification via Next.js `after()` containing the outcome, stage/method, reason, username, browser trust state, `Asia/Colombo` & UTC timestamps, client IP, proxy geo headers (when present), and parsed browser/OS details. Repeated rate-limit hits from the same IP are coalesced over a 2-minute window to prevent Telegram bot flooding.

### Accessing the Suite in the UI

- **Visitors (signed out):** Clicking the top-left portrait in the 40px menu bar opens a clean profile menu (`About Prasad`, `Get in touch…`, `Copy workspace link`, and `Sign in…`).
- **Workstation Lock Curtain:** Selecting `Sign in…` lowers a frosted acrylic veil below the menu bar with **Username** and **Password** fields.
- **Signed-in Owner:** The profile portrait displays a subtle emerald status dot and unlocks:
  - **OG Image Studio**
  - **Invoice Studio**
  - **Content Insights**
  - **Refresh content** (invalidates cached CMS tags immediately via `/api/admin/cache/purge`)
  - **Automatic Owner Comment Mode:** Opening any entry's discussion panel while signed in automatically applies your owner profile (`ADMIN_DISPLAY_NAME` / `ADMIN_COMMENT_EMAIL` / social handles, defaulting to `Prasad Madhuranga` and `CONTACT_EMAIL`), skips the guest identity inputs and Turnstile prompt, and publishes comments in `PMc2` format (`role=owner`) with the distinguished **Owner** badge (with a one-click **Guest mode** toggle if needed).
  - **Sign out** (clears session cookies and closes open studio windows)

> The owner hotkeys (`⌘⇧L`, `⌘⇧G`, `⌘⇧I`, `⌘⇧A`) and the `⌘,` settings shortcut were removed in favour of the menubar, so every studio is reached through **MenuBar Profile**. `⌘K` still opens the workspace command palette.

### The Stealth-404 Contract (owner-only routes)

`/insights`, `/invoices` and `/og-studio` are **server-guarded**, not client-guarded. A visitor who is not signed in never receives the studio — they receive a genuine **HTTP 404** rendered with the site's own not-found surface.

| Request | Signed out | Signed in |
|---|---|---|
| `GET /insights` | **404** — the site's own not-found surface. No studio markup, no login prompt | **200** — the Content Insights window opens in the DesktopOS shell |
| `GET /invoices` | **404** (same) | **200** — the Invoice Studio window |
| `GET /og-studio` | **404** (same) | **200** — the OG Image Studio window |

The rules this contract enforces:

1. **A real 404 status.** `notFound()` is raised inside the page component, so the response status is `404` — not `200` with an empty body.
2. **No studio markup.** The guard runs before the studio component, so the studio's HTML is never in the response.
3. **Never a login prompt.** The DesktopOS lock curtain is **not** auto-opened by an admin route. It is reachable only from **MenuBar Profile → Sign in…** or from the command palette.
4. **No metadata leak.** While signed out the routes return the neutral title `Page not found` with `robots: { index: false, follow: false }` — the same directives as the real route, so nothing distinguishes "does not exist" from "not yours".
5. **A closed door stays closed.** If the session ends while a studio window is open, the window closes and the URL returns to `/`.
6. **Sign-in from the 404 screen works.** If the owner signs in from the Profile menu while sitting on `/insights`, the shell refreshes the server payload and the studio opens automatically.

These three routes are the only pages that are deliberately `force-dynamic`: they read the session cookie on every request, and they are owner-only, so their traffic is effectively zero.

### The admin-hint cookie

`pm_admin_hint` is a **non-sensitive boolean** cookie (`"1"`). It is set **only** after a successful owner sign-in and it expires with the session.

It never gates authorisation — the real `HttpOnly` session cookie does that. Its only job is to let the client skip a pointless `GET /api/admin/session` round-trip: without it, every visitor's page load would trigger one server function invocation purely to learn that they are not signed in.

| Cookie | HttpOnly | Purpose |
|---|---|---|
| `__Host-pm_admin` / `pm_admin` | yes | The session itself — authorisation. |
| `__Host-pm_admin_trust` / `pm_admin_trust` | yes | Trusted-workstation recognition. |
| `pm_admin_hint` | **no** | A hint that a session *might* exist. No secret, no data. |

The hint is cleared by the server (`GET /api/admin/session` → `401`) and by the client on sign-out. It is listed in the Settings → Privacy register as an owner-scoped cookie.

---

## 2. OG Image Studio (`05 · Bloom Spotlight`)

`OG Image Studio` renders high-resolution PNG cards via `/api/og-custom` (`GET` and `POST`, Node runtime), gated strictly behind `requireAdminSession`. Because cards are created and downloaded directly by the owner rather than crawled publicly, public URL signing is not required.

### Capabilities

- **Canvas presets:** `1200 × 630` (Open Graph), `1280 × 720` (HD Cover), `1200 × 675` (Social 16:9), `1200 × 1200` (Square 1:1).
- **Backdrops & palettes:** All 7 local Bloom wallpapers (`public/og/wallpaper-*.jpg`), `Obsidian Studio`, and `Daylight Paper`, paired with 8 accent palettes, blueprint grid / dot matrix / corner tick overlays, and dark/light card surfaces.
- **Typography & media:** Auto-fitting or fixed `Outfit` headline/subtitle scales, category badge, series kicker, comma-separated topic tags, 9 header glyphs (`favicon-pm.svg` + technical icons), local disk image dropzone (embedded via `POST /api/og-custom`), or SSRF-guarded remote `https://` image URLs.
- **Export:** One-click **Download PNG**, **Copy PNG** to clipboard, **Open** raw PNG in a new tab, and **Social Unfurl** preview mode.

---

## 3. Invoice Studio (`01 · Split Ledger Studio`)

### Client-Side PDF Generation

PDF generation uses `@react-pdf/renderer` **entirely in the browser** (`components/admin/invoice/pdf/`), loading the workspace's same-origin `Outfit` `.woff` fonts (`/og/outfit-400.woff`, `500`, `600`) and rasterizing SVG/WebP logos on an offscreen `<canvas>` before building the vector A4 PDF. Zero server compute or API rate limits are consumed when previewing or downloading PDFs.

### Notion Database Setup (`2026-03-11` Data Sources API)

Create a Notion integration (or reuse `NOTION_API_KEY` if granted read/write content capabilities on the ledger databases; for strict least-privilege separation from read-only CMS content, set `NOTION_INVOICES_TOKEN` to a dedicated integration token shared **only** with your invoice pages/databases).

```dotenv
NOTION_INVOICES_TOKEN=ntn_...
NOTION_INVOICES_ID=<invoices-database-id>
NOTION_CLIENTS_ID=<optional-clients-database-id>
NOTION_INVOICE_SETTINGS_PAGE_ID=<optional-settings-page-id>
```

> If `NOTION_INVOICES_ID` is not set yet, Invoice Studio automatically runs in **Session draft mode** so you can compose invoices and export client-side PDFs immediately.

#### Recommended `NOTION_INVOICES_ID` Properties

`lib/invoices/store.ts` introspects your data source schema automatically and populates every matching column below while storing the full canonical record (including unlimited line items and an immutable client snapshot) inside `Items JSON` + formatted Notion table blocks in the page body:

| Property Name                         | Notion Type                | Notes                                                                                |
| ------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------ |
| `Invoice Number` _(or default Title)_ | **Title**                  | Sequential number, e.g. `INV-0001`                                                   |
| `Status`                              | **Select** _(or Status)_   | `Draft`, `Sent`, `Paid`, `Overdue`, `Cancelled`                                      |
| `Issue Date`                          | **Date**                   | `YYYY-MM-DD`                                                                         |
| `Due Date`                            | **Date**                   | `YYYY-MM-DD` (`Sent` past due auto-displays as `Overdue`)                            |
| `Paid Date`                           | **Date**                   | Auto-stamped when marked `Paid`                                                      |
| `Currency`                            | **Select**                 | `LKR`, `USD`, `EUR`, `GBP`, `AUD`, `CAD`, `JPY`                                      |
| `Client Name`                         | **Rich text**              | Searchable recipient name                                                            |
| `Company`                             | **Rich text**              | Recipient organization                                                               |
| `Client Email`                        | **Email** _(or Rich text)_ | Recipient email                                                                      |
| `Subtotal`                            | **Number**                 | Pre-discount/tax sum                                                                 |
| `Discount`                            | **Number**                 | Computed discount amount                                                             |
| `Tax Rate`                            | **Number**                 | Percentage (`0–100`)                                                                 |
| `Tax Amount`                          | **Number**                 | Computed tax                                                                         |
| `Total`                               | **Number**                 | Grand total                                                                          |
| `Items JSON`                          | **Rich text**              | **Required for lossless round-trip** of line items & snapshot                        |
| `Client Snapshot`                     | **Rich text**              | Frozen JSON copy of client billing details                                           |
| `Notes`                               | **Rich text**              | Optional client-facing notes                                                         |
| `Payment Terms`                       | **Rich text**              | Bank / transfer instructions                                                         |
| `Kind`                                | **Select**                 | Optional (`Invoice` vs `Client`) if using single-DB mode without `NOTION_CLIENTS_ID` |

#### Optional `NOTION_CLIENTS_ID` Properties

If you prefer a dedicated Clients database instead of single-DB fallback:

| Property Name      | Notion Type                |
| ------------------ | -------------------------- |
| `Name`             | **Title**                  |
| `Company`          | **Rich text**              |
| `Email`            | **Email**                  |
| `Phone`            | **Phone** _(or Rich text)_ |
| `Billing Address`  | **Rich text**              |
| `Default Currency` | **Select**                 |
| `Notes`            | **Rich text**              |
| `Payload JSON`     | **Rich text**              |

#### Optional `NOTION_INVOICE_SETTINGS_PAGE_ID`

Share an empty Notion page with your invoice integration and set `NOTION_INVOICE_SETTINGS_PAGE_ID`. Saving defaults in the **Settings** tab writes a single JSON code block to that page; otherwise defaults are read from `INVOICE_*` in `.env.local`.

---

## 6. Content Insights Studio (`/insights`) & Telegram Topic Routing

For setting up the **Content Insights** studio (`⌘⇧A`), ad-blocker-resilient Firebase Realtime Database read counters, inline comment moderation, and per-topic Telegram group routing (`TELEGRAM_TOPIC_*`), see [`docs/engagement-and-insights.md`](./engagement-and-insights.md).
