"use client";

import type { ReactNode } from "react";
import {
  ArrowRight02Icon,
  ArrowUpRight01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button as PressPrimitive } from "@animate-ui/react/primitives/buttons/button";
import { cn } from "@/lib/utils";

/**
 * Content-page buttons: Animate UI's spring press (scale on hover, 0.97 on
 * tap, reduced-motion aware) plus an arrow that slides out and a fresh one
 * slides in on hover. The arrow swap is CSS (`.rdr-arrow-swap` in
 * library.css), so it also works on server-rendered cards via `ArrowSwap`.
 */

type ArrowDirection = "right" | "up-right";

export function ArrowSwap({
  direction = "right",
  className,
}: {
  direction?: ArrowDirection;
  className?: string;
}) {
  const icon = direction === "up-right" ? ArrowUpRight01Icon : ArrowRight02Icon;
  return (
    <span
      aria-hidden="true"
      data-direction={direction}
      className={cn("rdr-arrow-swap", className)}
    >
      <HugeiconsIcon icon={icon} strokeWidth={2} />
      <HugeiconsIcon icon={icon} strokeWidth={2} />
    </span>
  );
}

const isExternal = (href: string) => /^https?:\/\//i.test(href);

/** The `[button href="…"]` shortcode. */
export function ContentButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  const external = isExternal(href);
  return (
    <PressPrimitive asChild hoverScale={1.03} tapScale={0.97}>
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noreferrer noopener" : undefined}
        data-variant={variant}
        className="rdr-button"
      >
        <span>{children}</span>
        <ArrowSwap direction={external ? "up-right" : "right"} />
        {external ? (
          <span className="sr-only"> (opens in a new tab)</span>
        ) : null}
      </a>
    </PressPrimitive>
  );
}

/**
 * A full-width resource card (file, PDF, bookmark). Same spring press, kept
 * subtle because the card is wide.
 */
export function ContentCardLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <PressPrimitive asChild hoverScale={1} tapScale={0.985}>
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className={cn("rdr-card-link", className)}
      >
        {children}
      </a>
    </PressPrimitive>
  );
}
