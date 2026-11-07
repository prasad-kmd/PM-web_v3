import { NextResponse, type NextRequest } from "next/server";

import { requireAdminSession } from "@/lib/admin/auth";
import { probePlaybackProviders } from "@/lib/cinema/player-probe";
import { buildPlayerSources, prioritiseProvider } from "@/lib/cinema/vidsrc";
import type {
  CinemaMediaType,
  CinemaPlaybackRequest,
  CinemaPlayerSource,
} from "@/lib/cinema/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "private, no-store, max-age=0" };

function parseIndex(value: string | null): number | null {
  if (value === null || value === "") return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/**
 * Playback sources for one title/episode.
 *
 * `vidsrc.to` is first by policy (see `CINEMA_PLAYBACK_PROVIDERS`); providers
 * whose origin did not answer are pushed to the back of the chain but are still
 * offered — a probe failure is advisory, never a veto, because these hosts
 * routinely reject non-browser requests while working fine in an iframe.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;

  const params = request.nextUrl.searchParams;
  const type = params.get("type");
  const tmdbId = Number.parseInt(params.get("id") ?? "", 10);

  if (type !== "movie" && type !== "tv") {
    return NextResponse.json(
      { error: "Unknown media type." },
      { status: 400, headers: HEADERS },
    );
  }
  if (!Number.isFinite(tmdbId) || tmdbId <= 0) {
    return NextResponse.json(
      { error: "Unknown title." },
      { status: 400, headers: HEADERS },
    );
  }

  const season = parseIndex(params.get("season"));
  const episode = parseIndex(params.get("episode"));
  const preferred = params.get("provider");

  const request_: CinemaPlaybackRequest = {
    mediaType: type as CinemaMediaType,
    tmdbId,
    season: type === "tv" ? season : null,
    episode: type === "tv" ? episode : null,
  };

  const [probed] = await Promise.all([probePlaybackProviders()]);

  const sources: CinemaPlayerSource[] = buildPlayerSources(request_).map(
    (source) => ({
      ...source,
      reachable: probed[source.providerId] ?? null,
    }),
  );

  const rank = (source: CinemaPlayerSource) =>
    source.reachable === true ? 0 : source.reachable === null ? 1 : 2;

  const ordered = [...sources].sort((a, b) => rank(a) - rank(b));

  return NextResponse.json(
    {
      sources: prioritiseProvider(ordered, preferred),
      mediaType: type,
      tmdbId,
      season: request_.season,
      episode: request_.episode,
    },
    { headers: HEADERS },
  );
}
