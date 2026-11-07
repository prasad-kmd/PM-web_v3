"use client";

import { Skeleton } from "@/components/ui/skeleton";

/** Matches the hero + two rails it replaces, so nothing jumps on arrival. */
export function HomeSkeleton() {
  return (
    <div
      className="state-skel-cinema"
      aria-busy="true"
      aria-label="Opening home"
    >
      <div className="state-skel-cinema-hero">
        <Skeleton className="h-2.5 w-24" />
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-3.5 w-52 max-w-full" />
        <div className="state-skel-cinema-actions">
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </div>

      {[0, 1].map((rail) => (
        <div key={rail}>
          <Skeleton className="mb-2.5 h-3.5 w-40" />
          <div className="state-skel-cinema-rail">
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index}>
                <Skeleton className="state-skel-cinema-tile" />
                <Skeleton className="h-2.5 w-[85%]" />
                <Skeleton className="h-2 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
