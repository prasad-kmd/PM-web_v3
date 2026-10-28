# Contact and deployment

## Contact setup

Set these environment variables in your hosting provider, never in the repository:

- `TELEGRAM_TOKEN`: Telegram bot token.
- `TELEGRAM_CHAT_ID`: chat that should receive submissions. Start the bot and grant it permission to send to that chat.
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`: public Cloudflare Turnstile site key for your deployed domain.
- `TURNSTILE_SECRET_KEY`: matching **server-only** Turnstile secret.

The form fails closed in production if the server secret is missing or verification fails. A missing public site key disables the form and shows the direct email link. Development falls back to Cloudflare's public always-pass test keys when keys are not supplied; use real keys in production.

Name, email, subject and message are required; phone and one PDF, PNG, JPEG or TXT attachment are optional. Attachment size is capped at 8 MiB, and the complete request at 10 MiB. The server validates text, file type and basic file signatures, rejects known disposable addresses and profane content using the same style of checks as v2, checks a honeypot and verifies Turnstile before forwarding. If Telegram receives the text but the attachment fails, the UI reports partial success: send the file separately rather than retrying the whole message blindly.

A best-effort limit of three submissions per minute per IP is held **in memory per server instance**. It is not a distributed rate limiter, is lost on restart and depends on trustworthy proxy IP headers. Configure host/platform-level rate limiting or a shared store for stronger production protection. No Telegram secret is sent to the client. The form is a contact channel, not authentication.

### Email address

The email address appears **only on the contact page**, under “Prefer email?”. Visitors click **Show email address**, Turnstile runs (invisible unless Cloudflare needs an interaction) and the page fetches the address from `POST /api/contact/email`. That route verifies the token, applies its own rate limit (5 per minute per IP, separate from the form's 3) and returns the address with `Cache-Control: no-store`. The address lives in the server-only `lib/contact/email.ts` (override it with `CONTACT_EMAIL`), so it never appears in page HTML, RSS, `llms.txt` or client JavaScript.

Everywhere else links to the contact page instead: the resume, Spotlight (“Contact Prasad”), Notepad and the AI-assisted dialog. The dialog's “Send a correction” opens `/contact?subject=Correction: …` with the subject filled in. `contactHref(subject)` in `lib/site.ts` builds these links. If a Notion entry links to or mentions the address, the renderer turns it into a link to the contact page.

## Discovery and routing

`/sitemap.xml`, `/robots.txt`, `/llms.txt`, `/feed.xml`, and the compatible `/rss.xml` derive their content from published collections. Robots generally allow crawlers, disallow utility/private API paths, and explicitly allow public OG and Notion-image routes. `/api/og` generates 1200×630 per-page images (Node runtime; fonts and wallpapers are read from `public/og/` and traced into the function via `outputFileTracingIncludes`). The default design is **Editorial split**; set `OG_STYLE=window` (or pass `?style=window`) to switch to the **Desktop window** design. Entry covers are only accepted as same-origin `/api/notion-image?…` paths (3 s timeout, PNG/JPEG ≤ 4 MB) and fall back to the type's wallpaper. It does not use `og-custom`.

The application root provides server-rendered collection surfaces for search engines and no-JavaScript reading before handing off to the existing native window manager. Inactive routed windows use inert visual snapshots and re-render their real route when focused; URLs, content and metadata follow the active window. Form state in an inactive routed window may be reset when it is re-opened. Bookmarks and reading settings are local to the browser.

Production keeps the existing `X-Frame-Options: DENY` header. It is omitted in development only so the development server can be shown in an embedded workspace preview.

## Apply and validate

The accompanying ZIP is an overlay for the v3 base revision named in `PATCH-APPLY.md`. Back up your working tree, extract the archive at the repository root (retaining paths), install with the updated lockfile, configure `.env.local`, and run `pnpm build` plus your normal tests. No file deletion is needed. Do not overlay a local secrets file.

This implementation passed TypeScript (`tsc --noEmit`); an initial development-server HTTP check returned 200 with server-rendered `/projects` content and a cross-origin contact request was rejected with 403. Isolated checks with mocked data covered Notion published-only filtering and pagination, nested blocks, listing filters and RSS escaping. The OG handler generated 1200×630 PNGs for both designs in a development server. The broader HTTP smoke check stalled in the constrained environment and was stopped. A production build, browser/window interaction, real Notion data, public metadata images, real RSS/sitemap content and live Telegram/Turnstile delivery **still require your validation**. In particular, verify Back/Forward, multiple window focus, same-collection navigation, resized windows, mobile layout, and behavior with JavaScript disabled.

## Animation and icons

Project components import animation primitives from `motion/react` and use the existing `@hugeicons` packages for icons. `framer-motion` remains a transitive dependency of `motion`, but is not a direct dependency or imported directly. `lucide-react` is not required. After the migration, TypeScript and an offline frozen-lockfile install passed; the selected Hugeicons exports, Motion exports and accessible spinner were checked in isolation. Browser testing was not repeated.

## Development routes

`/dev/states` previews the loading, not-found, error and global-error screens with sample data. It is available in development and returns 404 in production unless `ENABLE_DEV_ROUTES=1` is set; it is always `noindex`.
