# PWA and boot

This document describes the shipped home-page boot sequence and the conservative, dependency-free PWA. The two systems are deliberately coordinated: the boot overlay owns the first paint, while service-worker registration waits until the page has loaded, the browser is idle and boot has finished.

## Boot sequence

The opening animation is a mandatory brand sequence, not a loading preference. It uses the coloured PM logo, has no Skip action or opt-out, and creates no cookie or Web Storage key. An inline pre-paint script in `app/layout.tsx` decides the variant before the Desktop paints; `components/system/BootSequence.tsx` then hydrates and completes the same run.

| Opening path                                        | Result                                                      |
| --------------------------------------------------- | ----------------------------------------------------------- |
| Hard navigation to `/`                              | Full wordmark/status-dock sequence                          |
| Ordinary browser refresh of `/`                     | Short status-card sequence                                  |
| Installed-app launch or another `/?source=pwa` open | Full sequence, including after a reload from that start URL |
| Operating-system `prefers-reduced-motion: reduce`   | Short sequence; CSS suppresses the movement                 |
| Deep link whose first path is not `/`               | No boot overlay                                             |
| Back/Forward or bfcache restore                     | No replay                                                   |
| Client-side return to `/` in the same document      | No replay                                                   |

Initial runs are readiness-driven. They begin exiting as soon as Desktop reports ready; there is no artificial minimum hold. The component safety caps are 2.6 seconds for the full variant and 1.7 seconds for the short variant, followed by the normal exit fade. The pre-paint script has a last-resort 3.3/2.3-second failsafe so a hydration failure cannot leave the workspace permanently covered.

The **Preview boot sequence** action in Settings is different: because Desktop is already ready, it deliberately plays the normal timeline for 2.0 seconds (full) or 1.1 seconds (short/reduced-motion) before exiting. Preview is unavailable while the owner security lock is open.

While boot is playing or exiting, the Desktop is `inert`. The security lock has priority and immediately dismisses boot. The cookie notice, install hint and service-worker registration all wait for boot to finish so the opening screen is not stacked with unrelated prompts.

Relevant files:

- `app/layout.tsx` — pre-paint trigger and failsafe
- `components/system/BootSequence.tsx` — state machine, readiness exit and preview
- `lib/boot.ts` — shared timing constants and events
- `app/boot.css` — full/short layouts and reduced-motion behaviour

## Manifest and icons

`app/manifest.ts` generates `/manifest.webmanifest` using the site name and description from `lib/site.ts`.

- Start URL: `/?source=pwa`
- Scope and ID: `/`
- Display: `standalone`, falling back to `minimal-ui`
- Theme/background: `#1d1d1d`
- Shortcuts: Projects, Blog, Articles, Tutorials and Resume
- Main icons: 192 px, 256 px and 512 px `any` icons plus a separate 512 px maskable icon under `public/pwa/`
- Apple touch icon: `public/pwa/apple-touch-icon.png`

Window Controls Overlay is intentionally not requested because native controls would cover the workspace menubar and clock. There is no push subscription, Background Sync queue or Web Share Target.

Both `/manifest.webmanifest` and `/sw.js` are served with `Cache-Control: public, max-age=0, must-revalidate`; `/sw.js` also sends `Service-Worker-Allowed: /`.

## Registration and updates

`components/system/ServiceWorkerRegistrar.tsx` registers `/sw.js` only when all of these are true:

1. The app is running a production build.
2. `NEXT_PUBLIC_PWA` is not `off`.
3. The browser supports service workers in a secure context.

Registration waits for `window.load`, then an idle callback (with a one-second timer fallback), then the boot-done event. It uses scope `/`, a classic worker and `updateViaCache: "none"`.

The worker does **not** call `skipWaiting()` during install. When a new worker is waiting, the registrar shows a persistent **Workspace updated** toast. Nothing reloads until the visitor chooses **Reload**; only then does the page send `SKIP_WAITING`, wait for control to change and reload. Update checks also run hourly and, throttled to five minutes, when the page becomes visible again.

If a production build is deployed with `NEXT_PUBLIC_PWA=off`, the registrar instead unregisters this origin's root `/sw.js` worker and clears the `pm-*` caches on the next page visit.

## Cache policy

The worker is `public/sw.js`. Keep `SW_VERSION` there in sync with `PWA_CACHE_VERSION` in `lib/pwa.ts`. Activation deletes obsolete `pm-*` caches.

| Cache          | Contents                                                                            | Strategy/limit                                                                           |
| -------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `pm-core-v1`   | `/~offline`, manifest, Outfit font, favicon and core app icons                      | Essential-only precache; manifest is network-first                                       |
| `pm-static-v1` | Same-origin scripts, styles, workers, fonts and public `.json`/`.txt`/`.xml` assets | Cache-first; non-hashed files revalidate behind the cached response; maximum 160 entries |
| `pm-pages-v1`  | Public HTML documents the visitor has opened                                        | Network-first with a 6-second timeout, then cache, then `/~offline`; maximum 40 entries  |
| `pm-images-v1` | Public same-origin images shown on visited pages                                    | Stale-while-revalidate; maximum 80 entries                                               |

The root document is not precached, so the current Desktop, appearance cookies and boot decision are not frozen into an install-time shell. The installed start URL `/?source=pwa` is normalised to `/` when stored as a visited page.

The worker only handles same-origin `GET` requests. It does not handle or store:

- `/api/*`, including form, comment, readership and owner calls
- RSC, prefetch or Next data requests
- range requests or `/_next/image`
- `/bookmarks`, `/settings`, `/dev`, `/insights`, `/invoices` or `/og-studio` documents/cacheable subresources
- non-GET requests, failed/opaque responses, or responses outside the route-specific cacheability checks

Excluded document routes are network-only with the offline page as their failure response; they are not written to Cache Storage. An unvisited public document has no cached copy and therefore also receives `/~offline`.

Offline support is consequently document-based, not a promise that every in-app transition works without a network. A cached page can reopen when its document and required static assets are present, but live search, comments, readership pulses, forms and other API-backed actions still need the network. Soft-navigation RSC payloads are deliberately not cached.

## Install flow

`hooks/usePwaInstall.ts` is the single install-state store for the Desktop shortcut, Settings, the one-time hint and progress toasts. It captures Chromium's `beforeinstallprompt`, suppresses the mini-infobar and listens for `appinstalled` and display-mode changes.

- The first-position Desktop **Install app** shortcut appears only when the browser prompt is available, iOS manual guidance applies, or installation is already in progress. It is a real button so Chromium receives the user activation needed to open its prompt.
- Settings → About → **App & offline** always exposes the current install state/action and the offline-cache summary and clear control.
- The profile menubar has no install item.
- On iOS/iPadOS, controls that cannot invoke a native prompt explain **Share → Add to Home Screen**. Completion events and install-timing toasts are browser-dependent there.
- A quiet one-time hint can appear after 60 seconds on a first production visit or after 5 seconds on a return visit, once boot and the cookie notice are gone. Dismissal is remembered in `pm-pwa-install-hint-v1`, which is listed in the Privacy Policy storage register.
- When a Chromium prompt is accepted, a shared toast changes from **Installing workspace…** to **Workspace installed** if `appinstalled` arrives. If no completion event arrives before the hook's safety timeout, the loading toast is dismissed rather than left spinning.

In Settings, **Clear offline cache** deletes the `pm-*` caches and asks the active worker to restore only the essential core. **Reset preferences on this device** also removes visited offline pages and images. Neither action uninstalls the installed app or unregisters the worker; use the browser/OS app controls for that.

## Privacy and storage maintenance

The boot sequence adds no storage. The PWA adds the four Cache Storage names above and the install-hint local-storage key. `lib/legal.ts` imports those names into `STORAGE_REGISTER`, which drives both the Privacy Policy table and the Settings privacy surface.

Before shipping any change to storage behaviour:

1. Search for new cookies, `localStorage`, `sessionStorage`, Cache Storage and IndexedDB use.
2. Update `STORAGE_REGISTER` (and this document) in the same change.
3. If the purpose or scope materially changes, update the legal version/effective date and consider bumping `COOKIE_NOTICE_VERSION` so visitors see the notice again.
4. Confirm Settings reset/clear behaviour still matches the published text.

## Cache-version changes

Bump the cache version only when all existing `pm-*` caches should be purged together—for example after a cache-key or cached-document format change. Normal hashed-asset deployments do not need a bump.

1. Change `SW_VERSION` in `public/sw.js` and `PWA_CACHE_VERSION` in `lib/pwa.ts` to the same value.
2. Check the generated cache names in `lib/legal.ts`; they update from the shared constants.
3. Test with an existing installed worker. The new worker should wait, show the update toast, activate only after Reload, delete the old `pm-*` caches and precache the new core.
4. Remember that visitors who never accept Reload can remain on the old worker until all controlled tabs close. Do not design a migration that assumes immediate activation.

## Rollback and emergency kill switch

### Planned rollback

1. Set `NEXT_PUBLIC_PWA=off` in the production environment.
2. Redeploy.
3. Visit the site in a browser that has the worker. The registrar should unregister the root `/sw.js` worker and delete the `pm-*` caches.
4. Confirm in Application → Service Workers and Application → Storage that the registration and caches are gone.
5. Keep the setting in place until the replacement build has been validated. Removing it (or setting it to any value other than `off`) re-enables registration on later visits.

### Broken-worker recovery

Do not simply delete `/sw.js`: an installed worker can remain in control while its update URL returns an error. Replace `public/sw.js` at the same path with a temporary self-removing worker, deploy it, and leave it there long enough for affected browsers to fetch it:

```js
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith("pm-"))
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: "window" });
      await Promise.all(clients.map((client) => client.navigate(client.url)));
    })(),
  );
});
```

Also deploy with `NEXT_PUBLIC_PWA=off` so the page does not immediately register the kill worker again for new visitors. Restore the normal worker and environment setting only after the incident build has passed the checklist below.

## Operational checklist

### Boot

- Hard-open `/`: full logo sequence, no Desktop flash, exits when ready.
- Refresh `/`: short sequence. Reload `/?source=pwa`: full sequence.
- Enable OS reduced motion: short, effectively static sequence.
- Deep-link to an entry, use Back/Forward, then return to `/` client-side: no replay.
- Confirm the owner lock supersedes boot and Settings Preview plays its deliberate timeline.
- Confirm no boot cookie/local-storage key appears.

### Install and offline

- In a production Chromium profile, confirm the Desktop shortcut appears when installable and opens the native prompt; Settings performs the same action.
- Accept the prompt and confirm the installing/installed toast transition where the browser emits `appinstalled`.
- On iOS/iPadOS, confirm Share → Add to Home Screen guidance and standalone launch through `/?source=pwa`.
- Visit a public entry, go offline, reload it, and confirm the cached document/assets reopen. Open an unvisited page and confirm `/~offline`.
- Submit no form/comment while offline and expect it to be queued: there is intentionally no offline queue.
- Inspect Cache Storage and confirm no `/api/*`, Bookmarks, Settings or owner-tool content is present.
- Test **Clear offline cache** and **Reset preferences on this device** in Settings; visited pages/images should disappear while the essential core is restored.

### Update and rollback

- Deploy a changed worker to a controlled production-like environment with an existing registration. Confirm the **Workspace updated** toast and that no reload happens until Reload is chosen.
- After Reload, confirm the new worker controls the page and obsolete `pm-*` caches are removed.
- Deploy once with `NEXT_PUBLIC_PWA=off` and confirm unregistration/cache cleanup.
- Keep the emergency kill-worker procedure above available; do not test it first on the live origin.
