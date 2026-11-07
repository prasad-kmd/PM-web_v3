"use client";

import {
  FaceRail,
  type FaceCard,
} from "@/components/admin/cinema/parts/FaceRail";
import { isPrincipalJob } from "@/components/admin/cinema/parts/crew-jobs";
import type { CinemaCrewCredit } from "@/lib/cinema/types";

/**
 * The rest of the crew — stunts, assistant directors, sound, art department,
 * gaffers, everyone TMDB lists past the principals.
 *
 * The people whose names belong beside the title are in `PrincipalCrewRail`
 * (above the cast), so this rail starts where that one stops and never repeats
 * a face. Sorted by whether there is a portrait, then alphabetically, because
 * the remaining jobs have no meaningful hierarchy.
 */
const JOB_ORDER = [
  "Director",
  "Creator",
  "Screenplay",
  "Writer",
  "Story",
  "Teleplay",
  "Producer",
  "Executive Producer",
  "Original Music Composer",
  "Music",
  "Director of Photography",
  "Editor",
  "Production Design",
  "Costume Design",
  "Casting",
  "Visual Effects Supervisor",
  "Sound Designer",
];

function rank(job: string | null): number {
  const index = job ? JOB_ORDER.indexOf(job) : -1;
  return index === -1 ? JOB_ORDER.length : index;
}

export function CrewRail({
  crew,
  onOpenPerson,
  limit = 24,
}: {
  crew: CinemaCrewCredit[];
  onOpenPerson: (personId: number) => void;
  limit?: number;
}) {
  const byPerson = new Map<
    number,
    { name: string; jobs: string[]; profilePath: string | null }
  >();

  for (const member of crew) {
    if (!member.job) continue;
    if (isPrincipalJob(member.job)) continue;
    const existing = byPerson.get(member.tmdbId);
    if (existing) {
      if (!existing.jobs.includes(member.job)) existing.jobs.push(member.job);
      if (!existing.profilePath && member.profilePath) {
        existing.profilePath = member.profilePath;
      }
      continue;
    }
    byPerson.set(member.tmdbId, {
      name: member.name,
      jobs: [member.job],
      profilePath: member.profilePath,
    });
  }

  const people: FaceCard[] = [...byPerson.entries()]
    .map(([id, value]) => ({
      id,
      name: value.name,
      jobs: value.jobs,
      profilePath: value.profilePath,
      best: Math.min(...value.jobs.map((job) => rank(job))),
    }))
    .sort((a, b) => {
      if (a.profilePath !== b.profilePath) return a.profilePath ? -1 : 1;
      if (a.best !== b.best) return a.best - b.best;
      return a.name.localeCompare(b.name);
    })
    .slice(0, limit)
    .map((person) => ({
      id: person.id,
      name: person.name,
      sub: person.jobs.slice(0, 2).join(" · "),
      profilePath: person.profilePath,
    }));

  return <FaceRail label="Crew" people={people} onOpenPerson={onOpenPerson} />;
}
