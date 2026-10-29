import { NextResponse, type NextRequest } from "next/server";
import { getLatestContent, LATEST_DEFAULT_TYPES } from "@/lib/latest";
import type { ContentType } from "@/lib/notion-cms";

export const runtime = "nodejs";
/** Cached for an hour server-side; `getContentIndex` is `cache()`d per request
 *  and the route is re-buildable, so this stays cheap. */
export const revalidate = 3600;

const ALLOWED: ContentType[] = [
  "projects",
  "blog",
  "articles",
  "tutorials",
  "glossary",
  "news",
];

function parseTypes(value: string | null): ContentType[] {
  if (!value) return LATEST_DEFAULT_TYPES;
  const wanted = value
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry): entry is ContentType =>
      (ALLOWED as string[]).includes(entry),
    );
  return wanted.length ? wanted : LATEST_DEFAULT_TYPES;
}

/**
 * GET /api/latest?types=projects,articles&limit=4
 *
 * Read-only projection of the published collections for the résumé and the
 * desktop "latest content" widget. Never exposes Notion ids beyond the page id
 * that the comment system already needs, and never returns block content.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const types = parseTypes(searchParams.get("types"));
  const rawLimit = Number.parseInt(searchParams.get("limit") || "6", 10);
  const limit = Number.isFinite(rawLimit) ? rawLimit : 6;

  const result = await getLatestContent(types, limit);

  return NextResponse.json(
    {
      items: result.items,
      total: result.total,
      configured: result.configured,
      error: result.error,
      generatedAt: new Date().toISOString(),
    },
    {
      headers: {
        // Same shape as the reader: fresh enough for a widget, kind to Notion.
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
