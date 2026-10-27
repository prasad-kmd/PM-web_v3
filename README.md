# PM Web v3 — Desktop Workspace

A personal engineering portfolio presented as an interactive desktop workspace. Built with Next.js 16, Tailwind CSS v4, Base UI, Coss-style components, Animate UI, and Motion.

## Features

- **Desktop workspace** — draggable, resizable, focusable native windows, desktop shortcuts, menus and locally persisted layouts.
- **Notion publishing** — published projects, blog posts, articles, tutorials and a glossary, with searchable collections, rich readers, local bookmarks and reading preferences.
- **Contact app** — a Turnstile-protected contact form with server-side Telegram forwarding and an optional attachment.
- **Discovery** — per-page social images, sitemap, robots, RSS (`/feed.xml` and `/rss.xml`) and `/llms.txt`.
- **Recovery surfaces** — window-styled loading, not-found and error states, plus independent global recovery.

There is no comment system or user authentication.

## Run locally

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:3000`. The repository declares `pnpm@11.9.0`, which requires Node 22.13+; use a pnpm version supported by your local Node if needed.

Set up the Notion integration and collections using [Notion CMS setup](docs/notion-cms-setup.md). See [Contact and deployment](docs/contact-and-deployment.md) for Telegram, Turnstile, crawler routes, operational limitations and checks. Environment secrets belong in `.env.local` or the host's secret store, not in the repository.

## Controls

- **Right-click / long-press**: open the desktop context menu.
- **Double-click titlebar**: maximize or restore.
- **Drag titlebar**: reposition a window; drag to the top or side edges to maximize or snap.
- **Window controls**: use the top-right maximize/restore or close buttons.

The project retains its original license; see [third-party notices](THIRD_PARTY_NOTICES.md) for adapted upstream code and licensing considerations.
