"use strict";

/*
 * Prasad M. Desktop Workspace service worker — Phase 4, Option A.
 *
 * Deliberately dependency-free and conservative, based on the useful v1
 * rules but without its single unbounded cache or cached home-page shell:
 * - document navigations are network-first and only public HTML is stored;
 * - hashed Next static assets and fonts are cache-first;
 * - public images are stale-while-revalidate;
 * - API, RSC/prefetch, owner-studio and other private/dynamic surfaces are
 *   never intercepted for cache storage.
 *
 * The site now serves its public pages as static output with a one-hour ISR
 * window, so a network-first navigation usually resolves at the CDN without
 * touching an origin function. The worker's own document cache is therefore an
 * OFFLINE copy, not a freshness layer: a copy that has outlived the ISR
 * window is served with RFC 9111's `Warning: 110` so it can never be mistaken
 * for a current one.
 *
 * Keep SW_VERSION in sync with PWA_CACHE_VERSION in lib/pwa.ts. Bump it only
 * when old pm-* caches must be purged as a group.
 */
const SW_VERSION = 3;
const CORE_CACHE = `pm-core-v${SW_VERSION}`;
const STATIC_CACHE = `pm-static-v${SW_VERSION}`;
const PAGES_CACHE = `pm-pages-v${SW_VERSION}`;
const IMAGES_CACHE = `pm-images-v${SW_VERSION}`;
const CURRENT_CACHES = new Set([
  CORE_CACHE,
  STATIC_CACHE,
  PAGES_CACHE,
  IMAGES_CACHE,
]);

const OFFLINE_URL = "/~offline";
const NAVIGATION_TIMEOUT_MS = 6000;
/**
 * The site's ISR window. A document copy older than this is no longer
 * "current" and is served with a `Warning: 110` header when it is used
 * offline (RFC 9111 §5.5).
 */
const DOCUMENT_FRESHNESS_MS = 60 * 60 * 1000;
const CACHE_LIMITS = {
  [STATIC_CACHE]: 160,
  [PAGES_CACHE]: 40,
  [IMAGES_CACHE]: 80,
};

const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/fonts/outfit-latin-variable.woff2",
  "/favicon-pm.svg",
  "/pwa/icon-192.png",
  "/pwa/icon-512.png",
  "/pwa/icon-maskable-512.png",
  "/pwa/apple-touch-icon.png",
];

const NEVER_CACHE_PATHS = [
  "/api",
  "/bookmarks",
  "/insights",
  "/invoices",
  "/og-studio",
  "/settings",
];
// "/api" covers "/api/notion-image" as well: its 307 redirect is cached by
// the browser and the CDN with its own s-maxage, and the worker must not
// hold a second copy of a signed Notion URL that expires in 60 minutes.

const STATIC_FILE_PATTERN = /\.(?:css|js|mjs|woff2?|ttf|otf)$/i;
const IMAGE_FILE_PATTERN = /\.(?:avif|gif|ico|jpe?g|png|svg|webp)$/i;
const TEXT_FILE_PATTERN = /\.(?:json|txt|xml)$/i;

function isPathOrChild(pathname, prefix) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isNeverCachePath(pathname) {
  return NEVER_CACHE_PATHS.some((prefix) => isPathOrChild(pathname, prefix));
}

function isRscOrPrefetch(request, url) {
  const purpose =
    request.headers.get("purpose") || request.headers.get("sec-purpose") || "";
  return (
    url.pathname.startsWith("/_next/data/") ||
    url.searchParams.has("_rsc") ||
    request.headers.has("rsc") ||
    request.headers.has("next-router-state-tree") ||
    request.headers.has("next-router-prefetch") ||
    /prefetch/i.test(purpose)
  );
}

function isCacheableResponse(response, { allowNoStore = false } = {}) {
  if (!response || !response.ok) return false;
  if (response.type !== "basic" && response.type !== "default") return false;

  const cacheControl = response.headers.get("cache-control") || "";
  // Next marks its cookie-personalised public documents private/no-store
  // even though the only server-read cookies are appearance preferences.
  // The navigation handler may therefore opt in explicitly; its path
  // denylist above remains the boundary for owner/dynamic surfaces.
  if (!allowNoStore && /\b(?:no-store|private)\b/i.test(cacheControl)) {
    return false;
  }
  if ((response.headers.get("vary") || "").trim() === "*") return false;
  return true;
}

function isHtmlResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  return !contentType || /text\/html/i.test(contentType);
}

function normalizedPageKey(url) {
  const key = new URL(url.toString());
  key.hash = "";
  // The installed app starts at /?source=pwa; store it as the same home
  // document as / so either entry can be reused offline.
  if (key.searchParams.get("source") === "pwa") {
    key.searchParams.delete("source");
  }
  return key.toString();
}

async function trimCache(cacheName, maxEntries) {
  if (!maxEntries) return;
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  const excess = keys.length - maxEntries;
  if (excess <= 0) return;
  await Promise.all(keys.slice(0, excess).map((key) => cache.delete(key)));
}

async function putInCache(cacheName, request, response) {
  try {
    const cache = await caches.open(cacheName);
    // Delete first so a refreshed entry moves to the newest end of the
    // Cache API's insertion order before the simple cap is applied.
    await cache.delete(request);
    await cache.put(request, response);
    await trimCache(cacheName, CACHE_LIMITS[cacheName]);
  } catch {
    // Quota and opaque-storage failures must never break the response.
  }
}

async function fetchWithTimeout(request, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(request, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function precacheCore() {
  const cache = await caches.open(CORE_CACHE);

  const offlineResponse = await fetch(
    new Request(OFFLINE_URL, {
      cache: "reload",
      credentials: "same-origin",
    }),
  );
  if (!offlineResponse.ok) {
    throw new Error(`Could not precache ${OFFLINE_URL}`);
  }
  await cache.put(OFFLINE_URL, offlineResponse.clone());

  await Promise.allSettled(
    PRECACHE_URLS.filter((url) => url !== OFFLINE_URL).map(async (url) => {
      const response = await fetch(
        new Request(url, {
          cache: "reload",
          credentials: "same-origin",
        }),
      );
      if (isCacheableResponse(response)) {
        await cache.put(url, response.clone());
      }
    }),
  );
}

async function getOfflineResponse() {
  const cached = await caches.match(OFFLINE_URL, { ignoreSearch: true });
  if (cached) return cached;

  return new Response(
    "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><title>Offline · Prasad M.</title></head><body style=\"font-family:Arial,sans-serif;background:#1d1d1d;color:#f5f5f5;padding:32px\"><h1>You're offline</h1><p>This page isn't available offline yet. Reconnect and try again.</p><p><a style=\"color:#fff\" href=\"/\">Open home</a></p></body></html>",
    {
      status: 503,
      statusText: "Offline",
      headers: { "Content-Type": "text/html; charset=utf-8" },
    },
  );
}

/** Age of a stored document, in milliseconds, from its `Date` header. */
function documentAgeMs(response) {
  const stamp = Date.parse(response.headers.get("date") || "");
  if (!Number.isFinite(stamp)) return null;
  return Math.max(0, Date.now() - stamp);
}

/**
 * Marks a document copy that has outlived the ISR window as stale, so an
 * offline reader (or an operator reading the headers) can tell that this is
 * a cached copy rather than the current page.
 */
function withStaleWarning(response, ageMs) {
  if (ageMs === null || ageMs <= DOCUMENT_FRESHNESS_MS) return response;
  const headers = new Headers(response.headers);
  headers.set("Warning", '110 - "Response is stale"');
  headers.set("X-PM-Cache-Age", String(Math.round(ageMs / 1000)));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function networkFirstNavigation(event, request, url) {
  try {
    const response = await fetchWithTimeout(request, NAVIGATION_TIMEOUT_MS);
    if (
      isCacheableResponse(response, { allowNoStore: true }) &&
      isHtmlResponse(response)
    ) {
      const cacheKey = normalizedPageKey(url);
      event.waitUntil(
        putInCache(PAGES_CACHE, cacheKey, response.clone()),
      );
    }
    return response;
  } catch {
    const pages = await caches.open(PAGES_CACHE);
    const cached =
      (await pages.match(normalizedPageKey(url))) ||
      (await pages.match(request, { ignoreSearch: true }));
    if (!cached) return getOfflineResponse();
    return withStaleWarning(cached, documentAgeMs(cached));
  }
}

async function networkOnlyNavigation(request) {
  try {
    return await fetch(request);
  } catch {
    return getOfflineResponse();
  }
}

async function revalidateStatic(request) {
  try {
    const response = await fetch(request);
    if (isCacheableResponse(response)) {
      await putInCache(STATIC_CACHE, request, response.clone());
    }
    return response;
  } catch {
    return undefined;
  }
}

async function cacheFirstStatic(event, request, url) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) {
    // Next's hashed build assets are immutable. Versionless public files and
    // fonts are refreshed behind the cached response.
    if (!url.pathname.startsWith("/_next/static/")) {
      event.waitUntil(revalidateStatic(request));
    }
    return cached;
  }

  const response = await fetch(request);
  if (isCacheableResponse(response)) {
    event.waitUntil(putInCache(STATIC_CACHE, request, response.clone()));
  }
  return response;
}

async function staleWhileRevalidate(event, request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then(async (response) => {
      if (isCacheableResponse(response)) {
        await putInCache(cacheName, request, response.clone());
      }
      return response;
    })
    .catch(() => undefined);

  event.waitUntil(networkPromise);
  if (cached) return cached;

  const networkResponse = await networkPromise;
  if (networkResponse) return networkResponse;
  throw new Error("Network unavailable and no cached response exists");
}

async function networkFirstManifest(event, request) {
  try {
    const response = await fetch(request);
    if (isCacheableResponse(response)) {
      event.waitUntil(putInCache(CORE_CACHE, request, response.clone()));
    }
    return response;
  } catch {
    const cache = await caches.open(CORE_CACHE);
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    throw new Error("Manifest unavailable offline");
  }
}

self.addEventListener("install", (event) => {
  // Do not skipWaiting() here. An update stays waiting until the visitor
  // accepts the explicit "Workspace updated — Reload" action.
  event.waitUntil(precacheCore());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith("pm-") && !CURRENT_CACHES.has(name))
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  const type = event.data?.type;
  if (type === "SKIP_WAITING") {
    event.waitUntil(self.skipWaiting());
  }
  if (type === "PM_RECACHE_CORE") {
    event.waitUntil(precacheCore().catch(() => undefined));
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (!/^https?:$/.test(url.protocol)) return;
  if (url.pathname === "/sw.js") return;
  if (url.pathname.startsWith("/_next/webpack-hmr")) return;
  if (request.headers.has("range")) return;
  if (isRscOrPrefetch(request, url)) return;
  if (isPathOrChild(url.pathname, "/api")) return;

  const isDocument =
    request.mode === "navigate" || request.destination === "document";

  if (isDocument) {
    event.respondWith(
      isNeverCachePath(url.pathname)
        ? networkOnlyNavigation(request)
        : networkFirstNavigation(event, request, url),
    );
    return;
  }

  if (isNeverCachePath(url.pathname)) return;

  if (url.pathname === "/manifest.webmanifest") {
    event.respondWith(networkFirstManifest(event, request));
    return;
  }

  // The Next image optimizer can wrap expiring/signed remote URLs. Article
  // text remains available offline; optimizer responses stay network-owned.
  if (url.pathname === "/_next/image") return;

  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/fonts/") ||
    ["font", "script", "style", "worker"].includes(request.destination) ||
    STATIC_FILE_PATTERN.test(url.pathname) ||
    TEXT_FILE_PATTERN.test(url.pathname);

  if (isStatic) {
    event.respondWith(cacheFirstStatic(event, request, url));
    return;
  }

  const isImage =
    request.destination === "image" || IMAGE_FILE_PATTERN.test(url.pathname);
  if (isImage) {
    event.respondWith(staleWhileRevalidate(event, request, IMAGES_CACHE));
  }
});
