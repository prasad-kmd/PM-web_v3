import "server-only";
import { normalizeHandle } from "@/lib/comments/avatar";
import { NAME_MAX_LENGTH } from "@/lib/comments/limits";
import { contactEmail } from "@/lib/contact/email";

export type AdminCommentProfile = {
  name: string;
  email: string;
  github: string;
  linkedin: string;
  twitter: string;
  avatar: string;
};

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

function cleanEmail(raw: string | undefined): string | null {
  const candidate = cleanEnv(raw).toLowerCase();
  return candidate && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(candidate)
    ? candidate
    : null;
}

/**
 * Authoritative comment identity for the signed-in workspace owner.
 * Never exposed to unauthenticated callers.
 */
export function getAdminCommentProfile(): AdminCommentProfile {
  const name = (
    cleanEnv(process.env.ADMIN_DISPLAY_NAME) ||
    cleanEnv(process.env.INVOICE_BUSINESS_NAME) ||
    "Prasad Madhuranga"
  ).slice(0, NAME_MAX_LENGTH);

  const email = cleanEmail(process.env.ADMIN_COMMENT_EMAIL) || contactEmail();

  const github =
    normalizeHandle(cleanEnv(process.env.ADMIN_GITHUB_HANDLE)) || "prasad-kmd";
  const linkedin =
    normalizeHandle(cleanEnv(process.env.ADMIN_LINKEDIN_HANDLE)) ||
    "prasad-madhuranga";
  const twitter =
    normalizeHandle(cleanEnv(process.env.ADMIN_TWITTER_HANDLE)) ||
    "prasadmadhuran1";

  const avatar =
    cleanEnv(process.env.ADMIN_AVATAR_URL) || "/images/profile-placeholder.jpg";

  return {
    name,
    email,
    github,
    linkedin,
    twitter,
    avatar,
  };
}
