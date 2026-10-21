"use client";

import * as React from "react";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cn } from "@/lib/utils";

function Breadcrumb({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"nav">) {
  return (
    <nav
      aria-label="breadcrumb"
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

function BreadcrumbList({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"ol">) {
  return (
    <ol
      className={cn(
        "flex flex-wrap items-center gap-1.5 break-words sm:gap-2.5",
        className,
      )}
      {...props}
    />
  );
}

function BreadcrumbItem({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"li">) {
  return (
    <li
      className={cn("inline-flex items-center gap-1.5", className)}
      {...props}
    />
  );
}

function BreadcrumbLink({
  className,
  render,
  ...props
}: useRender.ComponentProps<"a">): React.ReactElement {
  const defaultProps = {
    className: cn("transition-colors hover:text-foreground", className),
  };

  return useRender({
    defaultTagName: "a",
    props: mergeProps<"a">(defaultProps, props),
    render,
  });
}

function BreadcrumbPage({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"span">) {
  return (
    <span
      aria-current="page"
      aria-disabled="true"
      className={cn("font-normal text-foreground", className)}
      {...props}
    />
  );
}

function BreadcrumbSeparator({
  children,
  className,
  ...props
}: React.ComponentPropsWithoutRef<"li">) {
  return (
    <li
      aria-hidden="true"
      role="presentation"
      className={cn("[&>svg]:size-3.5", className)}
      {...props}
    >
      {children ?? (
        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="m6 3 5 5-5 5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </li>
  );
}

function BreadcrumbEllipsis({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"span">) {
  return (
    <span
      aria-hidden="true"
      className={cn("flex size-8 items-center justify-center", className)}
      {...props}
    >
      <span>…</span>
      <span className="sr-only">More</span>
    </span>
  );
}

export {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
};
