"use client";

// Adapted from PM-Web_V2 (AGPL-3.0); see THIRD_PARTY_NOTICES.md.

import { useState } from "react";
import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Code copied" : "Copy code"}
      className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-zinc-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {copied ? (
        <HugeiconsIcon
          icon={Tick02Icon}
          strokeWidth={2}
          aria-hidden="true"
          className="size-3.5"
        />
      ) : (
        <HugeiconsIcon
          icon={Copy01Icon}
          strokeWidth={2}
          aria-hidden="true"
          className="size-3.5"
        />
      )}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
