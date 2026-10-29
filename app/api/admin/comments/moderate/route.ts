import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin/auth";
import {
  isCommentModerationWritable,
  setCommentHiddenState,
} from "@/lib/comments/moderation";
import { sameOrigin } from "@/lib/comments/request-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  commentId: z.string().trim().min(4).max(120),
  pageId: z.string().trim().max(80).optional(),
  hidden: z.boolean(),
});

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json(
      { error: "Cross-origin requests are not permitted." },
      { status: 403, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;

  if (!isCommentModerationWritable()) {
    return NextResponse.json(
      { error: "Comment moderation storage is not configured." },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Malformed request payload." },
      { status: 400, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid comment moderation payload." },
      { status: 400, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const ok = await setCommentHiddenState(parsed.data);
  if (!ok) {
    return NextResponse.json(
      { error: "Could not update comment visibility." },
      { status: 502, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      commentId: parsed.data.commentId,
      hidden: parsed.data.hidden,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
