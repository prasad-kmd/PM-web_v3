"use client";

import { SafeModeScreen } from "@/components/system/SafeModeScreen";

/** Replaces the root layout: no providers, globals.css or desktop shell. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" style={{ colorScheme: "dark" }}>
      <head>
        <title>Safe mode · Prasad M.</title>
        <meta name="robots" content="noindex" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: 0, background: "oklch(.145 0 0)" }}>
        <SafeModeScreen digest={error.digest} onRestart={reset} />
      </body>
    </html>
  );
}
