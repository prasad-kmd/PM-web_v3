import Link from "next/link";
import { Button } from "@/components/ui/button";

export function StateSurface({
  kind,
  reset,
}: {
  kind: "error" | "not-found";
  reset?: () => void;
}) {
  const missing = kind === "not-found";
  return (
    <main className="state-surface" aria-labelledby="state-title">
      <div className="state-icon" aria-hidden="true">
        {missing ? "⌕" : "!"}
      </div>
      <div className="state-copy">
        <p className="cms-eyebrow">
          {missing ? "404 · Not found" : "Workspace notice"}
        </p>
        <h1 id="state-title">
          {missing ? "Page not found" : "Something didn’t load"}
        </h1>
        <p>
          {missing
            ? "We couldn’t find this page. Return to the desktop or browse the library."
            : "This part of the workspace couldn’t be opened. Please try again."}
        </p>
        <div className="state-actions">
          {reset ? (
            <Button type="button" onClick={reset}>
              Try again
            </Button>
          ) : null}
          <Link className="cms-button-link" href="/">
            Back to desktop
          </Link>
          {missing ? (
            <Link className="cms-button-link" href="/articles">
              Browse articles
            </Link>
          ) : null}
        </div>
      </div>
    </main>
  );
}
