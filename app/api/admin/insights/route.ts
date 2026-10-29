import { NextResponse, type NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/admin/auth";
import {
  buildInsightsCsv,
  getInsightsReport,
  isContentType,
  toColomboDateKey,
} from "@/lib/engagement/reads";
import type {
  InsightsCollectionFilter,
  InsightsRange,
} from "@/lib/engagement/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_RANGES: readonly InsightsRange[] = ["7d", "30d", "90d", "all"];

function parseRange(raw: string | null): InsightsRange {
  if (raw && (VALID_RANGES as readonly string[]).includes(raw)) {
    return raw as InsightsRange;
  }
  return "30d";
}

function parseCollection(raw: string | null): InsightsCollectionFilter {
  if (!raw || raw === "all") return "all";
  if (isContentType(raw)) return raw;
  return "all";
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const range = parseRange(searchParams.get("range"));
  const collection = parseCollection(searchParams.get("type"));
  const format = searchParams.get("format");

  const report = await getInsightsReport({ range, collection });

  if (format === "csv") {
    const csv = buildInsightsCsv(report);
    const filename = `pm-content-insights-${collection}-${range}-${toColomboDateKey()}.csv`;
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  return NextResponse.json(report, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
