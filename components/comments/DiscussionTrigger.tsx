"use client";

import { useEffect, useRef } from "react";
import {
  ArrowRight01Icon,
  MessageMultiple01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { CommentAvatar } from "./CommentAvatar";
import { useDiscussion } from "./DiscussionContext";

/**
 * The "Join the discussion" card at the end of an entry.
 *
 * The comment count is lazy: the request only fires the first time this card is
 * actually scrolled into view, so a reader who never reaches the end of the
 * article never costs a Notion round-trip.
 */
export function DiscussionTrigger() {
  const { openPanel, comments, count, status, ensureLoaded } = useDiscussion();
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          ensureLoaded();
          observer.disconnect();
        }
      },
      { rootMargin: "160px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [ensureLoaded]);

  const faces = comments.slice(0, 3);
  const label =
    status === "idle" || status === "loading"
      ? "Join the discussion"
      : count
        ? `${count} ${count === 1 ? "comment" : "comments"} so far`
        : "Start the discussion";

  return (
    <div className="dsn-trigger" ref={ref}>
      <span className="dsn-trigger-tile" aria-hidden="true">
        <HugeiconsIcon
          icon={MessageMultiple01Icon}
          strokeWidth={1.7}
          size={17}
        />
      </span>
      <div className="dsn-trigger-copy">
        <strong>{label}</strong>
        <span>Leave a note for other readers — no account needed.</span>
      </div>
      {faces.length ? (
        <span className="dsn-faces" aria-hidden="true">
          {faces.map((comment) => (
            <CommentAvatar
              key={comment.id}
              name={comment.name}
              src={comment.avatar}
              size={22}
            />
          ))}
        </span>
      ) : null}
      <button type="button" className="dsn-trigger-open" onClick={openPanel}>
        Open discussion
        <HugeiconsIcon
          icon={ArrowRight01Icon}
          strokeWidth={2}
          size={13}
          aria-hidden
        />
      </button>
    </div>
  );
}
