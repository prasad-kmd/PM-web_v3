/**
 * Shared types for the v3 comments subsystem.
 *
 * v3 has no accounts, so every comment is a guest comment: a name, an email and
 * optional social handles. That tuple is the *identity* everywhere below.
 *
 * The wire format in Notion is v2's: `[PMc1|Name|email|source:handle|avatar]:`
 * (see `./format.ts`), so comments written here appear in PM-Web_V2 exactly as
 * its own guest comments do, and the reverse holds too.
 */

export type SocialPlatform = "github" | "linkedin" | "twitter";

/** Raw identity as typed by the visitor. */
export type CommenterIdentity = {
  name: string;
  email: string;
  github?: string;
  linkedin?: string;
  twitter?: string;
};

/** Identity after normalisation and avatar resolution. */
export type ResolvedCommenter = {
  name: string;
  email: string;
  /** Resolved image URL, or null when nothing could be reached. */
  avatar: string | null;
  /**
   * Platform the published `handle` belongs to. Not necessarily where the
   * avatar came from: a handle is published even when its avatar lookup fails,
   * so a LinkedIn profile still shows up on the comment.
   */
  avatarSource: SocialPlatform | null;
  handle: string | null;
};

/** How a stored comment is labelled in the UI. */
export type CommentRole = "owner" | "member" | null;

/** One comment as the client receives it (no email, ever). */
export type CommentView = {
  id: string;
  createdAt: string;
  name: string;
  avatar: string | null;
  handle: string | null;
  source: SocialPlatform | null;
  role: CommentRole;
  content: string;
  /** True when written straight into Notion, not through either site. */
  isExternal: boolean;
  /** True for the pre-PMc `[Name|id|avatar]` format. */
  isLegacy: boolean;
};

export type CommentPage = {
  results: CommentView[];
  nextCursor: string | null;
  hasMore: boolean;
  /** False when this deployment has no Notion credentials. */
  configured: boolean;
};

export type CommentErrorType =
  | "validation"
  | "turnstile"
  | "profanity"
  | "temp_mail"
  | "rate_limit"
  | "notion"
  | "disabled"
  | "unknown";

export type CommentError = {
  type: CommentErrorType;
  message: string;
  /** Field-level messages when `type === "validation"`. */
  fields?: Record<string, string[]>;
};

export type ValidationResult<T> =
  { success: true; data: T } | { success: false; error: CommentError };
