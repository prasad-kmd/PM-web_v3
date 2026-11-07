import type { CinemaTasteProfile } from "@/lib/cinema/types";
export function TastePanel({ profile }: { profile: CinemaTasteProfile }) {
  const max = Math.max(...profile.genres.map((g) => g.weight), 1);
  return (
    <div className="cinema-taste-panel">
      <div className="cinema-taste-heading">
        <strong>Your taste profile</strong>
        <span className="cinema-taste-confidence">
          {profile.confidence} confidence · {profile.ratedCount} ratings
        </span>
      </div>
      <p>
        Genres gain weight from higher ratings and your library status; low
        ratings and dropped titles can reduce it. Titles with more genres
        contribute less to each.
      </p>
      {profile.genres.length ? (
        profile.genres.map((g) => (
          <div className="cinema-stat-row" key={g.name}>
            <span className="cinema-stat-row-label">{g.name}</span>
            <div
              className="cinema-stat-bar"
              role="img"
              aria-label={`${g.name}: affinity ${g.weight.toFixed(2)}`}
            >
              <div
                className="cinema-stat-bar-fill"
                style={{ width: `${(g.weight / max) * 100}%` }}
              />
            </div>
            <span>{g.weight.toFixed(2)}</span>
          </div>
        ))
      ) : (
        <p>No positive genre signal yet. Add genres and rate more titles.</p>
      )}
      <p>
        Highest-rated seeds:{" "}
        {profile.seeds.map((s) => `${s.title} (${s.rating}/10)`).join(" · ")}
      </p>
    </div>
  );
}
