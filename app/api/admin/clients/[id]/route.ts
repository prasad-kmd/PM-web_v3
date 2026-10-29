import { NextResponse, type NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/admin/auth";
import { sameOrigin } from "@/lib/comments/request-context";
import { archiveClientRecord, updateClientRecord } from "@/lib/invoices/store";
import { ClientInputSchema } from "@/lib/invoices/types";

export const runtime = "nodejs";

const HEADERS = { "Cache-Control": "private, no-store, max-age=0" };

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  if (!sameOrigin(request)) {
    return NextResponse.json(
      { error: "Cross-origin requests are not permitted." },
      { status: 403, headers: HEADERS },
    );
  }
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
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
    const client = await updateClientRecord(id, parsed.data);
    if (!client) {
      return NextResponse.json(
        { error: "Client not found." },
        { status: 404, headers: HEADERS },
      );
    }
    return NextResponse.json({ client }, { headers: HEADERS });
  } catch {
    return NextResponse.json(
      { error: "Could not update client." },
      { status: 500, headers: HEADERS },
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!sameOrigin(request)) {
    return NextResponse.json(
      { error: "Cross-origin requests are not permitted." },
      { status: 403, headers: HEADERS },
    );
  }
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const ok = await archiveClientRecord(id);
  if (!ok) {
    return NextResponse.json(
      { error: "Client not found." },
      { status: 404, headers: HEADERS },
    );
  }
  return NextResponse.json({ ok: true }, { headers: HEADERS });
}
