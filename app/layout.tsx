import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import "./cms.css";
import "./library.css";
import "./system-states.css";
import "katex/dist/katex.min.css";
import { Desktop } from "@/components/desktop/Desktop";
import { InterfaceProvider } from "@/components/providers/InterfaceProvider";
import { AppearanceProvider } from "@/lib/appearance";
import {
  COOKIE_SLIDESHOW_ENABLED,
  COOKIE_SLIDESHOW_INTERVAL,
  COOKIE_THEME,
  COOKIE_WALLPAPER,
  COOKIE_WALLPAPER_INTENSITY,
} from "@/lib/cookies";
import type { Theme } from "@/lib/registry";
import { getSiteUrl } from "@/lib/site";
import { OG_IMAGE_SIZE, ogImageUrl } from "@/lib/content-metadata";
import {
  resolveSlideshowInterval,
  resolveWallpaperId,
  resolveWallpaperIntensity,
} from "@/lib/wallpapers";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  alternates: { types: { "application/rss+xml": "/feed.xml" } },
  title: {
    default: "Prasad M. — Desktop Workspace",
    template: "%s · Prasad M.",
  },
  description:
    "Prasad Madhuranga — Mechanical and Mechatronics Engineer. A professional portfolio presented as an interactive desktop workspace.",
  keywords: [
    "Prasad Madhuranga",
    "portfolio",
    "mechanical engineer",
    "mechatronics engineer",
    "desktop workspace",
    "Next.js 16",
  ],
  authors: [{ name: "Prasad M.", url: "https://github.com/prasad-kmd" }],
  openGraph: {
    title: "Prasad M. — Desktop Workspace",
    description:
      "A personal engineering portfolio presented as an interactive desktop workspace.",
    type: "website",
    images: [
      {
        url: ogImageUrl("Prasad M. — Desktop Workspace", "", "default", {
          kind: "home",
        }),
        ...OG_IMAGE_SIZE,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: [
      ogImageUrl("Prasad M. — Desktop Workspace", "", "default", {
        kind: "home",
      }),
    ],
  },
  icons: { icon: "/favicon-pm.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1d1d1d" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();

  const initialTheme: Theme =
    cookieStore.get(COOKIE_THEME)?.value === "light" ? "light" : "dark";
  const initialWallpaper = resolveWallpaperId(
    cookieStore.get(COOKIE_WALLPAPER)?.value,
  );
  const initialIntensity = resolveWallpaperIntensity(
    cookieStore.get(COOKIE_WALLPAPER_INTENSITY)?.value,
  );
  const initialSlideshowEnabled =
    cookieStore.get(COOKIE_SLIDESHOW_ENABLED)?.value === "1";
  const initialSlideshowInterval = resolveSlideshowInterval(
    cookieStore.get(COOKIE_SLIDESHOW_INTERVAL)?.value,
  );

  return (
    <html
      lang="en"
      className={initialTheme === "dark" ? "dark" : undefined}
      style={{ colorScheme: initialTheme }}
      data-wallpaper-intensity={initialIntensity}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement;var m=document.cookie.match(/(?:^|; )pm-theme=([^;]*)/);var t=m?decodeURIComponent(m[1]):localStorage.getItem('pm-theme');if(t==='light'||t==='dark'){d.classList.toggle('dark',t==='dark');d.style.colorScheme=t}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="antialiased">
        <AppearanceProvider
          initialAppearance={{
            theme: initialTheme,
            wallpaper: initialWallpaper,
            wallpaperIntensity: initialIntensity,
            slideshowEnabled: initialSlideshowEnabled,
            slideshowInterval: initialSlideshowInterval,
          }}
        >
          <InterfaceProvider>
            <Desktop>{children}</Desktop>
          </InterfaceProvider>
        </AppearanceProvider>
      </body>
    </html>
  );
}
