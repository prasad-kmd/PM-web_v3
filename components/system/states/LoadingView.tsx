import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

export type LoadingLayout =
  "listing" | "reader" | "page" | "invoices" | "og-studio";

/**
 * Loading — approved System alert (01) + Desktop-native (04) blend:
 * indeterminate hairline under the toolbar, a skeleton that matches the
 * layout being opened, and a dock-style "Opening …" status pill.
 */
export function LoadingView({
  label,
  layout,
}: {
  label: string;
  layout: LoadingLayout;
}) {
  const isStudio = layout === "invoices" || layout === "og-studio";

  return (
    <main
      className={`state-loading${isStudio ? " is-studio" : ""}`}
      aria-busy="true"
      aria-label={`Opening ${label}`}
    >
      {isStudio ? (
        <div className="state-skel-studio-bar" aria-hidden>
          <div className="state-skel-studio-tabs">
            {Array.from(
              { length: layout === "invoices" ? 5 : 4 },
              (_, index) => (
                <Skeleton
                  key={index}
                  className="h-6 rounded-md"
                  style={{ width: layout === "invoices" ? 72 : 68 }}
                />
              ),
            )}
          </div>
          <div className="state-skel-studio-actions">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-md" />
          </div>
        </div>
      ) : (
        <div className="window-toolbar is-sticky" aria-hidden>
          <div className="state-crumbs">
            <Skeleton className="h-2.5 w-10" />
            <span className="state-crumb-sep" />
            <Skeleton className="h-2.5 w-16" />
          </div>
        </div>
      )}

      <div className="state-bar" aria-hidden>
        <span />
      </div>

      {layout === "listing" ? (
        <div className="lib state-skel-lib" aria-hidden>
          <div className="lib-side">
            <Skeleton className="h-2.5 w-14" />
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-7 w-full" />
            ))}
          </div>
          <div className="lib-main">
            <div className="lib-tools">
              <Skeleton className="h-8 w-64 max-w-full rounded-lg" />
              <span className="lib-grow" />
              <Skeleton className="h-8 w-28 rounded-lg" />
              <Skeleton className="h-8 w-16 rounded-lg" />
            </div>
            <div className="lib-head">
              <div>
                <Skeleton className="h-7 w-40" />
                <Skeleton className="mt-3 h-3.5 w-80 max-w-full" />
              </div>
            </div>
            <div className="state-skel-grid">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i}>
                  <Skeleton className="aspect-[16/10] w-full rounded-lg" />
                  <Skeleton className="mt-2.5 h-3 w-[85%]" />
                  <Skeleton className="mt-2 h-2.5 w-1/2" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : layout === "reader" ? (
        <div className="state-skel-doc" aria-hidden>
          <Skeleton className="h-5 w-24 rounded-md" />
          <Skeleton className="mt-4 h-8 w-[80%]" />
          <Skeleton className="mt-2 h-8 w-1/2" />
          <Skeleton className="mt-4 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-[70%]" />
          <Skeleton className="mt-7 aspect-[16/9] w-full rounded-xl" />
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton
              key={i}
              className="mt-3 h-3.5"
              style={{ width: `${[100, 94, 98, 88, 62][i]}%` }}
            />
          ))}
        </div>
      ) : layout === "invoices" ? (
        <div className="state-skel-invoices" aria-hidden>
          <div className="state-skel-invoices-kpis">
            {Array.from({ length: 4 }, (_, i) => (
              <div className="state-skel-kpi" key={i}>
                <Skeleton className="h-2.5 w-24" />
                <Skeleton className="mt-2.5 h-6 w-32" />
                <Skeleton className="mt-2 h-2.5 w-20" />
              </div>
            ))}
          </div>

          <div className="state-skel-invoices-card">
            <div className="state-skel-invoices-head">
              <div>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-2 h-2.5 w-52 max-w-full" />
              </div>
              <Skeleton className="h-7 w-28 rounded-md" />
            </div>

            <div className="state-skel-invoices-rows">
              {Array.from({ length: 5 }, (_, i) => (
                <div className="state-skel-invoices-row" key={i}>
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="h-3.5 w-40 max-w-full" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-3.5 w-24 justify-self-end" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : layout === "og-studio" ? (
        <div className="state-skel-og" aria-hidden>
          <div className="state-skel-og-rail">
            <Skeleton className="h-3 w-24" />
            <div className="state-skel-og-presets">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-9 w-full rounded-lg" />
              ))}
            </div>
            <Skeleton className="mt-2 h-3 w-28" />
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <div className="state-skel-og-presets">
              <Skeleton className="h-9 w-full rounded-lg" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>

          <div className="state-skel-og-stage">
            <div className="state-skel-og-canvas-wrap">
              <Skeleton className="aspect-[1200/630] w-full rounded-xl" />
              <div className="state-skel-og-caption">
                <Skeleton className="h-3 w-36" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="state-skel-doc" aria-hidden>
          <Skeleton className="h-7 w-44" />
          <Skeleton className="mt-3 h-4 w-72 max-w-full" />
          <div className="state-skel-grid">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-40 w-full rounded-xl" />
            ))}
          </div>
        </div>
      )}

      <div className="state-dock" role="status">
        <Spinner className="size-3.5" aria-hidden role="presentation" />
        <span>Opening {label}…</span>
      </div>
    </main>
  );
}
