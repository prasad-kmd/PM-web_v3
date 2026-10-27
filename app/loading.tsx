import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <main className="cms-app" aria-busy="true" aria-label="Loading content">
      <div className="cms-toolbar">
        <span>Workspace</span>
        <span>/</span>
        <span>Loading</span>
      </div>
      <div className="cms-page cms-loading">
        <p className="cms-eyebrow" role="status">
          Loading content…
        </p>
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-72 max-w-full" />
        <div className="cms-loading-grid">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      </div>
    </main>
  );
}
