import { NextResponse, type NextRequest } from "next/server";
import { getAdminSession } from "@/lib/admin/auth";
import { getAdminCommentProfile } from "@/lib/admin/comment-profile";
import { verifyTurnstile } from "@/lib/contact/security";
import { createNotionClient } from "@/lib/notion-cms";
import { resolveAvatar } from "@/lib/comments/avatar";
import { commentConfig } from "@/lib/comments/config";
import { formatComment, toCommentView } from "@/lib/comments/format";
import { identitySetCookie } from "@/lib/comments/identity-cookie";
import { COMMENTS_PAGE_SIZE } from "@/lib/comments/limits";
import {
  commentBurstLimit,
  commentDailyLimit,
  commentReadLimit,
} from "@/lib/comments/rate-limit";
import {
  getHiddenCommentIds,
  isCommentModerationWritable,
} from "@/lib/comments/moderation";
import { clientIp, sameOrigin } from "@/lib/comments/request-context";
import { notifyCommentPosted } from "@/lib/comments/telegram-notify";
import type { CommentPage, CommentView } from "@/lib/comments/types";
import {
  commentPayloadSchema,
  ownerCommentPayloadSchema,
  storedEmail,
  toFieldError,
  validateCommentPayload,
} from "@/lib/comments/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_ID_RE = /^[0-9a-f-]{32,36}$/i;

function notionToken(): string | null {
  return (
    process.env.NOTION_API_KEY ||
    process.env.NOTION_AUTH_TOKEN ||
    process.env.NOTION_API_TOKEN ||
    null
  );
}

function noStore(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: { "Cache-Control": "no-store", ...(init?.headers ?? {}) },
  });
}

/**
 * GET /api/comments?pageId=…&cursor=…
 *
 * Reads native Notion comments for one page. Newest first, 25 at a time.
 * The author's email is stripped in `toCommentView` — it is stored so the site
 * owner can reply, not so it can be republished to every reader.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pageId = (searchParams.get("pageId") ?? "").trim();
  const cursor = searchParams.get("cursor")?.trim() || undefined;

  if (!PAGE_ID_RE.test(pageId)) {
    return noStore(
      { error: { type: "validation", message: "Invalid page id." } },
      { status: 400 },
    );
  }

  const wait = commentReadLimit(clientIp(request));
  if (wait) {
    return noStore(
      {
        error: {
          type: "rate_limit",
          message: `Reading too quickly. Try again in ${wait}s.`,
        },
      },
      { status: 429, headers: { "Retry-After": String(wait) } },
    );
  }

  if (!notionToken()) {
    const empty: CommentPage = {
      results: [],
      nextCursor: null,
      hasMore: false,
      configured: false,
    };
    return noStore(empty);
  }

  try {
    const notion = createNotionClient("no-store");
    const [response, hiddenIds, adminSession] = await Promise.all([
      notion.comments.list({
        block_id: pageId,
        page_size: COMMENTS_PAGE_SIZE,
        ...(cursor ? { start_cursor: cursor } : {}),
      }),
      getHiddenCommentIds(),
      getAdminSession(request),
    ]);
    const isAdmin = adminSession !== null;

    const mapped: CommentView[] = response.results.map((comment) => {
      const view = toCommentView(
        comment.id,
        comment.created_time,
        (comment.rich_text ?? [])
          .map((item) => ("plain_text" in item ? item.plain_text : ""))
          .join(""),
      );
      if (hiddenIds.has(view.id)) {
        return { ...view, hidden: true };
      }
      return view;
    });

    const results = isAdmin
      ? mapped
      : mapped.filter((comment) => !comment.hidden);

    const page: CommentPage = {
      results,
      nextCursor: response.next_cursor ?? null,
      hasMore: Boolean(response.has_more),
      configured: true,
      ...(isAdmin ? { moderationEnabled: isCommentModerationWritable() } : {}),
    };
    return noStore(page);
  } catch (error) {
    console.error("Unable to list Notion comments:", error);
    return noStore(
      {
        error: {
          type: "notion",
          message: "Comments are temporarily unavailable.",
        },
      },
      { status: 502 },
    );
  }
}

/**
 * POST /api/comments
 *
 * Supports both guest comments (`PMc1`) and verified workspace-owner comments
 * (`PMc2` with `role=owner`) when an authenticated admin session cookie is present.
 */
export async function POST(request: NextRequest) {
  if (!commentConfig.enabled) {
    return noStore(
      {
        error: { type: "disabled", message: "Comments are closed right now." },
      },
      { status: 403 },
    );
  }

  if (!sameOrigin(request)) {
    return noStore(
      { error: { type: "validation", message: "Request rejected." } },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return noStore(
      { error: { type: "validation", message: "Malformed request." } },
      { status: 400 },
    );
  }

  const adminSession = await getAdminSession(request);
  const wantsOwnerMode =
    adminSession !== null &&
    (typeof body !== "object" ||
      body === null ||
      !("asOwner" in body) ||
      (body as { asOwner?: unknown }).asOwner !== false);

  // --- Authenticated Owner Path (`PMc2` with `role=owner`) ---
  if (wantsOwnerMode) {
    const parsedOwner = ownerCommentPayloadSchema.safeParse(body);
    if (!parsedOwner.success) {
      return noStore(
        { error: toFieldError(parsedOwner.error) },
        { status: 400 },
      );
    }
    if (parsedOwner.data.website) {
      return noStore(
        { error: { type: "validation", message: "Comment rejected." } },
        { status: 400 },
      );
    }
    if (!notionToken()) {
      return noStore(
        {
          error: {
            type: "notion",
            message: "Comments are not available on this deployment.",
          },
        },
        { status: 503 },
      );
    }

    const adminProfile = getAdminCommentProfile();
    try {
      const resolved = await resolveAvatar({
        github: adminProfile.github || null,
        twitter: adminProfile.twitter || null,
        linkedin: adminProfile.linkedin || null,
      });

      const given = (
        [
          ["github", adminProfile.github],
          ["twitter", adminProfile.twitter],
          ["linkedin", adminProfile.linkedin],
        ] as const
      ).find(([, handle]) => Boolean(handle));

      const commenter = {
        name: adminProfile.name,
        email: adminProfile.email,
        avatar: resolved.avatar,
        avatarSource: resolved.source ?? given?.[0] ?? null,
        handle: resolved.handle ?? given?.[1] ?? null,
      };

      const text = formatComment(
        commenter,
        storedEmail(adminProfile.email),
        parsedOwner.data.content,
        "owner",
      );

      const notion = createNotionClient("no-store");
      const created = await notion.comments.create({
        parent: { page_id: parsedOwner.data.pageId },
        markdown: text,
      });

      const createdTime =
        "created_time" in created && typeof created.created_time === "string"
          ? created.created_time
          : new Date().toISOString();
      const view = toCommentView(created.id, createdTime, text);

      notifyCommentPosted({
        request,
        pageId: parsedOwner.data.pageId,
        comment: view,
        isOwner: true,
      });

      return noStore({ comment: view });
    } catch (error) {
      console.error("Unable to create owner comment:", error);
      return noStore(
        {
          error: {
            type: "notion",
            message:
              "The comment could not be saved. Please try again in a moment.",
          },
        },
        { status: 502 },
      );
    }
  }

  // --- Guest Path (`PMc1`) ---
  const ip = clientIp(request);
  const burstWait = commentBurstLimit(ip);
  if (burstWait) {
    return noStore(
      {
        error: {
          type: "rate_limit",
          message: `You are posting quickly. Try again in ${burstWait}s.`,
        },
      },
      { status: 429, headers: { "Retry-After": String(burstWait) } },
    );
  }
  const dailyWait = commentDailyLimit(ip);
  if (dailyWait) {
    return noStore(
      {
        error: {
          type: "rate_limit",
          message:
            "You have reached the daily comment limit. Try again tomorrow.",
        },
      },
      { status: 429, headers: { "Retry-After": String(dailyWait) } },
    );
  }

  const parsed = commentPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return noStore({ error: toFieldError(parsed.error) }, { status: 400 });
  }
  const payload = parsed.data;

  if (!notionToken()) {
    return noStore(
      {
        error: {
          type: "notion",
          message: "Comments are not available on this deployment.",
        },
      },
      { status: 503 },
    );
  }

  const validated = validateCommentPayload(payload);
  if (!validated.success) {
    return noStore({ error: validated.error }, { status: 400 });
  }

  const tokenOk = await verifyTurnstile(payload.turnstileToken ?? "");
  if (!tokenOk) {
    return noStore(
      {
        error: {
          type: "turnstile",
          message: "The security check failed. Please try again.",
        },
      },
      { status: 400 },
    );
  }

  const identity = validated.data;

  try {
    const resolved = await resolveAvatar({
      github: identity.github ?? null,
      twitter: identity.twitter ?? null,
      linkedin: identity.linkedin ?? null,
    });

    /**
     * The handle is published even when no avatar could be resolved.
     *
     * Notion stores one `source:handle` pair per comment, so a visitor's links
     * compete for it. Prefer the platform that produced an avatar; otherwise
     * fall back to whatever they actually gave, in GitHub → X → LinkedIn order.
     * Without this, a LinkedIn handle (whose avatar lookup almost always fails)
     * vanished from the posted comment entirely.
     */
    const given = (
      [
        ["github", identity.github],
        ["twitter", identity.twitter],
        ["linkedin", identity.linkedin],
      ] as const
    ).find(([, handle]) => Boolean(handle));

    const commenter = {
      name: identity.name,
      email: identity.email,
      avatar: resolved.avatar,
      avatarSource: resolved.source ?? given?.[0] ?? null,
      handle: resolved.handle ?? given?.[1] ?? null,
    };

    const text = formatComment(
      commenter,
      storedEmail(identity.email),
      payload.content,
    );

    const notion = createNotionClient("no-store");
    const created = await notion.comments.create({
      parent: { page_id: payload.pageId },
      markdown: text,
    });

    // `create` may answer with a partial object; the payload we just wrote is
    // the authoritative text either way.
    const createdTime =
      "created_time" in created && typeof created.created_time === "string"
        ? created.created_time
        : new Date().toISOString();
    const view = toCommentView(created.id, createdTime, text);

    notifyCommentPosted({
      request,
      pageId: payload.pageId,
      comment: view,
      guestEmail: identity.email,
      isOwner: false,
    });

    const response = noStore({ comment: view, identity });
    response.headers.append(
      "Set-Cookie",
      identitySetCookie({
        name: identity.name,
        email: identity.email,
        ...(identity.github ? { github: identity.github } : {}),
        ...(identity.linkedin ? { linkedin: identity.linkedin } : {}),
        ...(identity.twitter ? { twitter: identity.twitter } : {}),
      }),
    );
    return response;
  } catch (error) {
    console.error("Unable to create Notion comment:", error);
    return noStore(
      {
        error: {
          type: "notion",
          message:
            "The comment could not be saved. Please try again in a moment.",
        },
      },
      { status: 502 },
    );
  }
}
