import { NextResponse, type NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/admin/auth";
import { sameOrigin } from "@/lib/comments/request-context";
import {
  archiveInvoice,
  getInvoiceById,
  updateInvoice,
} from "@/lib/invoices/store";
import { InvoiceInputSchema } from "@/lib/invoices/types";

export const runtime = "nodejs";

const HEADERS = { "Cache-Control": "private, no-store, max-age=0" };

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const invoice = await getInvoiceById(id);
  if (!invoice) {
    return NextResponse.json(
      { error: "Invoice not found." },
      { status: 404, headers: HEADERS },
    );
  }
  return NextResponse.json({ invoice }, { headers: HEADERS });
}

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
      { error: "Invalid invoice payload." },
      { status: 400, headers: HEADERS },
    );
  }

  const parsed = InvoiceInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ||
          "Check invoice fields and line items.",
      },
      { status: 400, headers: HEADERS },
    );
  }

  try {
    const invoice = await updateInvoice(id, parsed.data);
    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found." },
        { status: 404, headers: HEADERS },
      );
    }
    return NextResponse.json({ invoice }, { headers: HEADERS });
  } catch {
    return NextResponse.json(
      { error: "Could not update invoice." },
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
  const archived = await archiveInvoice(id);
  if (!archived) {
    return NextResponse.json(
      { error: "Could not remove invoice." },
      { status: 404, headers: HEADERS },
    );
  }
  return NextResponse.json({ ok: true }, { headers: HEADERS });
}
