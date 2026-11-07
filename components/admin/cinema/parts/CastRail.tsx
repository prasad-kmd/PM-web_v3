"use client";

import {
  FaceRail,
  type FaceCard,
} from "@/components/admin/cinema/parts/FaceRail";
import type { CinemaCastCredit } from "@/lib/cinema/types";

/**
 * Cast faces.
 *
 * Every card opens that person's filmography — the reference app rendered cast
 * as inert text, which is the entire reason its "select an actor" idea was
 * unreachable.
 */
export function CastRail({
  cast,
  onOpenPerson,
}: {
  cast: CinemaCastCredit[];
  onOpenPerson: (personId: number) => void;
}) {
  const people: FaceCard[] = cast.map((member) => ({
    id: member.tmdbId,
    name: member.name,
    sub: member.character,
    profilePath: member.profilePath,
  }));

  return <FaceRail label="Cast" people={people} onOpenPerson={onOpenPerson} />;
}
