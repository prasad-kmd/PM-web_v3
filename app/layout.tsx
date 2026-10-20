import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppearanceProvider } from "@/lib/appearance";

export const metadata: Metadata = {
  title: {
    default: "Prasad M. — Desktop",
    template: "%s · Prasad M.",
  },
  description:
    "Prasad M. — engineer and designer. A personal portfolio presented as a Windows 11 desktop workspace.",
  keywords: ["Prasad M", "portfolio", "engineer", "Windows 11", "desktop", "Next.js"],
  authors: [{ name: "Prasad M.", url: "https://github.com/prasad-kmd" }],
  openGraph: {
    title: "Prasad M. — Desktop",
    description: "A personal engineering portfolio presented as a Windows 11 desktop.",
    type: "website",
  },
  icons: { icon: "/icons/thesvg/windows11.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eeeeee" },
    { media: "(prefers-color-scheme: dark)", color: "#1e1e26" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        {/* Paint the stored theme before first render so there is no flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement;var t=localStorage.getItem('pm-theme');var w=localStorage.getItem('pm-wallpaper');var a=localStorage.getItem('pm-accent');if(t)d.setAttribute('data-theme',t);if(w)d.setAttribute('data-wallpaper',w);if(a){d.style.setProperty('--flu-accent',a);d.style.setProperty('--flu-accent-soft',a+'22');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="antialiased">
        <AppearanceProvider>{children}</AppearanceProvider>
      </body>
    </html>
  );
}
