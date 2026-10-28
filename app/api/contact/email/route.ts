import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { emailRevealLimit, verifyTurnstile } from "@/lib/contact/security";
import { contactEmail } from "@/lib/contact/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ token: z.string().min(1).max(2048) });

const reply = (
  body: Record<string, unknown>,
  status: number,
  extra?: Record<string, string>,
) =>
  NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
      ...extra,
    },
  });

/** Reveals the contact address to a visitor who passed Turnstile. */
export async function POST(request: NextRequest) {
  // Same-origin only (same check as the contact form route).
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin) {
    try {
      if (!host || new URL(origin).host !== host)
        return reply({ error: "Cross-origin request blocked." }, 403);
    } catch {
      return reply({ error: "Cross-origin request blocked." }, 403);
    }
  }

  if (
    process.env.NODE_ENV === "production" &&
    !process.env.TURNSTILE_SECRET_KEY
  )
    return reply({ error: "Email reveal is not configured." }, 503);

  const ip = (
    request.headers.get("x-vercel-forwarded-for") ||
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for") ||
    "unknown"
  )
    .split(",")[0]
    .trim()
    .slice(0, 64);
  const retry = emailRevealLimit(ip);
  if (retry)
    return reply(
      { error: "Too many attempts. Please try again in a minute." },
      429,
      { "Retry-After": String(retry) },
    );

  let token: string;
  try {
    token = schema.parse(await request.json()).token;
  } catch {
    return reply({ error: "Invalid request." }, 400);
  }
  if (!(await verifyTurnstile(token)))
    return reply({ error: "The security check failed. Please retry." }, 403);

  return reply({ ok: true, email: contactEmail() }, 200);
}
