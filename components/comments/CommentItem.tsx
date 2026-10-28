"use client";

import { useState } from "react";
import {
  CheckmarkCircle02Icon,
  Copy01Icon,
  Github01Icon,
  Linkedin01Icon,
  Link01Icon,
  NewTwitterIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { CommentView } from "@/lib/comments/types";
import { CommentAvatar } from "./CommentAvatar";

const formatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const shortFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
});

function relativeTime(value: string): string {
  const stamp = Date.parse(value);
  if (!Number.isFinite(stamp)) return "";
  const diff = Date.now() - stamp;
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return "Just now";
  if (diff < hour) return `${Math.floor(diff / minute)}m`;
  if (diff < day) return `${Math.floor(diff / hour)}h`;
  if (diff < 2 * day) return "Yesterday";
  if (diff < 7 * day) return `${Math.floor(diff / day)}d`;
  if (diff < 365 * day) return shortFormatter.format(stamp);
  return formatter.format(stamp);
}

type Badge = {
  /** Accessible name and tooltip: the platform is never spelled out visually. */
  label: string;
  tone: string;
  /** Platform marks render as a glyph; owner/legacy badges stay as words. */
  icon?: typeof Github01Icon;
};

function badge(comment: CommentView): Badge | null {
  if (comment.role === "owner") return { label: "Owner", tone: "owner" };
  if (comment.isExternal) return { label: "Direct note", tone: "muted" };
  if (comment.isLegacy) return { label: "Earlier comment", tone: "muted" };
  if (comment.source === "github")
    return { label: "via GitHub", tone: "muted", icon: Github01Icon };
  if (comment.source === "twitter")
    return { label: "via X", tone: "muted", icon: NewTwitterIcon };
  if (comment.source === "linkedin")
    return { label: "via LinkedIn", tone: "muted", icon: Linkedin01Icon };
  return null;
}

export function CommentItem({ comment }: { comment: CommentView }) {
  const [copied, setCopied] = useState(false);
  const tag = badge(comment);
  const profile =
    comment.source === "github" && comment.handle
      ? `https://github.com/${comment.handle}`
      : comment.source === "twitter" && comment.handle
        ? `https://x.com/${comment.handle}`
        : comment.source === "linkedin" && comment.handle
          ? `https://www.linkedin.com/in/${comment.handle}`
          : null;

  async function copyLink() {
    try {
      const url = new URL(window.location.href);
      url.hash = `comment-${comment.id}`;
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard is optional */
    }
  }

  return (
    <article className="dsn-comment" id={`comment-${comment.id}`}>
      <CommentAvatar name={comment.name} src={comment.avatar} />
      <div className="dsn-comment-body">
        <div className="dsn-comment-head">
          <strong>
            {profile ? (
              <a href={profile} target="_blank" rel="noreferrer noopener">
                {comment.name}
              </a>
            ) : (
              comment.name
            )}
          </strong>
          {tag ? (
            tag.icon ? (
              <span
                className="dsn-tag dsn-tag-icon"
                data-tone={tag.tone}
                role="img"
                aria-label={tag.label}
                title={tag.label}
              >
                <HugeiconsIcon
                  icon={tag.icon}
                  strokeWidth={1.8}
                  size={11}
                  aria-hidden
                />
              </span>
            ) : (
              <span className="dsn-tag" data-tone={tag.tone}>
                {tag.label}
              </span>
            )
          ) : null}
          <time
            dateTime={comment.createdAt}
            title={formatter.format(Date.parse(comment.createdAt) || 0)}
          >
            {relativeTime(comment.createdAt)}
          </time>
        </div>
        <p className="dsn-comment-text">{comment.content}</p>
        <div className="dsn-comment-actions">
          <button type="button" onClick={copyLink}>
            <HugeiconsIcon
              icon={copied ? CheckmarkCircle02Icon : Copy01Icon}
              strokeWidth={2}
              size={12}
              aria-hidden
            />
            {copied ? "Copied" : "Copy link"}
          </button>
          <a href={`#comment-${comment.id}`}>
            <HugeiconsIcon
              icon={Link01Icon}
              strokeWidth={2}
              size={12}
              aria-hidden
            />
            Permalink
          </a>
        </div>
      </div>
    </article>
  );
}
