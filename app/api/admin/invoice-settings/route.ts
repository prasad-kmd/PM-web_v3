import { NextResponse, type NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/admin/auth";
import { sameOrigin } from "@/lib/comments/request-context";
import { getInvoiceSettings, saveInvoiceSettings } from "@/lib/invoices/store";
import { InvoiceSettingsSchema } from "@/lib/invoices/types";

export const runtime = "nodejs";

const HEADERS = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;

  const settings = await getInvoiceSettings();
  return NextResponse.json({ settings }, { headers: HEADERS });
}

export async function PUT(request: NextRequest) {
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
      { error: "Invalid settings payload." },
      { status: 400, headers: HEADERS },
    );
  }

  const parsed = InvoiceSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ||
          "Please verify your business profile settings.",
      },
      { status: 400, headers: HEADERS },
    );
  }

  try {
    const settings = await saveInvoiceSettings(parsed.data);
    return NextResponse.json({ settings }, { headers: HEADERS });
  } catch {
    return NextResponse.json(
      { error: "Could not save invoice settings." },
      { status: 500, headers: HEADERS },
    );
  }
}
