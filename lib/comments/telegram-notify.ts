import "server-only";
import type { NextRequest } from "next/server";
import { clientIp } from "@/lib/comments/request-context";
import type { CommentView } from "@/lib/comments/types";
import {
  CONTENT_META,
  CONTENT_TYPES,
  type ContentType,
} from "@/lib/content-types";
import { getContentIndex } from "@/lib/notion-cms";
import { getSiteUrl } from "@/lib/site";
import {
  cleanEnvValue,
  escapeTelegramAttr,
  escapeTelegramHtml,
  formatColomboTimestamp,
  isTelegramConfigured,
  isTelegramLinkableUrl,
  scheduleTelegramNotification,
  sendTelegramMessage,
} from "@/lib/telegram";

type ResolvedEntry = {
  type: ContentType;
  slug: string;
  title: string;
  collectionLabel: string;
};

function normalizePageId(id: string): string {
  return id.replace(/-/g, "").trim().toLowerCase();
}

async function resolveEntryByPageId(
  pageId: string,
): Promise<ResolvedEntry | null> {
  const target = normalizePageId(pageId);
  if (!target) return null;

  try {
    const indexes = await Promise.all(
      CONTENT_TYPES.map((type) => getContentIndex(type)),
    );
    for (let i = 0; i < CONTENT_TYPES.length; i += 1) {
      const type = CONTENT_TYPES[i];
      const match = indexes[i].items.find(
        (item) => normalizePageId(item.id) === target,
      );
      if (match) {
        return {
          type,
          slug: match.slug,
          title: match.title,
          collectionLabel: CONTENT_META[type].label,
        };
      }
    }
  } catch {
    // Non-fatal: notification still sends with fallback pageId metadata.
  }

  return null;
}

function cleanSingleLine(value: string | null | undefined, max = 120): string {
  if (!value) return "";
  return value
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, max);
}

function extractCountry(request: NextRequest): string | null {
  const raw =
    cleanSingleLine(request.headers.get("x-vercel-ip-country"), 8) ||
    cleanSingleLine(request.headers.get("cf-ipcountry"), 8);
  if (!raw || raw === "XX" || raw === "T1") return null;
  return raw.toUpperCase();
}

/**
 * Resolves the best origin for notification deep-links:
 * 1. `getSiteUrl()` (`NEXT_PUBLIC_SITE_URL`) when it is a public domain.
 * 2. Incoming request `origin` / `x-forwarded-host` when deployed on a preview
 *    or custom domain while `NEXT_PUBLIC_SITE_URL` is still localhost.
 * 3. `getSiteUrl()` fallback (e.g. `http://localhost:3000` in local dev).
 */
function resolveNotificationOrigin(request: NextRequest): string {
  const configured = getSiteUrl().replace(/\/+$/g, "");
  if (isTelegramLinkableUrl(configured)) {
    return configured;
  }

  const reqOrigin = cleanSingleLine(request.headers.get("origin"), 160);
  if (reqOrigin && isTelegramLinkableUrl(reqOrigin)) {
    return reqOrigin.replace(/\/+$/g, "");
  }

  const fwdHost = cleanSingleLine(
    request.headers.get("x-forwarded-host")?.split(",")[0] ||
      request.headers.get("host"),
    120,
  );
  if (fwdHost) {
    const proto =
      cleanSingleLine(
        request.headers.get("x-forwarded-proto")?.split(",")[0],
        12,
      ) || "https";
    const candidate = `${proto}://${fwdHost}`;
    if (isTelegramLinkableUrl(candidate)) {
      return candidate.replace(/\/+$/g, "");
    }
  }

  return configured;
}

export type NotifyCommentPostedInput = {
  request: NextRequest;
  pageId: string;
  comment: CommentView;
  guestEmail?: string | null;
  isOwner: boolean;
};

/**
 * Schedules a non-blocking Telegram notification in the `comments` topic
 * whenever a reader posts a new comment (and optionally for owner replies if
 * `COMMENTS_NOTIFY_OWNER_POSTS=true`).
 */
export function notifyCommentPosted(input: NotifyCommentPostedInput): void {
  if (!isTelegramConfigured()) return;

  const notifyOwnerPosts =
    cleanEnvValue(process.env.COMMENTS_NOTIFY_OWNER_POSTS).toLowerCase() ===
    "true";
  if (input.isOwner && !notifyOwnerPosts) return;

  const ip = cleanSingleLine(clientIp(input.request), 64) || "unknown";
  const country = extractCountry(input.request);
  const origin = resolveNotificationOrigin(input.request);
  const now = new Date();

  scheduleTelegramNotification(async () => {
    const entry = await resolveEntryByPageId(input.pageId);
    const commentAnchor = encodeURIComponent(input.comment.id);
    const permalink = entry
      ? `${origin}/${entry.type}/${encodeURIComponent(entry.slug)}?comment=${commentAnchor}#comment-${commentAnchor}`
      : null;
    const canHyperlink = Boolean(permalink && isTelegramLinkableUrl(permalink));

    const headline = input.isOwner
      ? "💬 Owner Reply Posted"
      : "💬 New Reader Comment";

    const handleSuffix =
      input.comment.source && input.comment.handle
        ? ` (${input.comment.source}:${input.comment.handle})`
        : "";
    const authorLine = `${cleanSingleLine(input.comment.name, 80) || "Anonymous"}${handleSuffix}`;
    const bodyPreview = input.comment.content.trim().slice(0, 1200);
    const networkLine = country ? `${ip} (${country})` : ip;
    const colomboTime = formatColomboTimestamp(now);

    const htmlLines: string[] = [`<b>${escapeTelegramHtml(headline)}</b>`, ""];

    if (entry) {
      if (permalink && canHyperlink) {
        htmlLines.push(
          `<b>Entry:</b> <a href="${escapeTelegramAttr(permalink)}">${escapeTelegramHtml(entry.title)}</a> (${escapeTelegramHtml(entry.collectionLabel)})`,
        );
      } else {
        htmlLines.push(
          `<b>Entry:</b> ${escapeTelegramHtml(entry.title)} (${escapeTelegramHtml(entry.collectionLabel)})`,
        );
      }
    } else {
      htmlLines.push(
        `<b>Page ID:</b> <code>${escapeTelegramHtml(input.pageId)}</code>`,
      );
    }

    htmlLines.push(`<b>Author:</b> ${escapeTelegramHtml(authorLine)}`);
    if (input.guestEmail) {
      htmlLines.push(
        `<b>Email:</b> <code>${escapeTelegramHtml(cleanSingleLine(input.guestEmail, 160))}</code>`,
      );
    }
    htmlLines.push(`<b>Time (LK):</b> ${escapeTelegramHtml(colomboTime)}`);
    if (!input.isOwner) {
      htmlLines.push(
        `<b>Network:</b> <code>${escapeTelegramHtml(networkLine)}</code>`,
      );
    }
    htmlLines.push("", escapeTelegramHtml(bodyPreview));

    if (permalink) {
      if (canHyperlink) {
        // Include the explicit clickable URL so it is always visible & tappable
        // across all Telegram clients, alongside the inline action button below.
        htmlLines.push(
          "",
          `<b>Thread:</b> <a href="${escapeTelegramAttr(permalink)}">${escapeTelegramHtml(permalink)}</a>`,
        );
      } else {
        // Telegram strips `<a href>` on localhost/non-TLD origins; print as
        // tap-to-copy `<code>` so the URL is never lost during local testing.
        htmlLines.push(
          "",
          `<b>Local thread URL:</b> <code>${escapeTelegramHtml(permalink)}</code>`,
        );
      }
    }

    const plainLines: string[] = [
      headline,
      "",
      entry
        ? `Entry: ${entry.title} (${entry.collectionLabel})`
        : `Page ID: ${input.pageId}`,
      `Author: ${authorLine}`,
      ...(input.guestEmail ? [`Email: ${input.guestEmail}`] : []),
      `Time (LK): ${colomboTime}`,
      ...(!input.isOwner ? [`Network: ${networkLine}`] : []),
      "",
      bodyPreview,
      ...(permalink ? ["", `Thread: ${permalink}`] : []),
    ];

    await sendTelegramMessage({
      channel: "comments",
      text: htmlLines.join("\n"),
      parseMode: "HTML",
      fallbackPlainText: plainLines.join("\n"),
      ...(permalink && canHyperlink
        ? {
            replyMarkup: {
              inline_keyboard: [
                [{ text: "Open discussion thread ↗", url: permalink }],
              ],
            },
          }
        : {}),
      disableWebPagePreview: true,
    });
  });
}
