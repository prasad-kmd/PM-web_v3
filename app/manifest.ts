import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

/**
 * Native Web App Manifest for the conservative Phase 4 PWA.
 *
 * The start URL carries `source=pwa`, which the mandatory boot sequence
 * already treats as a full opening. Shortcuts deliberately point only at
 * real public v3 routes; there is no share target or push machinery.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: SITE_NAME,
    short_name: "PrasadM",
    description: SITE_DESCRIPTION,
    lang: "en",
    dir: "ltr",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    // Window-controls-overlay is intentionally avoided: the workspace has
    // its own 40px menubar and clock at the top-right, which native window
    // controls would cover.
    display_override: ["standalone", "minimal-ui"],
    background_color: "#1d1d1d",
    theme_color: "#1d1d1d",
    categories: ["education", "productivity"],
    icons: [
      {
        src: "/pwa/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa/favicon-256.png",
        sizes: "256x256",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Projects",
        short_name: "Projects",
        description: "Open engineering projects",
        url: "/projects",
        icons: [
          {
            src: "/pwa/projects-128.png",
            sizes: "128x128",
            type: "image/png",
          },
          { src: "/pwa/projects-48.png", sizes: "48x48", type: "image/png" },
        ],
      },
      {
        name: "Blog",
        short_name: "Blog",
        description: "Open the blog",
        url: "/blog",
        icons: [
          { src: "/pwa/blog-128.png", sizes: "128x128", type: "image/png" },
          { src: "/pwa/blog-48.png", sizes: "48x48", type: "image/png" },
        ],
      },
      {
        name: "Articles",
        short_name: "Articles",
        description: "Open long-form articles",
        url: "/articles",
        icons: [
          {
            src: "/pwa/article-128.png",
            sizes: "128x128",
            type: "image/png",
          },
          { src: "/pwa/article-48.png", sizes: "48x48", type: "image/png" },
        ],
      },
      {
        name: "Tutorials",
        short_name: "Tutorials",
        description: "Open tutorials and guides",
        url: "/tutorials",
        icons: [
          {
            src: "/pwa/tutorials-128.png",
            sizes: "128x128",
            type: "image/png",
          },
          {
            src: "/pwa/tutorials-48.png",
            sizes: "48x48",
            type: "image/png",
          },
        ],
      },
      {
        name: "Resume",
        short_name: "Resume",
        description: "Open Prasad's resume",
        url: "/resume",
        icons: [
          {
            src: "/pwa/resume-128.png",
            sizes: "128x128",
            type: "image/png",
          },
          { src: "/pwa/resume-48.png", sizes: "48x48", type: "image/png" },
        ],
      },
    ],
  };
}
