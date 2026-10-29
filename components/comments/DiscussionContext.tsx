"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { CommentError, CommentView } from "@/lib/comments/types";

/**
 * State shared by the discussion trigger and the sheet.
 *
 * They are drawn in different places (the trigger at the end of the article,
 * the sheet pinned to the window), so the state lives above both. Nothing here
 * portals: the sheet is positioned inside the reader window, which is what lets
 * it survive the frozen route snapshot the desktop keeps behind other windows.
 */

type Status = "idle" | "loading" | "ready" | "error";

type DiscussionValue = {
  pageId: string;
  title: string;
  open: boolean;
  openPanel: () => void;
  closePanel: () => void;
  status: Status;
  comments: CommentView[];
  error: CommentError | null;
  hasMore: boolean;
  loadingMore: boolean;
  loadMore: () => void;
  refresh: () => void;
  addComment: (comment: CommentView) => void;
  toggleCommentHidden: (commentId: string, hidden: boolean) => Promise<boolean>;
  moderationEnabled: boolean;
  /** Number of comments known so far, or null before the first fetch. */
  count: number | null;
  configured: boolean | null;
  ensureLoaded: () => void;
};

const DiscussionContext = createContext<DiscussionValue | null>(null);

export function useDiscussion() {
  const value = useContext(DiscussionContext);
  if (!value) {
    throw new Error("useDiscussion must be used inside <DiscussionProvider>");
  }
  return value;
}

export function DiscussionProvider({
  pageId,
  title,
  children,
}: {
  pageId: string;
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [comments, setComments] = useState<CommentView[]>([]);
  const [error, setError] = useState<CommentError | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [moderationEnabled, setModerationEnabled] = useState(false);
  const requested = useRef(false);

  const load = useCallback(
    async (mode: "first" | "more") => {
      if (mode === "first") {
        setStatus("loading");
        setError(null);
      } else {
        setLoadingMore(true);
      }
      try {
        const query = new URLSearchParams({ pageId });
        if (mode === "more" && cursor) query.set("cursor", cursor);
        const response = await fetch(`/api/comments?${query}`, {
          cache: "no-store",
        });
        const data = (await response.json()) as {
          results?: CommentView[];
          nextCursor?: string | null;
          hasMore?: boolean;
          configured?: boolean;
          moderationEnabled?: boolean;
          error?: CommentError;
        };
        if (!response.ok) {
          setStatus("error");
          setError(
            data.error ?? {
              type: "unknown",
              message: "Comments could not be loaded.",
            },
          );
          return;
        }
        setConfigured(data.configured ?? true);
        if (typeof data.moderationEnabled === "boolean") {
          setModerationEnabled(data.moderationEnabled);
        }
        setComments((current) =>
          mode === "first"
            ? (data.results ?? [])
            : [...current, ...(data.results ?? [])],
        );
        setCursor(data.nextCursor ?? null);
        setHasMore(Boolean(data.hasMore));
        setStatus("ready");
      } catch {
        setStatus("error");
        setError({
          type: "unknown",
          message: "The connection dropped before comments could load.",
        });
      } finally {
        setLoadingMore(false);
      }
    },
    [cursor, pageId],
  );

  const ensureLoaded = useCallback(() => {
    if (requested.current) return;
    requested.current = true;
    void load("first");
  }, [load]);

  const openPanel = useCallback(() => {
    setOpen(true);
    ensureLoaded();
  }, [ensureLoaded]);

  const closePanel = useCallback(() => setOpen(false), []);
  const refresh = useCallback(() => {
    requested.current = true;
    setCursor(null);
    void load("first");
  }, [load]);
  const loadMore = useCallback(() => {
    if (hasMore && !loadingMore) void load("more");
  }, [hasMore, load, loadingMore]);

  const addComment = useCallback((comment: CommentView) => {
    setComments((current) => [comment, ...current]);
    setStatus("ready");
    setConfigured(true);
  }, []);

  const toggleCommentHidden = useCallback(
    async (commentId: string, hidden: boolean): Promise<boolean> => {
      try {
        const res = await fetch("/api/admin/comments/moderate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ commentId, pageId, hidden }),
        });
        if (!res.ok) return false;
        setComments((current) =>
          current.map((item) =>
            item.id === commentId ? { ...item, hidden } : item,
          ),
        );
        return true;
      } catch {
        return false;
      }
    },
    [pageId],
  );

  // Auto-open the discussion sheet and scroll to the target comment when a
  // `#comment-<id>` hash or `?comment=<id>` query link is visited directly.
  useEffect(() => {
    const resolveLinkedCommentId = (): string | null => {
      if (window.location.hash.startsWith("#comment-")) {
        return decodeURIComponent(
          window.location.hash.slice("#comment-".length),
        );
      }
      const qp = new URLSearchParams(window.location.search).get("comment");
      return qp ? qp.trim() : null;
    };

    const syncCommentLink = () => {
      if (resolveLinkedCommentId()) {
        openPanel();
      }
    };
    syncCommentLink();
    window.addEventListener("hashchange", syncCommentLink);
    return () => window.removeEventListener("hashchange", syncCommentLink);
  }, [openPanel]);

  useEffect(() => {
    if (!open || status !== "ready") return;
    let targetId: string | null = null;
    if (window.location.hash.startsWith("#comment-")) {
      targetId = `comment-${decodeURIComponent(window.location.hash.slice("#comment-".length))}`;
    } else {
      const qp = new URLSearchParams(window.location.search).get("comment");
      if (qp?.trim()) targetId = `comment-${qp.trim()}`;
    }
    if (!targetId) return;
    const timer = window.setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [comments.length, open, status]);

  // Escape closes the sheet, like every other overlay on the desktop.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePanel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closePanel, open]);

  const value = useMemo<DiscussionValue>(
    () => ({
      pageId,
      title,
      open,
      openPanel,
      closePanel,
      status,
      comments,
      error,
      hasMore,
      loadingMore,
      loadMore,
      refresh,
      addComment,
      toggleCommentHidden,
      moderationEnabled,
      count:
        status === "idle"
          ? null
          : comments.filter((item) => !item.hidden).length,
      configured,
      ensureLoaded,
    }),
    [
      addComment,
      closePanel,
      comments,
      configured,
      ensureLoaded,
      error,
      hasMore,
      loadingMore,
      loadMore,
      moderationEnabled,
      open,
      openPanel,
      pageId,
      refresh,
      status,
      title,
      toggleCommentHidden,
    ],
  );

  return (
    <DiscussionContext.Provider value={value}>
      {children}
    </DiscussionContext.Provider>
  );
}
