import type { Metadata, Viewport } from "next";
import "./globals.css";
import { InterfaceProvider } from "@/components/providers/InterfaceProvider";
import { AppearanceProvider } from "@/lib/appearance";

export const metadata: Metadata = {
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
  },
  icons: { icon: "/favicon.svg" },
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
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement;var t=localStorage.getItem('pm-theme');d.classList.toggle('dark',t!=='light');d.style.colorScheme=t==='light'?'light':'dark'}catch(e){}})();`,
          }}
        />
      </head>
      <body className="antialiased">
        <AppearanceProvider>
          <InterfaceProvider>{children}</InterfaceProvider>
        </AppearanceProvider>
      </body>
    </html>
  );
}
