import "server-only";
import { after } from "next/server";

export type TelegramChannel = "contact" | "comments" | "auth" | "system";

export type TelegramInlineButton = {
  text: string;
  url: string;
};

export type TelegramReplyMarkup = {
  inline_keyboard: TelegramInlineButton[][];
};

const TOPIC_ENV_MAP: Record<TelegramChannel, string> = {
  contact: "TELEGRAM_TOPIC_CONTACT",
  comments: "TELEGRAM_TOPIC_COMMENTS",
  auth: "TELEGRAM_TOPIC_AUTH",
  system: "TELEGRAM_TOPIC_SYSTEM",
};

export function cleanEnvValue(raw: string | undefined): string {
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

export function escapeTelegramHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function escapeTelegramAttr(value: string): string {
  return escapeTelegramHtml(value).replace(/"/g, "&quot;");
}

/**
 * Returns `true` only when `rawUrl` uses `http:` or `https:` with a publicly
 * routable TLD hostname. Telegram's Bot API HTML parser silently strips
 * `<a href="...">` entities and rejects `inline_keyboard` URL buttons when the
 * host is `localhost`, `127.0.0.1`, or lacks a TLD dot.
 */
export function isTelegramLinkableUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    if (
      !host ||
      !host.includes(".") ||
      host === "localhost" ||
      host.endsWith(".localhost") ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      host.endsWith(".test") ||
      host.endsWith(".invalid") ||
      /^\d{1,3}(\.\d{1,3}){3}$/.test(host) ||
      host.startsWith("[")
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function formatColomboTimestamp(date = new Date()): string {
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

function getTelegramCredentials(): { token: string; chatId: string } | null {
  const token = cleanEnvValue(process.env.TELEGRAM_TOKEN);
  const chatId = cleanEnvValue(process.env.TELEGRAM_CHAT_ID);
  if (!token || !chatId) return null;
  return { token, chatId };
}

export function isTelegramConfigured(): boolean {
  return getTelegramCredentials() !== null;
}

/**
 * Resolves the optional Forum Topic `message_thread_id` for a notification
 * channel. In Telegram Forum supergroups, topic `1` represents `General`,
 * where omitting `message_thread_id` works across both forum and standard chats.
 */
export function resolveTelegramThreadId(
  channel: TelegramChannel,
): number | undefined {
  const raw = cleanEnvValue(process.env[TOPIC_ENV_MAP[channel]]);
  if (!raw) return undefined;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 1) return undefined;
  return parsed;
}

async function postJsonMethod(
  token: string,
  method: "sendMessage",
  body: Record<string, unknown>,
  timeoutMs: number,
): Promise<{ ok: boolean; status: number }> {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/${method}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
        cache: "no-store",
      },
    );
    const json = (await response.json().catch(() => null)) as {
      ok?: boolean;
    } | null;
    return {
      ok: response.ok && Boolean(json?.ok),
      status: response.status,
    };
  } catch {
    return { ok: false, status: 0 };
  }
}

export type SendTelegramMessageOptions = {
  channel: TelegramChannel;
  text: string;
  parseMode?: "HTML";
  fallbackPlainText?: string;
  replyMarkup?: TelegramReplyMarkup;
  silent?: boolean;
  disableWebPagePreview?: boolean;
  timeoutMs?: number;
};

/**
 * Sends a Telegram message routed to the channel's configured Forum Topic
 * (`message_thread_id`), automatically retrying without `message_thread_id` if
 * the topic was deleted/closed or the chat does not have Topics enabled.
 */
export async function sendTelegramMessage(
  options: SendTelegramMessageOptions,
): Promise<boolean> {
  const creds = getTelegramCredentials();
  if (!creds) return false;

  const timeoutMs = options.timeoutMs ?? 10_000;
  const threadId = resolveTelegramThreadId(options.channel);
  const disablePreview = options.disableWebPagePreview ?? true;

  const makePayload = (
    text: string,
    includeHtml: boolean,
    includeThread: boolean,
    includeMarkup: boolean,
  ): Record<string, unknown> => ({
    chat_id: creds.chatId,
    text: text.slice(0, 4096),
    ...(includeHtml ? { parse_mode: "HTML" } : {}),
    ...(disablePreview ? { disable_web_page_preview: true } : {}),
    ...(options.silent ? { disable_notification: true } : {}),
    ...(includeMarkup && options.replyMarkup
      ? { reply_markup: options.replyMarkup }
      : {}),
    ...(includeThread && threadId !== undefined
      ? { message_thread_id: threadId }
      : {}),
  });

  const useHtml = options.parseMode === "HTML";
  const first = await postJsonMethod(
    creds.token,
    "sendMessage",
    makePayload(options.text, useHtml, true, true),
    timeoutMs,
  );
  if (first.ok) return true;

  // If a topic thread ID was supplied and Telegram rejected the request (e.g.
  // HTTP 400: message thread not found / topic closed), retry in General/main.
  if (threadId !== undefined && first.status >= 400 && first.status < 500) {
    const withoutThread = await postJsonMethod(
      creds.token,
      "sendMessage",
      makePayload(options.text, useHtml, false, true),
      timeoutMs,
    );
    if (withoutThread.ok) return true;
  }

  // If inline button markup caused a 400 rejection, retry HTML without markup.
  if (options.replyMarkup && first.status >= 400 && first.status < 500) {
    const withoutMarkup = await postJsonMethod(
      creds.token,
      "sendMessage",
      makePayload(options.text, useHtml, false, false),
      timeoutMs,
    );
    if (withoutMarkup.ok) return true;
  }

  // Fallback to plain text if HTML entity parsing caused the rejection.
  if (useHtml && options.fallbackPlainText) {
    const plainAttempt = await postJsonMethod(
      creds.token,
      "sendMessage",
      makePayload(options.fallbackPlainText, false, false, false),
      timeoutMs,
    );
    if (plainAttempt.ok) return true;
  }

  return false;
}

export type SendTelegramDocumentOptions = {
  channel: TelegramChannel;
  file: Blob;
  filename: string;
  caption?: string;
  timeoutMs?: number;
};

/**
 * Uploads a document attachment to the channel's configured Forum Topic,
 * retrying without `message_thread_id` if the topic ID is rejected.
 */
export async function sendTelegramDocument(
  options: SendTelegramDocumentOptions,
): Promise<boolean> {
  const creds = getTelegramCredentials();
  if (!creds) return false;

  const timeoutMs = options.timeoutMs ?? 12_000;
  const threadId = resolveTelegramThreadId(options.channel);

  const attemptUpload = async (
    includeThread: boolean,
  ): Promise<{
    ok: boolean;
    status: number;
  }> => {
    const form = new FormData();
    form.set("chat_id", creds.chatId);
    form.set("document", options.file, options.filename.slice(0, 100));
    if (options.caption) {
      form.set("caption", options.caption.slice(0, 1024));
    }
    if (includeThread && threadId !== undefined) {
      form.set("message_thread_id", String(threadId));
    }

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${creds.token}/sendDocument`,
        {
          method: "POST",
          body: form,
          signal: AbortSignal.timeout(timeoutMs),
          cache: "no-store",
        },
      );
      const json = (await response.json().catch(() => null)) as {
        ok?: boolean;
      } | null;
      return {
        ok: response.ok && Boolean(json?.ok),
        status: response.status,
      };
    } catch {
      return { ok: false, status: 0 };
    }
  };

  const first = await attemptUpload(true);
  if (first.ok) return true;

  if (threadId !== undefined && first.status >= 400 && first.status < 500) {
    const retry = await attemptUpload(false);
    return retry.ok;
  }

  return false;
}

/**
 * Schedules a non-blocking notification via Next.js `after()` so background
 * alerts never slow down user-facing API responses.
 */
export function scheduleTelegramNotification(
  task: () => Promise<unknown>,
): void {
  const safeTask = async () => {
    try {
      await task();
    } catch {
      // Never allow background notification failures to surface as unhandled rejections.
    }
  };

  try {
    after(safeTask);
  } catch {
    void safeTask();
  }
}
