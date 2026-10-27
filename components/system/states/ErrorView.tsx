"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Alert02Icon,
  Copy01Icon,
  RefreshIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";

/**
 * Error — approved Desktop-native (04): the window freezes into a
 * grayscale ghost behind a "not responding" dialog. Reloading re-runs only
 * this window's segment; the rest of the desktop keeps running.
 */
export function ErrorView({
  label,
  digest,
  onReload,
  pending = false,
}: {
  label: string;
  digest?: string;
  onReload: () => void;
  pending?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <main className="state-error" aria-labelledby="state-error-title">
      <div className="state-frozen" aria-hidden>
        <div className="state-frozen-bar" />
        <div className="state-frozen-grid">
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} />
          ))}
        </div>
      </div>
      <div
        className="state-hang"
        role="alertdialog"
        aria-labelledby="state-error-title"
        aria-describedby="state-error-copy"
      >
        <span className="state-hang-icon" aria-hidden>
          <HugeiconsIcon icon={Alert02Icon} size={22} strokeWidth={1.7} />
        </span>
        <h1 id="state-error-title">{label} stopped responding</h1>
        <p id="state-error-copy">
          This window hit an error. You can reload just this window — everything
          else on the desktop keeps running.
        </p>
        <div className="state-hang-actions">
          <Button type="button" onClick={onReload} disabled={pending}>
            <HugeiconsIcon
              icon={RefreshIcon}
              strokeWidth={1.8}
              className={pending ? "animate-spin" : undefined}
            />
            Reload window
          </Button>
          <Button variant="outline" render={<Link href="/" />}>
            Back to desktop
          </Button>
        </div>
        {digest ? (
          <span className="state-digest">
            Digest <code>{digest}</code>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={copied ? "Digest copied" : "Copy digest"}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(digest);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1600);
                } catch {}
              }}
            >
              <HugeiconsIcon icon={copied ? Tick02Icon : Copy01Icon} />
            </Button>
          </span>
        ) : null}
      </div>
    </main>
  );
}
