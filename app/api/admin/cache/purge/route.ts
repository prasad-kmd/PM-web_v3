import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/admin/auth";
import { sameOrigin } from "@/lib/comments/request-context";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json(
      { error: "Cross-origin requests are not permitted." },
      { status: 403 },
    );
  }
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;

  // Shared tag covers CMS-backed details and generated taxonomy pages that are
  // not practical to enumerate; `max` intentionally keeps SWR semantics.
  revalidateTag("notion-cms", "max");
  for (const path of [
    "/projects",
    "/blog",
    "/articles",
    "/tutorials",
    "/glossary",
    "/news",
    "/categories",
    "/tags",
    "/api/latest",
    "/api/search-index",
    "/api/reader/pulse",
    "/llms.txt",
    "/feed.xml",
    "/rss.xml",
    "/sitemap.xml",
  ]) {
    revalidatePath(path);
  }

  return NextResponse.json(
    { ok: true, refreshedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
