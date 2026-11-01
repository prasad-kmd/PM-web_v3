import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./cms.css";
import "./library.css";
import "./system-states.css";
import "./boot.css";
import "./pwa.css";
import "katex/dist/katex.min.css";
import { Desktop } from "@/components/desktop/Desktop";
import { InterfaceProvider } from "@/components/providers/InterfaceProvider";
import { AppearanceProvider } from "@/lib/appearance";
import { getSiteUrl, SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";
import { OG_IMAGE_SIZE, ogImageUrl } from "@/lib/content-metadata";
import { DEFAULT_WALLPAPER_INTENSITY } from "@/lib/wallpapers";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  applicationName: SITE_NAME,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Prasad M.",
    statusBarStyle: "default",
  },
  alternates: { types: { "application/rss+xml": "/feed.xml" } },
  title: {
    default: "Prasad M. — Desktop Workspace",
    template: "%s · Prasad M.",
  },
  description: SITE_DESCRIPTION,
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
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    locale: "en_US",
    url: getSiteUrl(),
    type: "website",
    images: [
      {
        url: ogImageUrl(SITE_NAME, SITE_DESCRIPTION, "default", {
          kind: "home",
        }),
        ...OG_IMAGE_SIZE,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [
      ogImageUrl(SITE_NAME, SITE_DESCRIPTION, "default", {
        kind: "home",
      }),
    ],
  },
  icons: {
    icon: [
      { url: "/favicon-pm.svg", type: "image/svg+xml" },
      { url: "/pwa/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/pwa/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: ["/favicon-pm.svg"],
    apple: [
      {
        url: "/pwa/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1d1d1d" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className="dark"
      style={{ colorScheme: "dark" }}
      data-wallpaper-intensity={DEFAULT_WALLPAPER_INTENSITY}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement;var read=function(name){var m=document.cookie.match(new RegExp('(?:^|; )'+name+'=([^;]*)'));if(m){try{return decodeURIComponent(m[1])}catch(e){return m[1]}}try{return localStorage.getItem(name)}catch(e){return null}};var t=read('pm-theme');if(t==='light'||t==='dark'){d.classList.toggle('dark',t==='dark');d.style.colorScheme=t}var wi=read('pm-wallpaper-intensity');if(wi==='subtle'||wi==='balanced'||wi==='vivid'){d.dataset.wallpaperIntensity=wi}if(location.pathname!=='/'){d.dataset.bootState='inactive';return}var nav='navigate';try{var entries=performance.getEntriesByType?performance.getEntriesByType('navigation'):[];if(entries&&entries[0]&&entries[0].type)nav=entries[0].type;else if(performance.navigation)nav=performance.navigation.type===1?'reload':(performance.navigation.type===2?'back_forward':'navigate')}catch(e){}if(nav==='back_forward'){d.dataset.bootState='inactive';return}var reduced=false;try{reduced=matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){}var pwa=false;try{pwa=new URLSearchParams(location.search).get('source')==='pwa'}catch(e){}var variant=reduced||(nav==='reload'&&!pwa)?'short':'full';d.dataset.bootState='pending';d.dataset.bootVariant=variant;window.__pmBootStartedAt=performance&&performance.now?performance.now():Date.now();var cap=variant==='short'?2300:3300;window.setTimeout(function(){if(d.dataset.bootState==='pending'||d.dataset.bootState==='playing'||d.dataset.bootState==='exiting'){d.dataset.bootState='done';try{window.dispatchEvent(new Event('pm:boot-done'))}catch(e){}}},cap)}catch(e){try{document.documentElement.dataset.bootState='inactive'}catch(_e){}}})();`,
          }}
        />
      </head>
      <body className="antialiased">
        <AppearanceProvider>
          <InterfaceProvider>
            <Desktop>{children}</Desktop>
          </InterfaceProvider>
        </AppearanceProvider>
      </body>
    </html>
  );
}
