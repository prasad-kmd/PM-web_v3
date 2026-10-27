"use client";

import Link from "next/link";
import { Fragment, type MouseEvent, type ReactNode } from "react";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";

export type WindowCrumb = {
  label: ReactNode;
  /** Omit for the current page (always the last crumb). */
  href?: string;
};

/**
 * The universal window toolbar: the `/resume` breadcrumb design
 * (`ui/breadcrumb` inside a quiet sticky bar) shared by every window.
 *
 * - The first crumb is always "Home" (`/`).
 * - In narrow windows the middle crumbs collapse into an ellipsis and the
 *   current page truncates, so the bar never wraps.
 * - `actions` render on the right (e.g. reader tools).
 */
export function WindowBreadcrumb({
  items,
  actions,
  onHomeClick,
  className,
  sticky = true,
}: {
  items: WindowCrumb[];
  actions?: ReactNode;
  /** Optional intercept for the Home crumb (e.g. close the window). */
  onHomeClick?: () => void;
  className?: string;
  sticky?: boolean;
}) {
  const handleHome = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      !onHomeClick ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    onHomeClick();
  };
  const crumbs: WindowCrumb[] = [{ label: "Home", href: "/" }, ...items];
  const lastIndex = crumbs.length - 1;
  return (
    <div
      className={cn("window-toolbar", sticky && "is-sticky", className)}
      data-slot="window-toolbar"
    >
      <Breadcrumb className="window-breadcrumb" aria-label="Breadcrumb">
        <BreadcrumbList>
          {crumbs.map((crumb, index) => {
            const isLast = index === lastIndex;
            const collapsible = index > 0 && !isLast;
            return (
              <Fragment key={index}>
                {index === 1 && lastIndex > 1 ? (
                  <>
                    <BreadcrumbItem className="window-breadcrumb-ellipsis">
                      <BreadcrumbEllipsis className="size-auto" />
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="window-breadcrumb-ellipsis" />
                  </>
                ) : null}
                <BreadcrumbItem
                  className={cn(
                    isLast && "window-breadcrumb-current",
                    collapsible && "window-breadcrumb-collapsible",
                  )}
                >
                  {isLast || !crumb.href ? (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink
                      render={<Link href={crumb.href} />}
                      onClick={index === 0 ? handleHome : undefined}
                    >
                      {crumb.label}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!isLast ? (
                  <BreadcrumbSeparator
                    className={cn(
                      collapsible && "window-breadcrumb-collapsible",
                    )}
                  />
                ) : null}
              </Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
      {actions ? <div className="window-toolbar-actions">{actions}</div> : null}
    </div>
  );
}
