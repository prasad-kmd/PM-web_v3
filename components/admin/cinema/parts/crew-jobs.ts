/**
 * Who counts as "key crew".
 *
 * TMDB's crew list for a feature runs to hundreds of people — stunts, second
 * unit, art department, sound editors, accountants, the lot. That is worth
 * browsing, but it buries the people who actually shaped the film. This module
 * is the single ordered allowlist the two rails share: the principals get their
 * own rail above the cast, and everything else keeps the crew rail below it.
 */

export type PrincipalJob = {
  /** TMDB `job` string. */
  job: string;
  /** What the card says. */
  label: string;
};

/** Ordered most-central first; index doubles as the sort rank. */
export const PRINCIPAL_CREW_JOBS: readonly PrincipalJob[] = [
  { job: "Director", label: "Director" },
  { job: "Creator", label: "Creator" },
  { job: "Screenplay", label: "Writer" },
  { job: "Writer", label: "Writer" },
  { job: "Teleplay", label: "Writer" },
  { job: "Story", label: "Story by" },
  { job: "Producer", label: "Producer" },
  { job: "Executive Producer", label: "Executive producer" },
  { job: "Original Music Composer", label: "Composer" },
  { job: "Music", label: "Composer" },
  { job: "Director of Photography", label: "Cinematographer" },
  { job: "Editor", label: "Editor" },
  { job: "Production Design", label: "Production designer" },
  { job: "Art Direction", label: "Art director" },
  { job: "Costume Design", label: "Costume designer" },
  { job: "Casting", label: "Casting director" },
  { job: "Visual Effects Supervisor", label: "VFX supervisor" },
];

const BY_JOB = new Map(PRINCIPAL_CREW_JOBS.map((entry, rank) => [entry.job, { ...entry, rank }]));

/** Rank of a principal job (0 = most central), or `null` if it is not one. */
export function principalRank(job: string | null | undefined): number | null {
  if (!job) return null;
  return BY_JOB.get(job)?.rank ?? null;
}

/** Display label for a principal job, or `null` if it is not one. */
export function principalLabel(job: string | null | undefined): string | null {
  if (!job) return null;
  return BY_JOB.get(job)?.label ?? null;
}

export function isPrincipalJob(job: string | null | undefined): boolean {
  return principalRank(job) !== null;
}
