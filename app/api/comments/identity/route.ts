import { NextResponse } from "next/server";
import { identityClearCookie } from "@/lib/comments/identity-cookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DELETE /api/comments/identity
 *
 * Forgets the `pm_commenter` cookie. The client also clears it directly (it is
 * not HttpOnly, so the composer can prefill) — this endpoint exists for callers
 * that would rather not touch `document.cookie`, and so the intent has a name.
 */
export function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.headers.append("Set-Cookie", identityClearCookie());
  response.headers.set("Cache-Control", "no-store");
  return response;
}
