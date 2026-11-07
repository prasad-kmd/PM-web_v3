"use client";

import {
  FaceRail,
  type FaceCard,
} from "@/components/admin/cinema/parts/FaceRail";
import type { CinemaCrewCredit } from "@/lib/cinema/types";

/**
 * Crew faces — director, writers, producers, composer, camera, design.
 *
 * Sorted by how central the job is, then by whether TMDB has a portrait, so the
 * usable cards sit at the front of the rail. One card per person: somebody who
 * directed *and* wrote appears once, with both jobs on the label.
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
