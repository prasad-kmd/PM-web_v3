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
- **Optional 2-step verification (TOTP):** Set `ADMIN_TOTP_SECRET=<BASE32_SECRET>` to require a 6-digit RFC 6238 authenticator code on the Workstation Lock Curtain.
- **Session cookie:** Issues `__Host-pm_admin` (`HttpOnly; Secure; SameSite=Strict; Path=/`) over HTTPS in production and `pm_admin` on `http://localhost`.

### Accessing the Suite in the UI

- **Visitors (signed out):** Clicking the top-left portrait in the 40px menu bar opens a clean profile menu (`About Prasad`, `Get in touch…`, `Copy workspace link`, and `Sign in…` / `⌘⇧L`).
- **Workstation Lock Curtain:** Selecting `Sign in…` or pressing `⌘⇧L` (`Ctrl+Shift+L` on Windows/Linux) lowers a frosted acrylic veil below the menu bar with **Username** and **Password** fields.
- **Signed-in Owner:** The profile portrait displays a subtle emerald status dot and unlocks:
  - **OG Image Studio** (`⌘⇧G`)
  - **Invoice Studio** (`⌘⇧I`)
  - **Refresh content** (invalidates cached CMS tags immediately via `/api/admin/cache/purge`)
  - **Sign out** (clears session cookies and closes open studio windows)

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
