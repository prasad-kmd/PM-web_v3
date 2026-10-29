import { NextResponse, type NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/admin/auth";
import { sameOrigin } from "@/lib/comments/request-context";
import {
  createInvoice,
  getInvoiceSettings,
  getInvoiceStorageMode,
  listClients,
  listInvoices,
} from "@/lib/invoices/store";
import { InvoiceInputSchema } from "@/lib/invoices/types";

export const runtime = "nodejs";

const HEADERS = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;

  try {
    const [{ invoices, storageMode }, clients, settings] = await Promise.all([
      listInvoices(),
      listClients(),
      getInvoiceSettings(),
    ]);
    return NextResponse.json(
      { invoices, clients, settings, storageMode },
      { headers: HEADERS },
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to load ledger records right now." },
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
    const invoice = await createInvoice(parsed.data);
    return NextResponse.json(
      { invoice, storageMode: getInvoiceStorageMode() },
      { status: 201, headers: HEADERS },
    );
  } catch {
    return NextResponse.json(
      { error: "Could not save invoice to ledger." },
      { status: 500, headers: HEADERS },
    );
  }
}
