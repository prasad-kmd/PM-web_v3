/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Type checking is a required gate: `next build` no longer lints, and this
    // project ships auth + database code where a silent type error is expensive.
    // Run `pnpm typecheck` (tsc --noEmit) alongside `pnpm build` and `pnpm lint`.
    ignoreBuildErrors: false,
  },
  /* Tree-shake the big barrel-export packages so a page only downloads the
     icons/components it actually uses instead of the whole entry point. */
  experimental: {
    // Only packages that are known to ship a single big barrel entry point and
    // that this project actually depends on — anything unknown here would just
    // produce a warning at build time.
    optimizePackageImports: [
      "@hugeicons/core-free-icons",
      "@hugeicons/react",
      "sonner",
    ],
  },
  /* `/api/og` reads fonts, wallpapers and brand assets from public/ at
     runtime (Node). Trace them into that serverless function explicitly. */
  outputFileTracingIncludes: {
    "/api/og": [
      "./public/og/**",
      "./public/images/profile-placeholder.jpg",
      "./public/favicon-pm.svg",
    ],
    "/api/og-custom": [
      "./public/og/**",
      "./public/images/profile-placeholder.jpg",
      "./public/favicon-pm.svg",
    ],
  },
  compiler: {
    // Strip debug logging from production bundles (keeps warnings/errors).
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },
  images: {
    // Enable Next.js image optimization
    unoptimized: false, // Keeping true to avoid complex localPattern issues with query strings during build
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
        protocol: "https",
        hostname: "*.notion.so",
      },
      {
        protocol: "https",
        hostname: "*.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "avatar.vercel.sh",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      { protocol: "https", hostname: "covers.openlibrary.org" },
      { protocol: "https", hostname: "cdn.cloudflare.steamstatic.com" },
      // Optional safety: older CheapShark thumbs sometimes used this
      { protocol: "https", hostname: "cdn.akamai.steamstatic.com" },
      { protocol: "https", hostname: "www.cheapshark.com" },
      // CheapShark thumbs can come from store CDNs; example shown in CheapShark docs:
      { protocol: "https", hostname: "cdn.fanatical.com" },
      // (Optional) seen in CheapShark usage examples in the wild:
      { protocol: "https", hostname: "shared.fastly.steamstatic.com" },
      { protocol: "https", hostname: "image.tmdb.org" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
    formats: ["image/webp", "image/avif"],
    // Next 16 rejects query strings on local images unless listed here. The
    // share-image route is allowed with any query (listing thumbnails and
    // reader covers fall back to it); every other local path stays query-free.
    localPatterns: [{ pathname: "/api/og" }, { pathname: "**", search: "" }],
    dangerouslyAllowSVG: true, // For LQIP shimmers
    contentDispositionType: "attachment", // Security for downloads
    /**
     * Required alongside `dangerouslyAllowSVG`, per Next's own documentation.
     *
     * An SVG is a document, not a bitmap: it can carry `<script>` and external
     * references. Serving one from the image optimizer without this policy would
     * hand back a file that runs in this site's origin. `sandbox` plus
     * `script-src 'none'` makes even a hostile SVG inert — which is what turns
     * "we allow SVG" from a convenience into a decision that was made.
     */
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Add security headers including CSP
  async headers() {
    const cspHeader = `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval' 'unsafe-inline' blob: https://gist.github.com https://challenges.cloudflare.com https://turnstile.cloudflare.com;
      style-src 'self' 'unsafe-inline' https://challenges.cloudflare.com;
      img-src 'self' blob: data: https://github.com https://*.notion.so https://*.amazonaws.com https://i.pravatar.cc https://placehold.co https://images.unsplash.com https://*.unsplash.com https://lh3.googleusercontent.com https://avatars.githubusercontent.com https://avatar.vercel.sh https://*.githubusercontent.com https://*.googleusercontent.com https://challenges.cloudflare.com https://image.tmdb.org https://ghchart.rshah.org/409ba5/prasad-kmd https://pbs.twimg.com https://abs.twimg.com https://unavatar.io https://media.licdn.com;
      font-src 'self' data:;
      media-src 'self' blob: data: https://*.notion.so https://*.amazonaws.com;
      connect-src 'self' blob: data: https://api.notion.com https://api.telegram.org https://lh3.googleusercontent.com https://avatars.githubusercontent.com https://*.googleusercontent.com https://*.githubusercontent.com https://*.amazonaws.com https://i.pravatar.cc https://placehold.co https://images.unsplash.com https://*.unsplash.com https://challenges.cloudflare.com https://turnstile.cloudflare.com http://localhost:3000 https://localhost:3000 ws://localhost:3000 wss://localhost:3000 https://cheapshark.com https://openlibrary.org https://api.codetabs.com https://export.arxiv.org;
      frame-src 'self' https://www.youtube.com https://challenges.cloudflare.com https://turnstile.cloudflare.com;
      worker-src 'self' blob: https://challenges.cloudflare.com;
      ${process.env.NODE_ENV === "production" ? "upgrade-insecure-requests;" : ""}
    `
      .replace(/\s{2,}/g, " ")
      .trim();

    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspHeader,
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // Keep the production clickjacking policy while allowing the local
          // development preview to run inside the workspace iframe.
          ...(process.env.NODE_ENV === "production"
            ? [{ key: "X-Frame-Options", value: "DENY" }]
            : []),
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            // Tells agents which llms.txt describes the page they just loaded
            // (llmstxt.org recommends this link relation for discovery).
            key: "Link",
            value: '</llms.txt>; rel="describedby"',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
