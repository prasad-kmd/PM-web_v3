import { NextResponse, type NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/admin/auth";
import { sameOrigin } from "@/lib/comments/request-context";
import { createClientRecord, listClients } from "@/lib/invoices/store";
import { ClientInputSchema } from "@/lib/invoices/types";

export const runtime = "nodejs";

const HEADERS = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;

  try {
    const clients = await listClients();
    return NextResponse.json({ clients }, { headers: HEADERS });
  } catch {
    return NextResponse.json(
      { error: "Unable to load client directory." },
      { status: 500, headers: HEADERS },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json(
      { error: "Cross-origin requests are not permitted." },
      { status: 403, headers: HEADERS },
    );
  }
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid client payload." },
      { status: 400, headers: HEADERS },
    );
  }

  const parsed = ClientInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Client name is required." },
      { status: 400, headers: HEADERS },
    );
  }

  try {
    const client = await createClientRecord(parsed.data);
    return NextResponse.json({ client }, { status: 201, headers: HEADERS });
  } catch {
    return NextResponse.json(
      { error: "Could not save client." },
      { status: 500, headers: HEADERS },
    );
  }
}
