import "server-only";
import { after, type NextRequest } from "next/server";
import { clientIp } from "@/lib/comments/request-context";

export type LoginAlertOutcome =
  | "succeeded"
  | "succeeded_recovery"
  | "challenge_issued"
  | "failed"
  | "rate_limited"
  | "blocked";

export type AdminLoginAlertInput = {
  request: NextRequest;
  outcome: LoginAlertOutcome;
  stage:
    | "Primary credentials"
    | "Two-step verification"
    | "Origin check"
    | "Request validation"
    | "System configuration";
  method?: string;
  reason?: string;
  username?: string | null;
  statusCode: number;
  deviceTrusted?: boolean;
  trustDurationDays?: number;
  retryAfterSeconds?: number;
};

type RateLimitSuppressionState = {
  untilMs: number;
  suppressed: number;
};

const RATE_LIMIT_COOLDOWN_MS = 2 * 60_000;
const rateLimitAlertBuckets = new Map<string, RateLimitSuppressionState>();

function cleanEnv(raw: string | undefined): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function cleanLine(value: string | null | undefined, max = 140): string {
  if (!value) return "";
  return value
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, max);
}

function safeDecodeHeader(value: string | null): string {
  if (!value) return "";
  try {
    return cleanLine(decodeURIComponent(value), 64);
  } catch {
    return cleanLine(value, 64);
  }
}

function extractLocation(request: NextRequest): string | null {
  const city =
    safeDecodeHeader(request.headers.get("x-vercel-ip-city")) ||
    safeDecodeHeader(request.headers.get("cf-ipcity"));
  const region =
    safeDecodeHeader(request.headers.get("x-vercel-ip-country-region")) ||
    safeDecodeHeader(request.headers.get("cf-region"));
  const country =
    safeDecodeHeader(request.headers.get("x-vercel-ip-country")) ||
    safeDecodeHeader(request.headers.get("cf-ipcountry"));

  const parts = [city, region, country].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

export function summarizeUserAgent(ua: string): string {
  if (!ua) return "Unknown client";

  let browser = "Browser";
  const edg = ua.match(/Edg\/(\d+)/);
  const opr = ua.match(/OPR\/(\d+)/);
  const chrome = ua.match(/Chrome\/(\d+)/);
  const firefox = ua.match(/Firefox\/(\d+)/);
  const safari = ua.match(/Version\/(\d+(?:\.\d+)?).*Safari\//);
  const curl = ua.match(
    /\b(curl|python-requests|Python-urllib|PostmanRuntime|Go-http-client)\/([\d.]+)?/i,
  );

  if (curl) {
    browser = curl[2] ? `${curl[1]}/${curl[2]}` : curl[1];
  } else if (edg) {
    browser = `Edge ${edg[1]}`;
  } else if (opr) {
    browser = `Opera ${opr[1]}`;
  } else if (chrome) {
    browser = `Chrome ${chrome[1]}`;
  } else if (firefox) {
    browser = `Firefox ${firefox[1]}`;
  } else if (safari) {
    browser = `Safari ${safari[1]}`;
  }

  let os = "";
  if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/Mac OS X|Macintosh/i.test(ua)) os = "macOS";
  else if (/Windows NT/i.test(ua)) os = "Windows";
  else if (/CrOS/i.test(ua)) os = "ChromeOS";
  else if (/Linux/i.test(ua)) os = "Linux";

  return os ? `${browser} · ${os}` : browser;
}

function formatColomboTime(date: Date): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Colombo",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

function pruneRateLimitBuckets(nowMs: number) {
  if (rateLimitAlertBuckets.size < 256) return;
  for (const [key, entry] of rateLimitAlertBuckets) {
    if (entry.untilMs <= nowMs) rateLimitAlertBuckets.delete(key);
  }
}

function checkRateLimitSuppression(
  ip: string,
  stage: string,
  outcome: LoginAlertOutcome,
): { skip: boolean; suppressedNote: string | null } {
  const nowMs = Date.now();
  pruneRateLimitBuckets(nowMs);
  const key = `${ip}:${stage}`;
  const existing = rateLimitAlertBuckets.get(key);

  if (outcome === "rate_limited") {
    if (existing && existing.untilMs > nowMs) {
      existing.suppressed += 1;
      return { skip: true, suppressedNote: null };
    }
    const prior = existing?.suppressed ?? 0;
    rateLimitAlertBuckets.set(key, {
      untilMs: nowMs + RATE_LIMIT_COOLDOWN_MS,
      suppressed: 0,
    });
    return {
      skip: false,
      suppressedNote:
        prior > 0 ? `+${prior} repeated rate-limited hits suppressed` : null,
    };
  }

  if (existing && existing.suppressed > 0) {
    const prior = existing.suppressed;
    rateLimitAlertBuckets.delete(key);
    return {
      skip: false,
      suppressedNote: `+${prior} prior rate-limited hits suppressed`,
    };
  }

  return { skip: false, suppressedNote: null };
}

function headlineFor(outcome: LoginAlertOutcome): {
  title: string;
  statusLabel: string;
  silent: boolean;
} {
  switch (outcome) {
    case "succeeded":
      return {
        title: "✅ Admin Sign-In Succeeded",
        statusLabel: "Authenticated",
        silent: false,
      };
    case "succeeded_recovery":
      return {
        title: "⚠️ Admin Sign-In Succeeded (Recovery Code)",
        statusLabel: "Authenticated via emergency recovery code",
        silent: false,
      };
    case "challenge_issued":
      return {
        title: "🔐 Admin Sign-In · Step 1 Verified",
        statusLabel: "Awaiting 2FA verification",
        silent: true,
      };
    case "rate_limited":
      return {
        title: "🚫 Admin Sign-In Rate-Limited",
        statusLabel: "Throttled",
        silent: false,
      };
    case "blocked":
      return {
        title: "🚫 Admin Sign-In Blocked",
        statusLabel: "Blocked",
        silent: false,
      };
    case "failed":
    default:
      return {
        title: "❌ Admin Sign-In Failed",
        statusLabel: "Rejected",
        silent: false,
      };
  }
}

export function buildAdminLoginTelegramMessage(
  input: AdminLoginAlertInput,
  now = new Date(),
): { html: string; plain: string; silent: boolean } | null {
  const ip = cleanLine(clientIp(input.request), 64) || "unknown";
  const { skip, suppressedNote } = checkRateLimitSuppression(
    ip,
    input.stage,
    input.outcome,
  );
  if (skip) return null;

  const { title, statusLabel, silent } = headlineFor(input.outcome);
  const rawUa = cleanLine(input.request.headers.get("user-agent"), 180);
  const device = summarizeUserAgent(rawUa);
  const location = extractLocation(input.request);
  const host = cleanLine(
    input.request.headers.get("x-forwarded-host")?.split(",")[0] ||
      input.request.headers.get("host"),
    100,
  );
  const origin = cleanLine(input.request.headers.get("origin"), 120);
  const userLabel =
    input.outcome === "succeeded" ||
    input.outcome === "succeeded_recovery" ||
    input.outcome === "challenge_issued"
      ? "Account"
      : "Attempted user";
  const username = cleanLine(input.username, 80);

  const rows: Array<[string, string, boolean?]> = [
    ["Status", `${statusLabel} (HTTP ${input.statusCode})`],
    ["Stage", input.stage],
  ];

  if (input.method) {
    rows.push(["Method", input.method]);
  }
  if (input.reason) {
    rows.push(["Reason", input.reason]);
  }
  if (username) {
    rows.push([userLabel, username, true]);
  }
  if (
    (input.outcome === "succeeded" || input.outcome === "succeeded_recovery") &&
    typeof input.deviceTrusted === "boolean"
  ) {
    const days =
      input.trustDurationDays && input.trustDurationDays > 0
        ? ` (${input.trustDurationDays}d)`
        : "";
    rows.push([
      "Trusted browser",
      input.deviceTrusted ? `Yes${days}` : "No (session only)",
    ]);
  }
  if (input.retryAfterSeconds && input.retryAfterSeconds > 0) {
    rows.push(["Retry window", `${input.retryAfterSeconds}s`]);
  }
  if (suppressedNote) {
    rows.push(["Note", suppressedNote]);
  }

  rows.push(["Time (LK)", `${formatColomboTime(now)} (UTC+05:30)`]);
  rows.push(["Time (UTC)", now.toISOString(), true]);
  rows.push(["IP", ip, true]);
  if (location) {
    rows.push(["Location", location]);
  }
  rows.push(["Device", device]);
  if (host) {
    rows.push(["Host", host, true]);
  }
  if (origin && input.stage === "Origin check") {
    rows.push(["Origin", origin, true]);
  }
  if (rawUa) {
    rows.push(["UA", rawUa]);
  }

  const htmlLines = [
    `<b>${escapeHtml(title)}</b>`,
    "",
    ...rows.map(([label, value, code]) =>
      code
        ? `<b>${escapeHtml(label)}:</b> <code>${escapeHtml(value)}</code>`
        : `<b>${escapeHtml(label)}:</b> ${escapeHtml(value)}`,
    ),
  ];

  const plainLines = [
    title,
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
  ];

  if (input.outcome === "succeeded_recovery") {
    const reminder =
      "Rotate ADMIN_TOTP_SECRET and ADMIN_RECOVERY_HASHES via scripts/generate-admin-totp.mjs when convenient.";
    htmlLines.push("", `<i>${escapeHtml(reminder)}</i>`);
    plainLines.push("", reminder);
  }

  return {
    html: htmlLines.join("\n").slice(0, 4096),
    plain: plainLines.join("\n").slice(0, 4096),
    silent,
  };
}

async function postTelegramMessage(
  token: string,
  chatId: string,
  payload: { html: string; plain: string; silent: boolean },
): Promise<void> {
  const endpoint = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: payload.html,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        ...(payload.silent ? { disable_notification: true } : {}),
      }),
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });

    if (res.ok) return;

    // Fallback to plain text if HTML formatting was rejected for any reason.
    await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: payload.plain,
        disable_web_page_preview: true,
        ...(payload.silent ? { disable_notification: true } : {}),
      }),
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
  } catch {
    // Non-blocking audit alert; never interrupt or fail authentication.
  }
}

/**
 * Schedules a non-blocking Telegram notification for any admin sign-in event
 * (successful, failed, blocked, or rate-limited) via Next.js `after()`.
 */
export function notifyAdminLoginAttempt(input: AdminLoginAlertInput): void {
  const token = cleanEnv(process.env.TELEGRAM_TOKEN);
  const chatId = cleanEnv(process.env.TELEGRAM_CHAT_ID);
  if (!token || !chatId) return;

  const built = buildAdminLoginTelegramMessage(input);
  if (!built) return;

  const task = () => postTelegramMessage(token, chatId, built);
  try {
    after(task);
  } catch {
    void task();
  }
}
