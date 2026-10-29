# V3 content enhancements — application and audit notes

## Scope and baseline

Prepared against `prasad-kmd/pm-web_v3` commit
`49ed47621f790c5a8fb99b87a6bd7b9117b499b1`.
Only v3 was cloned. No v1/v2 repositories or licensed-library downloads were used.

**TOTP and admin authentication are unchanged.** Existing optional TOTP support
remains exactly as it was. No authentication migration, enrollment, recovery,
rate-limit changes, or new security configuration has been implemented.

## Apply the ZIP

1. Commit or back up your local work first.
2. Extract the archive into the repository root, preserving paths and replacing
   matching files. There are no file deletions or dependency/lockfile changes.
3. If your branch has moved past the baseline, review conflicts before replacing
   whole files. The archive contains complete files, not a Git patch.
4. Keep your existing secrets in `.env.local` / deployment settings. The provided
   `.env.example` contains placeholders, not credentials.
5. **Before a production build, set `NEXT_PUBLIC_SITE_URL` to your real public
   HTTPS origin**, without a path. For example, use your actual deployed domain,
   not localhost or the documentation's example domain. Missing, malformed,
   non-HTTPS, or localhost production origins now produce a configuration error.
   Set this variable at build time, not only when starting the built app.
6. Install with your supported pnpm version, then run `pnpm typecheck` and
   `pnpm build` in your environment. Node/pnpm compatibility still follows the
   project's existing toolchain requirements.

## Implemented

### Reader controls

- Scroll-to-top appears after one visible scroll-container height.
- Uses the current reader's `.window-body`, with a document-scroll fallback.
- Moves keyboard focus to the article heading before hiding the control.
- Respects reduced motion and avoids the reader footer.

### Toggle lists and callouts

- Native `details/summary` retains keyboard operation and no-JavaScript disclosure.
- Visible chevrons, hover/focus states, indentation and nested-content guides.
- Direct-child open selectors prevent nested toggles from rotating parent icons.
- Callouts render native emoji, external image icons, and Notion file icons.
- Unsupported icon types retain the text-only callout. Custom-emoji payloads are
  not implemented in this change.
- The image endpoint's new `source=icon` mode is limited to callout blocks in
  published pages. Existing collection, page and block-membership checks remain.
- File icon URLs are retrieved afresh through the existing Notion asset path.

### Images and diagrams

- Shared viewport-level modal uses Animate UI's Base UI Dialog primitive.
- Focus trapping/restoration, Escape, visible close and optional browser fullscreen.
- Image gallery includes marked page-cover and body-image figures in DOM order,
  including images nested in content. Avatars and callout icons are excluded.
- Click, Enter or Space opens images; arrows/buttons navigate within the page.
- Image zoom ranges from fit view to 400%; scrollbars expose enlarged content.
- Captions, image counts and failed-image messages are provided.
- The generated OG cover can open its original image endpoint rather than only
  the responsive Next.js thumbnail.
- Mermaid has an expanded view, fit/reset, 25–400% zoom and source copying.
- SVGs receive real layout dimensions so zoomed edges remain scroll-reachable.
- Scoped SVG IDs prevent references colliding between inline and expanded views.
- Browser fullscreen is progressive enhancement: if unavailable or denied, the
  wide modal remains usable. Escape may first exit browser fullscreen; close or
  a subsequent Escape returns to the article.
- Zoomed diagrams/images are panned with scrollbars, trackpad or touch scrolling;
  no separate drag-to-pan or pinch-gesture library was added.

### Code blocks

- Existing Animate UI/Shiki composition is preserved.
- Code content is capped at 320px by default; an overflow-aware expand/collapse
  action appears outside the code scroller.
- Wrap toggle defaults off. Numbered continuation lines retain their gutter.
- Copy always uses the complete original source.
- Short blocks do not acquire unnecessary expand controls.
- Existing typing is not started for reduced-motion users or initially oversized
  blocks. Collapse brings an offscreen block start back into view when needed.

## SEO/OG audit and changes

### Existing strengths retained

Canonical collection/detail URLs, dynamic OG cards, sitemap generation, public
feeds, publication filtering, detail/breadcrumb JSON-LD, and utility-page noindex
metadata already existed. They were not replaced with parallel systems.

### Corrected

- Explicit homepage canonical; production origin configuration now fails clearly
  instead of silently publishing localhost URLs.
- Root OG URL, site name, locale, image alt and consistent description.
- Explicit collection/detail/static-page social metadata, including Twitter text
  rather than inheriting unrelated root defaults.
- Validated publication/modification dates for content OG and JSON-LD.
- Resume OG URL/alt and consistent page/social descriptions.
- Missing-entry metadata gets noindex; existing detail rendering still determines
  the actual not-found or temporary-unavailable response.
- Structured-data image uses the same durable generated share-image URL as OG;
  an existing cover, when present, remains part of that card.
- Robots allows utility-page fetching so crawlers can read their existing noindex
  directives. Those pages stay out of the sitemap. API crawling restrictions and
  explicit OG/image allowances remain. Robots rules are not authorization.

### Reviewed without further changes

- OG route already has cache headers, no-store error responses, bounded text and
  constrained cover loading. Existing behavior was retained.
- Sitemap already uses encoded slugs, published indexes and valid modification
  dates. Existing behavior was retained.
- The root title template and existing article/social-card design were preserved.

### Deployment follow-ups / limits

- This is a source-level audit, not a live crawl or an indexing guarantee.
- Verify crawler-visible content on `/` and `/resume`: the existing DesktopOS
  client shell is responsible for these experiences. No separate SEO-only page,
  hidden keyword content or desktop-shell refactor was introduced.
- Inspect deployed HTML for canonical, robots, OG/Twitter tags and JSON-LD;
  test a public content URL in social-sharing debuggers and a structured-data tool.
- Check real Notion file icons and images using published fixtures; no workspace
  credentials or live private content were needed for this implementation.
- Use descriptive Notion image captions: uncaptioned body images retain the
  existing generic fallback alt description.
- Social platforms and CDNs may retain older previews until refreshed.

## Validation performed

- Frozen-lockfile dependency install succeeded with pnpm 10.34.9, disabling pnpm's
  automatic switch to the repo's pnpm 11 toolchain for this Node 20 sandbox.
- `tsc --noEmit` passed after the changes.
- Changed TypeScript/TSX/CSS files were formatted with the installed Prettier.
- `git diff --check` passed.
- A scoped Git diff confirmed admin API/authentication files were unchanged.
- Full production build, browser interaction tests, screen-reader testing and
  live Notion/social-crawler validation were not run. Please verify them locally.

## Suggested quick acceptance checks

- Open a long entry inside a small and maximized desktop window. Scroll-to-top
  should affect only that window and leave other windows untouched.
- Open nested toggles by keyboard and pointer; verify independent chevrons.
- Test emoji, external-file, Notion-file and absent callout icons.
- Open cover/body/nested images; check next/previous, zoom, Escape, focus return,
  failure handling, light/dark themes and narrow screens.
- Expand two Mermaid diagrams independently; inspect labels/arrows, fit/reset,
  zoom edges, source-copy and browser-fullscreen fallback.
- Test short/long code, very long wrapped lines, copy, expand/collapse and reduced
  motion. Resize the window with wrapping enabled.
- Verify public metadata and utility-page noindex using your real deployment URL.
