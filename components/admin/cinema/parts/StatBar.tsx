import type { CinemaStatBucket } from "@/lib/cinema/types";
export function StatBar({
  bucket,
  max,
}: {
  bucket: CinemaStatBucket;
  max: number;
}) {
  return (
    <div className="cinema-stat-row">
      <span className="cinema-stat-row-label">{bucket.label}</span>
      <div
        className="cinema-stat-bar"
        role="img"
        aria-label={`${bucket.label}: ${bucket.count}`}
      >
        <div
          className="cinema-stat-bar-fill"
          style={{ width: `${max ? (bucket.count / max) * 100 : 0}%` }}
        />
      </div>
      <span>{bucket.count}</span>
    </div>
  );
}
