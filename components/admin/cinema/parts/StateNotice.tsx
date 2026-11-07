"use client";

import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";

/** Inline notice used for errors, degraded rows and empty states. */
export function StateNotice({
  title,
  body,
  action,
  tone = "neutral",
}: {
  title: string;
  body: string;
  action?: ReactNode;
  tone?: "neutral" | "quiet";
}) {
  return (
    <div
      className={`cinema-notice cinema-notice-${tone}`}
      role={tone === "neutral" ? "status" : undefined}
    >
      <span className="cinema-notice-glyph" aria-hidden>
        <HugeiconsIcon
          icon={InformationCircleIcon}
          strokeWidth={1.8}
          size={18}
        />
      </span>
      <div className="cinema-notice-copy">
        <p className="cinema-notice-title">{title}</p>
        <p className="cinema-notice-body">{body}</p>
      </div>
      {action}
    </div>
  );
}
