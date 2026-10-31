# Notion CMS setup

## 1. Integration and databases

Create a Notion integration with read access and share each source database with it. Copy `.env.example` to `.env.local`; **never commit this file or expose the integration token in a browser**.

- Set `NOTION_API_KEY` (or `NOTION_AUTH_TOKEN` / `NOTION_API_TOKEN`) to the integration secret.
- Set `NOTION_PROJECTS_ID`, `NOTION_BLOG_ID`, `NOTION_ARTICLES_ID`, `NOTION_TUTORIALS_ID`, `NOTION_GLOSSARY_ID` and `NOTION_NEWS_ID` to their database IDs or Notion data-source IDs. `NOTION_PROJECTS_DATABASE_ID` and `NOTION_WIKI_ID` are legacy aliases for projects and glossary.
- Optionally set `NOTION_AUTHORS_ID` to a shared authors database. The first author relation is used; without this setting the content still loads without author details.
- `NOTION_PUBLISHED_STATUS` defaults to `Published` (case-insensitive); `NOTION_API_VERSION` defaults to `2026-03-11`. Use a version supported by your integration and SDK.
- Set `NEXT_PUBLIC_SITE_URL` to the production origin (for example, `https://example.com`) for canonical URLs, feeds and OG metadata. Without it these use `http://localhost:3000`.

Each content database needs a Notion **Title** property and a **Status** or **Publication status** property whose value matches `NOTION_PUBLISHED_STATUS`. Drafts, missing-status items, archived pages and pages in the trash are excluded. Recommended optional properties:

| Property | Accepted aliases / purpose |
| --- | --- |
| Slug | `URL Slug`; otherwise the title is slugified. Keep slugs unique within each collection. |
| Description | `Summary` / `Excerpt`; short introduction and search/SEO description. |
| Date | `Published date` / `Publication date`; falls back to created/edited time. |
| Categories | `Category`; select, multi-select or text for filters and related entries. |
| Tags | `Keywords`; searchable topics. |
| Technical | `Technology`; searchable technical topics. |
| Thumbnail | Image/file or URL; also used as the page image when present. `Cover image`, `Image` and the page cover are alternatives. |
| Authors | `Author` relation to the optional authors database; first relation is used. |
| RTime | `Reading time` / `Read time`, numeric minutes; otherwise estimated from body blocks. |
| AIAssisted | `AI Assisted` / `AI-assisted`, checkbox. |

**News** needs only **Title**, **Status**, **Date** and (optionally) **Ai Assisted**. It has no slug property, so story URLs are the slugified title: editing a published title changes its URL. If two published stories share a title, the older one keeps the plain URL and the newer one gets a short ID suffix. News is listed as a dated feed (grouped by month, with a month archive in the sidebar) instead of the grid/list library, and its reader ends with a **Links in this story** list built from the links in the body.

Authors may use `Name`/title, `Role`, `Biography`, `Avatar`, and `Status`. An author with no status is allowed; if a status is provided it must match the published status. The integration must be shared with the authors database as well.

## 2. Content and reader

Published entries appear at `/projects`, `/blog`, `/articles`, `/tutorials`, `/glossary` and `/news`, and at `/{collection}/{slug}`. Indexes fetch all pages with pagination, then filter, sort and paginate the published set server-side. The reader supports nested block children (up to five levels), headings, text formatting, lists, quotes, callouts, toggles, tables, files, images, code, equations, YouTube links and supported embeds. Syntax highlighting uses Shiki; equations use KaTeX. A code block whose API language is `mermaid` renders as a Mermaid diagram. Unsupported block types may not render.

Use a **single paragraph block** for the following v2-style shortcodes:

```text
[button href="https://example.com"]Open project[/button]
```

```text
[tabs][tab title="Overview"]Markdown **here**.[/tab][tab title="Details"]More content.[/tab][/tabs]
```

```text
[quiz]{"title":"Quick check","questions":[{"question":"Two plus two?","options":["3","4"],"answer":1,"explanation":"Two plus two is four."}]}[/quiz]
```

### Inline links

Inside any text (paragraphs, headings, list items, quotes, callouts, toggles, table cells and captions, in every collection) this renders as a normal link:

```text
[link href="https://example.com"] Example Website [/link]
```

- Spaces around the label are trimmed; formatting on the label (bold, italic, …) is kept, even when it splits the text into several Notion segments.
- Straight, curly (`“…”`) or single quotes, an unquoted address, extra spaces and any letter case are accepted.
- Only `http`, `https`, `mailto`, `tel`, site-relative (`/…`) and `#anchor` addresses become links; anything else shows the label as plain text.
- An unclosed tag is left as written, so it's easy to spot. Code blocks and inline code are never converted.
- Headings in the outline, reading time and search use only the label.

Redirect wrappers are removed from every link, including normal Notion links: `https://www.google.com/url?q=https://example.org/page&sa=E&source=…` becomes `https://example.org/page`.

Quiz answers are zero-based indexes. GitHub-style `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]` and `[!CAUTION]` alerts at the start of a paragraph or quote are supported. Links and markdown are sanitized; Mermaid uses strict security mode. Reading preferences, bookmarks and quiz progress are stored in the visitor's browser, not on a server. There is no authentication or comment system.

## 3. Cache and assets

Notion API reads use approximately one-hour caching; newly published edits or unpublishing can therefore take up to that long to be reflected without an explicit refresh. The signed-in **Refresh content** action calls `/api/admin/cache/purge`, which invalidates the shared Notion data tag and revalidates the public collection indexes, taxonomy indexes, latest/search APIs, readership-count endpoint, feeds, `llms.txt`, and sitemap. The revalidation is on-demand; verify the affected route after a refresh, and allow for stale-while-revalidate behavior on a first request. Page indexes, sitemap, RSS and llms.txt all use the published index. An unavailable/misconfigured collection reports an unavailable state instead of incorrectly claiming the slug does not exist; a missing slug in a healthy configured collection returns 404.

Notion-hosted page and block assets use `/api/notion-image` to retrieve a fresh short-lived URL. It verifies that the page is in the published collection and, for blocks, that the block belongs to that published page. Keep its route publicly reachable for readers and social crawlers. Do not use a cache that stores the temporary redirect longer than the source URL's expiry. External media domains may need additions to `next.config.mjs` Content Security Policy.
