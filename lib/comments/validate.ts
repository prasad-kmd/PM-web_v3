import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { isBlockedContent } from "@/lib/contact/security";
import { normalizeHandle } from "./avatar";
import { commentConfig } from "./config";
import {
  COMMENT_MAX_LENGTH,
  COMMENT_MIN_LENGTH,
  NAME_MAX_LENGTH,
  NAME_MIN_LENGTH,
} from "./limits";
import type {
  CommentError,
  CommenterIdentity,
  ValidationResult,
} from "./types";

/**
 * Request validation for a guest comment.
 *
 * Order: shape (zod) → honeypot → disposable email → profanity. Turnstile runs
 * in the route before this, because it is the only network round-trip.
 */

const HANDLE_MAX = 64;

export const commentPayloadSchema = z.object({
  pageId: z
    .string()
    .trim()
    .regex(/^[0-9a-f-]{32,36}$/i, "Invalid page id"),
  content: z
    .string()
    .trim()
    .min(COMMENT_MIN_LENGTH, "Comment is too short")
    .max(
      COMMENT_MAX_LENGTH,
      `Comment must be under ${COMMENT_MAX_LENGTH} characters`,
    ),
  name: z
    .string()
    .trim()
    .min(NAME_MIN_LENGTH, `Name must be at least ${NAME_MIN_LENGTH} characters`)
    .max(NAME_MAX_LENGTH, `Name must be under ${NAME_MAX_LENGTH} characters`),
  email: z
    .string()
    .trim()
    .max(254, "Email is too long")
    .refine(
      (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value),
      "Enter a valid email address",
    )
    .transform((value) => value.toLowerCase()),
  github: z.string().trim().max(HANDLE_MAX).optional().nullable(),
  linkedin: z.string().trim().max(HANDLE_MAX).optional().nullable(),
  twitter: z.string().trim().max(HANDLE_MAX).optional().nullable(),
  /** Honeypot: a real visitor never sees this field, let alone fills it. */
  website: z.string().max(0).optional().nullable(),
  turnstileToken: z.string().trim().optional().nullable(),
});

export type CommentPayload = z.infer<typeof commentPayloadSchema>;

/** Normalises handles (accepts a pasted profile URL) and drops empties. */
export function normalizeIdentity(payload: CommentPayload): CommenterIdentity {
  const github = normalizeHandle(payload.github);
  const linkedin = normalizeHandle(payload.linkedin);
  const twitter = normalizeHandle(payload.twitter);
  return {
    name: payload.name.replace(/\s{2,}/g, " ").trim(),
    email: payload.email,
    ...(github ? { github } : {}),
    ...(linkedin ? { linkedin } : {}),
    ...(twitter ? { twitter } : {}),
  };
}

/**
 * The address that ends up inside the Notion comment. With
 * `COMMENTS_STORE_EMAIL=false` a truncated SHA-256 is stored instead, so repeat
 * commenters stay recognisable without keeping the address.
 */
export function storedEmail(email: string): string {
  if (commentConfig.storeEmail) return email;
  return `sha256:${createHash("sha256").update(email).digest("hex").slice(0, 16)}`;
}

export function validateCommentPayload(
  payload: CommentPayload,
): ValidationResult<CommenterIdentity> {
  if (payload.website) {
    // Tripped the honeypot — reject with a generic message so a bot learns
    // nothing about which field gave it away.
    return {
      success: false,
      error: { type: "validation", message: "Comment rejected." },
    };
  }

  if (
    isBlockedContent(payload.email, [
      payload.name,
      payload.content,
      payload.github ?? "",
      payload.linkedin ?? "",
      payload.twitter ?? "",
    ])
  ) {
    return {
      success: false,
      error: {
        type: "profanity",
        message:
          "This comment was rejected. Check the language and the email address.",
      },
    };
  }

  return { success: true, data: normalizeIdentity(payload) };
}

/** Turns zod issues into the shared error shape, never naming the honeypot. */
export function toFieldError(error: z.ZodError): CommentError {
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (key === "website") continue;
    (fields[key] ??= []).push(issue.message);
  }
  if (!Object.keys(fields).length) {
    return { type: "validation", message: "Comment rejected." };
  }
  return {
    type: "validation",
    message: "Please check the highlighted fields.",
    fields,
  };
}
