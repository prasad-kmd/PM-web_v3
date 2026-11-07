"use client";

import {
  FaceRail,
  type FaceCard,
} from "@/components/admin/cinema/parts/FaceRail";
import {
  principalLabel,
  principalRank,
} from "@/components/admin/cinema/parts/crew-jobs";
import type { CinemaCreatorCredit, CinemaCrewCredit } from "@/lib/cinema/types";

/**
 * Key crew — the people whose names belong next to the title.
 *
 * Director first, then creators, writers, producers, composer, cinematographer,
 * editor, designers, casting and VFX. One card per person with the most central
 * job they held on this title; a writer-director reads "Director", not two
 * cards. Everything TMDB lists beyond this lives in the crew rail under the
 * cast, so stunts and second-unit never crowd out the principals.
 */
export function PrincipalCrewRail({
  crew,
  creators,
  onOpenPerson,
  limit = 18,
}: {
  crew: CinemaCrewCredit[];
  /** `created_by` — series only, and not in the crew list. */
  creators?: CinemaCreatorCredit[];
  onOpenPerson: (personId: number) => void;
  limit?: number;
}) {
  type Entry = {
    id: number;
    name: string;
    rank: number;
    label: string;
    profilePath: string | null;
  };

  const byPerson = new Map<number, Entry>();

  const consider = (entry: Entry) => {
    const existing = byPerson.get(entry.id);
    if (!existing) {
      byPerson.set(entry.id, entry);
      return;
    }
    if (entry.rank < existing.rank) {
      byPerson.set(entry.id, { ...entry, profilePath: existing.profilePath });
      return;
    }
    if (!existing.profilePath && entry.profilePath) {
      existing.profilePath = entry.profilePath;
    }
  };

  for (const creator of creators ?? []) {
    const rank = principalRank("Creator") ?? 1;
    consider({
      id: creator.tmdbId,
      name: creator.name,
      rank,
      label: "Creator",
      profilePath: creator.profilePath,
    });
  }

  for (const member of crew) {
    const rank = principalRank(member.job);
    const label = principalLabel(member.job);
    if (rank === null || !label) continue;
    consider({
      id: member.tmdbId,
      name: member.name,
      rank,
      label,
      profilePath: member.profilePath,
    });
  }

  const people: FaceCard[] = [...byPerson.values()]
    .sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      if (Boolean(a.profilePath) !== Boolean(b.profilePath)) {
        return a.profilePath ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    })
    .slice(0, limit)
    .map((person) => ({
      id: person.id,
      name: person.name,
      sub: person.label,
      profilePath: person.profilePath,
    }));

  return (
    <FaceRail label="Key crew" people={people} onOpenPerson={onOpenPerson} />
  );
}
