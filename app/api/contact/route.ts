import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  contactLimit,
  isBlockedContent,
  verifyTurnstile,
} from "@/lib/contact/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_REQUEST = 10 * 1024 * 1024,
  MAX_FILE = 8 * 1024 * 1024;
const allowed = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "text/plain",
]);
const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().max(254),
  subject: z.string().trim().min(3).max(120),
  phone: z.union([
    z.literal(""),
    z
      .string()
      .trim()
      .regex(/^\+?[\d() .-]{7,25}$/),
  ]),
  message: z.string().trim().min(10).max(3400),
  website: z.string().max(0),
  turnstileToken: z.string().min(1).max(2048),
});
const reply = (error: string, status: number, extra?: Record<string, string>) =>
  NextResponse.json(
    { error },
    { status, headers: { "Cache-Control": "no-store", ...extra } },
  );
async function readForm(request: NextRequest): Promise<FormData> {
  if (!request.body) throw new Error("No body");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_REQUEST) {
      await reader.cancel();
      throw new RangeError("Request too large");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new Response(bytes, {
    headers: { "Content-Type": request.headers.get("content-type") || "" },
  }).formData();
}
async function send(
  method: "sendMessage" | "sendDocument",
  body: Record<string, string> | FormData,
) {
  const token = process.env.TELEGRAM_TOKEN!;
  const response = await fetch(
    `https://api.telegram.org/bot${token}/${method}`,
    {
      method: "POST",
      ...(body instanceof FormData
        ? { body }
        : {
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          }),
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    },
  );
  const result = (await response.json()) as { ok?: boolean };
  if (!response.ok || !result.ok) throw new Error("Telegram delivery failed");
}
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin) {
    try {
      if (!host || new URL(origin).host !== host)
        return reply("Cross-origin request blocked.", 403);
    } catch {
      return reply("Cross-origin request blocked.", 403);
    }
  }
  if (Number(request.headers.get("content-length") || 0) > MAX_REQUEST)
    return reply("Request is too large.", 413);
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (
    !process.env.TELEGRAM_TOKEN ||
    !chatId ||
    (process.env.NODE_ENV === "production" && !process.env.TURNSTILE_SECRET_KEY)
  )
    return reply(
      "Contact form is not configured. Please use the email address on the contact page.",
      503,
    );
  const ip = (
    request.headers.get("x-vercel-forwarded-for") ||
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for") ||
    "unknown"
  )
    .split(",")[0]
    .trim()
    .slice(0, 64);
  const retry = contactLimit(ip);
  if (retry)
    return reply("Too many messages. Please try again in a minute.", 429, {
      "Retry-After": String(retry),
    });
  let form: FormData;
  try {
    form = await readForm(request);
  } catch (error) {
    return reply(
      error instanceof RangeError
        ? "Request is too large."
        : "Could not read the form.",
      error instanceof RangeError ? 413 : 400,
    );
  }
  const field = (name: string) => {
    const value = form.get(name);
    return typeof value === "string" ? value : "";
  };
  const parsed = schema.safeParse({
    name: field("name"),
    email: field("email"),
    subject: field("subject"),
    phone: field("phone"),
    message: field("message"),
    website: field("website"),
    turnstileToken: field("turnstileToken"),
  });
  if (!parsed.success)
    return reply("Check the required fields and try again.", 400);
  const { name, email, subject, phone, message, turnstileToken } = parsed.data;
  if (isBlockedContent(email, [name, subject, message]))
    return reply(
      "Please use a non-disposable email and appropriate language.",
      400,
    );
  const attachment = form.get("attachment");
  if (attachment && typeof attachment !== "string" && attachment.size > 0) {
    const ext = attachment.name.split(".").pop()?.toLowerCase() || "";
    const validExt: Record<string, string[]> = {
      "application/pdf": ["pdf"],
      "image/png": ["png"],
      "image/jpeg": ["jpg", "jpeg"],
      "text/plain": ["txt"],
    };
    if (
      attachment.size > MAX_FILE ||
      !allowed.has(attachment.type) ||
      !validExt[attachment.type]?.includes(ext)
    )
      return reply(
        "Attachment must be PDF, PNG, JPEG or plain text under 8 MB.",
        400,
      );
    const bytes = new Uint8Array(await attachment.slice(0, 16).arrayBuffer());
    const signature = Array.from(bytes);
    const validSignature =
      attachment.type === "application/pdf"
        ? String.fromCharCode(...signature.slice(0, 5)) === "%PDF-"
        : attachment.type === "image/png"
          ? [137, 80, 78, 71, 13, 10, 26, 10].every(
              (value, i) => signature[i] === value,
            )
          : attachment.type === "image/jpeg"
            ? signature[0] === 255 &&
              signature[1] === 216 &&
              signature[2] === 255
            : !signature.includes(0);
    if (!validSignature)
      return reply("Attachment content does not match its file type.", 400);
  }
  if (!(await verifyTurnstile(turnstileToken)))
    return reply("Security verification failed. Please retry.", 403);
  const text = `New website contact\nName: ${name}\nEmail: ${email}\nPhone: ${phone || "Not provided"}\nSubject: ${subject}\n\n${message}`;
  if (text.length > 4096)
    return reply("Message exceeds Telegram’s text limit.", 400);
  try {
    await send("sendMessage", { chat_id: chatId, text });
  } catch {
    return reply(
      "Message could not be delivered. Please use a direct contact link.",
      502,
    );
  }
  if (attachment && typeof attachment !== "string" && attachment.size > 0) {
    const upload = new FormData();
    upload.set("chat_id", chatId);
    upload.set("document", attachment, attachment.name.slice(0, 100));
    upload.set(
      "caption",
      `Attachment for: ${name.slice(0, 80)} / ${subject.slice(0, 120)}`,
    );
    try {
      await send("sendDocument", upload);
    } catch {
      return NextResponse.json(
        {
          ok: true,
          warning:
            "Your message was delivered, but the attachment could not be sent. Please send the file separately.",
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
  }
  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
