import type {
  CommentRole,
  CommentView,
  ResolvedCommenter,
  SocialPlatform,
} from "./types";
import { NAME_MAX_LENGTH, NOTION_COMMENT_LIMIT } from "./limits";

/**
 * The comment wire format, identical to PM-Web_V2's.
 *
 * Notion gives an integration no author metadata for the comments it creates,
 * so attribution is folded into the text:
 *
 *   [PMc1|Name|email|source:handle|avatarUrl]: body
 *   [PMc2|Name|email|source:handle|avatarUrl|role]: body
 *
 * v3 only ever *writes* PMc1 — it has no accounts, so it is a guest on v2's
 * terms, and a PMc1 comment renders in v2 exactly like one of its own. It
 * *reads* both revisions plus the two older shapes, so comments left on v2
 * (including the owner ones, which carry `role=owner`) keep working here.
 */

const SEP = "|";
const PLATFORMS: SocialPlatform[] = ["github", "linkedin", "twitter"];
const ROLES: CommentRole[] = ["owner", "member", null];

/** Strips characters that would break the pipe-delimited meta segment. */
function sanitizeSegment(value: string, max: number): string {
  return value
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[|[\]]/g, "/")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, max);
}

function encodeSource(
  source: SocialPlatform | null,
  handle: string | null,
): string {
  if (!source || !handle) return "";
  return `${source}:${sanitizeSegment(handle, 60)}`;
}

function decodeSource(segment: string): {
  source: SocialPlatform | null;
  handle: string | null;
} {
  const index = segment.indexOf(":");
  if (index < 1) return { source: null, handle: null };
  const candidate = segment.slice(0, index) as SocialPlatform;
  const handle = segment.slice(index + 1).trim();
  if (!PLATFORMS.includes(candidate) || !handle) {
    return { source: null, handle: null };
  }
  return { source: candidate, handle };
}

function decodeRole(segment: string): CommentRole {
  const value = segment.trim() as CommentRole;
  return ROLES.includes(value) ? value : null;
}

/**
 * Builds `[PMc1|…]:` for guest comments, or `[PMc2|…|role]:` when signed in
 * as the verified workspace owner.
 */
export function encodeCommentMeta(
  commenter: ResolvedCommenter,
  email: string,
  role: CommentRole = null,
): string {
  if (role === "owner" || role === "member") {
    const parts = [
      "PMc2",
      sanitizeSegment(commenter.name, NAME_MAX_LENGTH) || "Anonymous",
      sanitizeSegment(email, 254),
      encodeSource(commenter.avatarSource, commenter.handle),
      sanitizeSegment(commenter.avatar ?? "", 300),
      role,
    ];
    return `[${parts.join(SEP)}]:`;
  }
  const parts = [
    "PMc1",
    sanitizeSegment(commenter.name, NAME_MAX_LENGTH) || "Anonymous",
    sanitizeSegment(email, 254),
    encodeSource(commenter.avatarSource, commenter.handle),
    sanitizeSegment(commenter.avatar ?? "", 300),
  ];
  return `[${parts.join(SEP)}]:`;
}

/**
 * Serialises a comment for Notion. The body budget is derived from the
 * assembled meta, so meta + body always fit Notion's 2000-character cap.
 */
export function formatComment(
  commenter: ResolvedCommenter,
  email: string,
  content: string,
  role: CommentRole = null,
): string {
  const meta = encodeCommentMeta(commenter, email, role);
  const budget = NOTION_COMMENT_LIMIT - meta.length - 1;
  return `${meta} ${content.trim().slice(0, Math.max(0, budget))}`;
}

const PMc2_RE =
  /^\[PMc2\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\]:\s?([\s\S]*)$/;
const PMc1_RE = /^\[PMc1\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\]:\s?([\s\S]*)$/;
const LEGACY_RE = /^\[([^|\]]*)\|([^|\]]*)\|([^|\]]*)\]:\s?([\s\S]*)$/;

type Parsed = {
  name: string;
  email: string | null;
  avatar: string | null;
  handle: string | null;
  source: SocialPlatform | null;
  role: CommentRole;
  content: string;
  isExternal: boolean;
  isLegacy: boolean;
};

function fromSeries(
  name: string,
  email: string,
  sourceSegment: string,
  avatar: string,
  body: string,
  role: CommentRole,
): Parsed {
  const { source, handle } = decodeSource(sourceSegment.trim());
  return {
    name: name.trim() || "Anonymous",
    email: email.trim() || null,
    avatar: avatar.trim() || null,
    handle,
    source,
    role,
    content: body.trim(),
    isExternal: false,
    isLegacy: false,
  };
}

/** Decodes a stored Notion comment back into author + body. */
export function parseComment(raw: string): Parsed {
  const text = raw ?? "";

  const current = text.match(PMc2_RE);
  if (current) {
    const [, name, email, sourceSegment, avatar, role, body] = current;
    // Re-validated on the way out: a comment can be edited by hand in Notion.
    return fromSeries(
      name,
      email,
      sourceSegment,
      avatar,
      body,
      decodeRole(role),
    );
  }

  const v1 = text.match(PMc1_RE);
  if (v1) {
    const [, name, email, sourceSegment, avatar, body] = v1;
    return fromSeries(name, email, sourceSegment, avatar, body, null);
  }

  const legacy = text.match(LEGACY_RE);
  if (legacy) {
    const [, name, id, avatar, body] = legacy;
    return {
      name: name.trim() || "Anonymous",
      // The legacy shape stored a user id, not an address.
      email: null,
      avatar: avatar.trim() || null,
      handle: id.trim() || null,
      source: null,
      role: null,
      content: body.trim(),
      isExternal: false,
      isLegacy: true,
    };
  }

  return {
    name: "Author note",
    email: null,
    avatar: null,
    handle: null,
    source: null,
    role: null,
    content: text.trim(),
    isExternal: true,
    isLegacy: false,
  };
}

/**
 * Public projection of a stored comment.
 *
 * The email is deliberately dropped here rather than in the UI: it is stored so
 * the site owner can reply, not so it can be published back to every reader.
 */
export function toCommentView(
  id: string,
  createdTime: string,
  raw: string,
): CommentView {
  const parsed = parseComment(raw);
  return {
    id,
    createdAt: createdTime,
    name: parsed.name,
    avatar: parsed.avatar,
    handle: parsed.handle,
    source: parsed.source,
    role: parsed.role,
    content: parsed.content,
    isExternal: parsed.isExternal,
    isLegacy: parsed.isLegacy,
  };
}
