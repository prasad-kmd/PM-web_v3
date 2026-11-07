import "server-only";

import { cinemaFail, cinemaOk, type CinemaResult } from "./types";

type JsonRequest = {
  url: string;
  /** Upstream name used in log lines and error messages. */
  label: string;
  timeoutMs: number;
  revalidate?: number;
  tags?: readonly string[];
  headers?: Record<string, string>;
};

/**
 * One HTTP path for every Cinema provider.
 *
 * Every failure is normalised into a `CinemaResult` error so routes never have
 * to guess whether a blank screen means "no such film", "TMDB is rate
 * limiting", or "the network hiccuped" — the reference app collapsed all three
 * into `notFound()`.
 */
export async function fetchJson<T = unknown>({
  url,
  label,
  timeoutMs,
  revalidate,
  tags,
  headers,
}: JsonRequest): Promise<CinemaResult<T>> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
        ...headers,
      },
      signal: AbortSignal.timeout(timeoutMs),
      ...(revalidate === undefined
        ? { cache: "no-store" as const }
        : { next: { revalidate, ...(tags ? { tags: [...tags] } : {}) } }),
    });
  } catch (error) {
    const isAbort =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError");
    return cinemaFail(
      isAbort ? "timeout" : "network",
      isAbort
        ? `${label} did not respond in time.`
        : `${label} could not be reached.`,
    );
  }

  if (response.status === 404) {
    return cinemaFail(
      "not_found",
      `${label} has no record for that request.`,
      404,
    );
  }
  if (response.status === 429) {
    return cinemaFail(
      "rate_limited",
      `${label} is rate limiting. Try again in a moment.`,
      429,
    );
  }
  if (response.status === 401 || response.status === 403) {
    return cinemaFail(
      "not_configured",
      `${label} rejected the configured credentials.`,
      response.status,
    );
  }
  if (!response.ok) {
    return cinemaFail(
      "upstream",
      `${label} responded with ${response.status}.`,
      response.status,
    );
  }

  try {
    return cinemaOk((await response.json()) as T);
  } catch {
    return cinemaFail(
      "invalid_payload",
      `${label} returned a response that could not be read.`,
    );
  }
}

/** `safeParse` wrapper so callers get a typed result instead of throwing. */
export function parsePayload<T>(
  schema: {
    safeParse: (
      input: unknown,
    ) => { success: true; data: T } | { success: false };
  },
  payload: unknown,
  label: string,
): CinemaResult<T> {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return cinemaFail(
      "invalid_payload",
      `${label} returned an unexpected shape.`,
    );
  }
  return cinemaOk(parsed.data);
}
