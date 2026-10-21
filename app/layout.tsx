import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppearanceProvider } from "@/lib/appearance";

export const metadata: Metadata = {
  title: {
    default: "Prasad M. — Spatial Workspace",
    template: "%s · Prasad M.",
  },
  description:
    "Prasad M. — Civil & Frontend Engineer. A personal engineering portfolio presented as a modern Spatial Glass desktop workspace.",
  keywords: ["Prasad M", "portfolio", "engineer", "Spatial Glass", "macOS", "desktop", "Next.js 16"],
  authors: [{ name: "Prasad M.", url: "https://github.com/prasad-kmd" }],
  openGraph: {
    title: "Prasad M. — Spatial Workspace",
    description: "A personal engineering portfolio presented as a modern Spatial Glass desktop workspace.",
    type: "website",
  },
  icons: { icon: "/icons/thesvg/files.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0e11" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        {/* Anti-FOUC: restore stored theme and wallpaper before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement;var t=localStorage.getItem('pm-theme');var w=localStorage.getItem('pm-wallpaper');var a=localStorage.getItem('pm-accent');if(t)d.setAttribute('data-theme',t);if(w)d.setAttribute('data-wallpaper',w);if(a){d.style.setProperty('--sys-accent',a);d.style.setProperty('--sys-accent-soft',a+'24');d.style.setProperty('--flu-accent',a);}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="antialiased">
        <AppearanceProvider>{children}</AppearanceProvider>
      </body>
    </html>
  );
}
