import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PM — Desktop",
  description:
    "A personal engineering portfolio, arranged as a desktop workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
