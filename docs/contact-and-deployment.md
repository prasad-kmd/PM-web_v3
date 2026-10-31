# Contact and deployment

## Contact setup

Set these environment variables in your hosting provider, never in the repository:

- `TELEGRAM_TOKEN`: Telegram bot token.
- `TELEGRAM_CHAT_ID`: chat (or Forum Supergroup `-100…` ID) that should receive submissions. Start the bot and grant it permission to send to that chat.
- `TELEGRAM_TOPIC_CONTACT`, `TELEGRAM_TOPIC_COMMENTS`, `TELEGRAM_TOPIC_AUTH`, `TELEGRAM_TOPIC_SYSTEM` _(optional)_: integer `message_thread_id` values when `TELEGRAM_CHAT_ID` is a Telegram group with **Topics** enabled (see [`docs/engagement-and-insights.md`](./engagement-and-insights.md)).
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`: public Cloudflare Turnstile site key for your deployed domain.
- `TURNSTILE_SECRET_KEY`: matching **server-only** Turnstile secret.

The form fails closed in production if the server secret is missing or verification fails. A missing public site key disables the form and shows the direct email link. Development falls back to Cloudflare's public always-pass test keys when keys are not supplied; use real keys in production.

Name, email, subject and message are required; phone and one PDF, PNG, JPEG or TXT attachment are optional. Attachment size is capped at 8 MiB, and the complete request at 10 MiB. The server validates text, file type and basic file signatures, rejects known disposable addresses and profane content using the same style of checks as v2, checks a honeypot and verifies Turnstile before forwarding. If Telegram receives the text but the attachment fails, a toast reports partial success: send the file separately rather than retrying the whole message blindly.

A best-effort limit of three submissions per minute per IP is held **in memory per server instance**. It is not a distributed rate limiter, is lost on restart and depends on trustworthy proxy IP headers. Configure host/platform-level rate limiting or a shared store for stronger production protection. No Telegram secret is sent to the client. The form is a contact channel, not authentication.

### Email address

The email address appears **only on the contact page**, under “Prefer email?”. Visitors click **Show email address**, Turnstile runs (invisible unless Cloudflare needs an interaction) and the page fetches the address from `POST /api/contact/email`. That route verifies the token, applies its own rate limit (5 per minute per IP, separate from the form's 3) and returns the address with `Cache-Control: no-store`. The address lives in the server-only `lib/contact/email.ts` (override it with `CONTACT_EMAIL`), so it never appears in page HTML, RSS, `llms.txt` or client JavaScript.

Everywhere else links to the contact page instead: the resume, Spotlight (“Contact Prasad”), Notepad and the AI-assisted dialog. The dialog's “Send a correction” opens `/contact?subject=Correction: …` with the subject filled in. `contactHref(subject)` in `lib/site.ts` builds these links. If a Notion entry links to or mentions the address, the renderer turns it into a link to the contact page.

## Discovery and routing

`/sitemap.xml`, `/robots.txt`, `/llms.txt`, `/feed.xml`, and the compatible `/rss.xml` derive their content from published collections. The sitemap also includes the canonical legal routes, the category/tag indexes and taxonomy terms with at least two published entries; singleton term pages remain reachable but are `noindex, follow` and stay out of the sitemap. `/llms.txt` lists the core pages, legal documents, indexable category/tag topics and every published entry by collection; if any collection or the taxonomy index is incomplete, it is served `no-store` rather than cached as a partial index. Robots generally allow crawlers, disallow utility/private API paths, and explicitly allow public OG and Notion-image routes.

`/api/og` generates 1200×630 per-page images (Node runtime; fonts and wallpapers are read from `public/og/` and traced into the function via `outputFileTracingIncludes`). The default design is **Editorial split**; set `OG_STYLE=window` (or pass `?style=window`) to switch to the **Desktop window** design. Legal pages use the dedicated `legal` type with the policy version and effective date; taxonomy indexes and terms use `categories`/`tags`, and term images receive their published-entry count through the `count` query value. Entry covers are only accepted as same-origin `/api/notion-image?…` paths (3 s timeout, PNG/JPEG ≤ 4 MB) and fall back to the type's wallpaper. It does not use `og-custom`.

The application root provides server-rendered collection surfaces for search engines and no-JavaScript reading before handing off to the existing native window manager. Inactive routed windows use inert visual snapshots and re-render their real route when focused; URLs, content and metadata follow the active window. Form state in an inactive routed window may be reset when it is re-opened. Bookmarks and reading settings are local to the browser.

Production keeps the existing `X-Frame-Options: DENY` header. It is omitted in development only so the development server can be shown in an embedded workspace preview.

## Deploy and validate

Use Node 22.13+ and the repository-pinned pnpm 11.9.0. Configure `.env.local` (or the host's secret store), then run:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
pnpm start
```

Production builds require `NEXT_PUBLIC_SITE_URL` to be the public HTTPS origin. The PWA is enabled by default in production; set `NEXT_PUBLIC_PWA=off` only when using the rollback procedure in [PWA and boot](./pwa-and-boot.md).

Before promoting a deployment, smoke-test `/`, one entry from each collection, `/categories`, one term page, `/legal` and each legal document, `/contact`, `/sitemap.xml`, `/robots.txt`, `/llms.txt`, `/feed.xml`, `/manifest.webmanifest` and `/sw.js`. Verify Back/Forward, multiple-window focus, same-collection navigation, resized windows, mobile layout, JavaScript-disabled reading, a real contact submission (including Turnstile and Telegram delivery), representative OG images in both styles, and the PWA/offline checklist in [PWA and boot](./pwa-and-boot.md).

### The static rendering model

Public routes are **statically generated** and revalidated on a one-hour window
(`revalidate = 3600`), with an on-demand purge from
`/api/admin/cache/purge`. The build output is the source of truth for what is
static:

| Symbol | Meaning                                                    |
| ------ | ---------------------------------------------------------- |
| `○`    | Statically generated at build time and served from the CDN |
| `●`    | Statically generated with a revalidation window (ISR)      |
| `ƒ`    | Rendered per request by a function                         |

**Expected:** every public page route is `○` or `●`. The only `ƒ` routes are
`/insights`, `/invoices` and `/og-studio` (they read the owner session cookie
on every request and are owner-only, so their traffic is effectively zero) and
the small set of API routes that must stay live — `/api/admin/session`,
`/api/comments`, `/api/contact`, `/api/system` and `/api/reader/pulse`.

**Origin behaviour:** a static or ISR route costs a CDN read. A repeat request
returns the `x-vercel-cache: HIT` header and consumes no Active CPU and no
origin transfer. `MISS` means it was rendered on demand.

**Owner studios are stealth 404s.** Signed out, `/insights`, `/invoices` and
`/og-studio` return a genuine **404** with the site's own not-found surface —
never a login prompt and never any studio markup. See
[Owner Workstation Suite Setup](./admin-suite-setup.md).

**Notion images** are resolved through `/api/notion-image`, which returns a
**307 redirect** to a signed Notion URL. The redirect is edge-cached for 15
minutes (`s-maxage=900`) with a 5-minute stale-while-revalidate window, and the
Notion API response behind it is cached for the same period. Notion signed
URLs are valid for about an hour, so the cached redirect always expires well
before the URL it points at does.

**Environment:** production builds require `NEXT_PUBLIC_SITE_URL` to be the
public HTTPS origin — the origin is baked into every prerendered page, the
canonical tags, the sitemap and the OG image URLs, so the build fails fast
rather than publishing a wrong canonical. Preview deployments fall back to the
origin Vercel assigns them, so a preview builds without the variable.

## Animation and icons

Project components import animation primitives from `motion/react` and use the existing `@hugeicons` packages for icons. `framer-motion` remains a transitive dependency of `motion`, but is not a direct dependency or imported directly. `lucide-react` is not required. After the migration, TypeScript and an offline frozen-lockfile install passed; the selected Hugeicons exports, Motion exports and accessible spinner were checked in isolation. Browser testing was not repeated.

## Development routes

There are none. The former `/dev/states` preview — which rendered the loading, not-found and error screens with sample data — has been removed along with its stylesheet, so `ENABLE_DEV_ROUTES` is no longer read anywhere and has been dropped from `.env.example`. The loading, not-found and error screens themselves are unchanged and are exercised through the real routes: a missing path renders the not-found state, and a failed request renders the error state.
