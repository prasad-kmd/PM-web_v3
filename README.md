# PM Web v3 — Desktop Workspace

A personal engineering portfolio presented as an interactive desktop workspace. Built with Next.js 16, Tailwind CSS v4, Base UI, Coss-style components, Animate UI, and Motion.

## Features

- **Desktop workspace** — draggable, resizable, focusable native windows, desktop shortcuts, menus, wallpapers and locally persisted layouts.
- **Notion publishing and taxonomy** — six published collections (projects, blog, articles, tutorials, glossary and news), rich readers, search, and global category/tag browsing across every collection.
- **Reading and engagement** — guest comments with moderation, aggregate readership counts, local bookmarks, reader preferences and collection view choices.
- **Contact and legal** — a Turnstile-protected contact form with server-side Telegram forwarding, canonical Privacy Policy, Terms and Disclaimer pages, a cookie notice, and matching privacy controls in Settings.
- **Installable PWA and boot sequence** — a mandatory coloured-logo boot on eligible hard opens of the home page, a native web app manifest, safe-area app icons, conservative offline caching for visited public pages, a non-forced update prompt, and install actions on the desktop and in Settings.
- **Discovery** — per-page Open Graph images for entries, legal documents and taxonomy pages; sitemap; robots; RSS (`/feed.xml` and `/rss.xml`); and `/llms.txt` covering pages, legal documents, taxonomy topics and published entries.
- **Owner tools** — authenticated administrative utilities, including content insights, OG Studio and invoice tools. Visitors do not need accounts to read or comment.
- **Recovery surfaces** — window-styled loading, not-found and error states, an offline fallback, plus independent global recovery.

## Run locally

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:3000`. The repository declares `pnpm@11.9.0`, which requires Node 22.13+; use a pnpm version supported by your local Node if needed.

Set up the Notion integration and collections using [Notion CMS setup](docs/notion-cms-setup.md). See [Contact and deployment](docs/contact-and-deployment.md) for Telegram, Turnstile, crawler routes, operational limitations and production checks, and [PWA and boot](docs/pwa-and-boot.md) for the boot triggers, service-worker cache policy, install flow, updates and rollback. Environment secrets belong in `.env.local` or the host's secret store, not in the repository.

## Controls

- **Right-click / long-press**: open the desktop context menu.
- **Double-click titlebar**: maximize or restore.
- **Drag titlebar**: reposition a window; drag to the top or side edges to maximize or snap.
- **Window controls**: use the top-right maximize/restore or close buttons.

The project retains its original license; see [LICENSE](LICENSE).
