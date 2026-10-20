import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prasad M. — Desktop",
  description:
    "Prasad M. — Engineer & designer. A personal portfolio presented as a Windows 11 desktop workspace. Projects, experience, and contact.",
  keywords: [
    "Prasad M",
    "portfolio",
    "engineer",
    "Windows 11",
    "desktop",
    "Next.js",
  ],
  authors: [{ name: "Prasad M.", url: "https://github.com/prasad-kmd" }],
  openGraph: {
    title: "Prasad M. — Desktop",
    description:
      "A personal engineering portfolio presented as a Windows 11 desktop.",
    type: "website",
  },
  icons: {
    icon: "/icons/thesvg/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent flash on theme load — runs before React */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('pm-theme');var s=localStorage.getItem('pm-wallpaper');var w=localStorage.getItem('pm-accent');if(t)document.documentElement.setAttribute('data-theme',t);if(s)document.documentElement.setAttribute('data-wallpaper',s);if(w)document.documentElement.style.setProperty('--accent',w)}catch(e){}})()`,
          }}
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
