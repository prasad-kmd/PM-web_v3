"use client";

import { useEffect, useRef } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
} from "motion/react";
import {
  ArrowDown01Icon,
  Cancel01Icon,
  MessageMultiple01Icon,
  RefreshIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { CommentComposer } from "./CommentComposer";
import { CommentItem } from "./CommentItem";
import { useDiscussion } from "./DiscussionContext";

const SLIDE: Transition = { type: "spring", duration: 0.42, bounce: 0.12 };
const FADE: Transition = { duration: 0.18 };

/**
 * C1 · the discussion sheet.
 *
 * Drawn inside the reader window, not in a body portal. The layer it lives in is
 * `position: sticky; height: 0` inside `.rdr-app`, so its `position: absolute`
 * children are sized to the window's visible height (`--rdr-viewport`, set by
 * ReaderProvider) and stay pinned while the article scrolls behind the scrim.
 *
 * Opening and closing are both animated: the panel slides in from the edge and
 * the scrim fades, reversed on the way out — `AnimatePresence` keeps the panel
 * mounted for that exit. Motion is skipped under `prefers-reduced-motion`.
 */
export function DiscussionSheet({ siteKey }: { siteKey: string }) {
  const {
    open,
    closePanel,
    title,
    status,
    comments,
    error,
    hasMore,
    loadingMore,
    loadMore,
    refresh,
    addComment,
    count,
    configured,
    pageId,
  } = useDiscussion();
  const sheetRef = useRef<HTMLElement | null>(null);
  const reduce = useReducedMotion();

  // Move focus into the sheet once, so keyboard and screen-reader users land in
  // the panel instead of tabbing through the article underneath.
  useEffect(() => {
    if (!open) return;
    sheetRef.current?.focus();
  }, [open]);

  const total = count === null ? null : `${count}${hasMore ? "+" : ""}`;

  return (
    <AnimatePresence>
      {open ? (
        <div className="dsn-layer">
          <motion.button
            type="button"
            className="dsn-scrim"
            aria-label="Close the discussion"
            onClick={closePanel}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reduce ? FADE : { duration: 0.22, ease: "easeOut" }}
          />
          <motion.aside
            className="dsn-sheet"
            ref={sheetRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={`Discussion — ${title}`}
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: 26 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, x: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: 26 }}
            transition={reduce ? FADE : SLIDE}
          >
            <header className="dsn-sheet-head">
              <HugeiconsIcon
                icon={MessageMultiple01Icon}
                strokeWidth={2}
                size={15}
                aria-hidden
              />
              <div>
                <p className="dsn-sheet-title">Discussion</p>
                <p className="dsn-sheet-sub">
                  {status === "loading"
                    ? "Loading…"
                    : total === null
                      ? "Newest first"
                      : `${total} ${count === 1 ? "comment" : "comments"} · newest first`}
                </p>
              </div>
              <div className="dsn-sheet-tools">
                <button
                  type="button"
                  aria-label="Reload comments"
                  onClick={refresh}
                  disabled={status === "loading"}
                >
                  <HugeiconsIcon
                    icon={RefreshIcon}
                    strokeWidth={2}
                    size={13}
                    aria-hidden
                  />
                </button>
                <button
                  type="button"
                  aria-label="Close discussion"
                  onClick={closePanel}
                >
                  <HugeiconsIcon
                    icon={Cancel01Icon}
                    strokeWidth={2}
                    size={13}
                    aria-hidden
                  />
                </button>
              </div>
            </header>

            <div className="dsn-sheet-scroll">
              {status === "loading" && !comments.length ? (
                <div className="dsn-skeletons" aria-busy="true">
                  {[0, 1, 2].map((index) => (
                    <span key={index} />
                  ))}
                  <span className="sr-only">Loading comments</span>
                </div>
              ) : null}

              {status === "error" && !comments.length ? (
                <div className="dsn-empty" role="status">
                  <span className="dsn-empty-tile" aria-hidden="true">
                    <HugeiconsIcon
                      icon={MessageMultiple01Icon}
                      strokeWidth={1.6}
                      size={18}
                    />
                  </span>
                  <strong>Comments are unavailable</strong>
                  <span>
                    {error?.message ?? "Please try again in a moment."}
                  </span>
                  <button type="button" className="dsn-retry" onClick={refresh}>
                    Try again
                  </button>
                </div>
              ) : null}

              {status === "ready" && !comments.length ? (
                <div className="dsn-empty" role="status">
                  <span className="dsn-empty-tile" aria-hidden="true">
                    <HugeiconsIcon
                      icon={MessageMultiple01Icon}
                      strokeWidth={1.6}
                      size={18}
                    />
                  </span>
                  <strong>No comments yet</strong>
                  <span>
                    {configured === false
                      ? "The discussion is not open on this deployment yet."
                      : "Be the first to leave a note on this entry."}
                  </span>
                </div>
              ) : null}

              {comments.map((comment) => (
                <CommentItem key={comment.id} comment={comment} />
              ))}

              {hasMore ? (
                <button
                  type="button"
                  className="dsn-more"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  <HugeiconsIcon
                    icon={ArrowDown01Icon}
                    strokeWidth={2}
                    size={13}
                    aria-hidden
                  />
                  {loadingMore ? "Loading…" : "Load earlier comments"}
                </button>
              ) : null}
            </div>

            <CommentComposer
              pageId={pageId}
              siteKey={siteKey}
              onPosted={addComment}
            />
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
