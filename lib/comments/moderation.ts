import "server-only";
import { revalidateTag } from "next/cache";
import {
  decodeRtdbKey,
  encodeRtdbKey,
  isFirebaseConfigured,
  rtdbDelete,
  rtdbGet,
  rtdbPut,
} from "@/lib/firebase/rtdb";
import { cleanEnvValue } from "@/lib/telegram";

const MODERATION_TAG = "comments-moderation";

type HiddenCommentEntry = {
  hiddenAt: number;
  pageId?: string;
};

function envHiddenCommentIds(): Set<string> {
  const raw = cleanEnvValue(process.env.COMMENTS_HIDDEN_IDS);
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

export function isCommentModerationWritable(): boolean {
  return isFirebaseConfigured();
}

export async function getHiddenCommentIds(): Promise<Set<string>> {
  const combined = envHiddenCommentIds();
  if (!isFirebaseConfigured()) return combined;

  const stored = await rtdbGet<Record<string, HiddenCommentEntry | boolean>>(
    "moderation/hidden_comments",
    {
      revalidate: 30,
      tags: [MODERATION_TAG],
    },
  );

  if (stored && typeof stored === "object") {
    for (const [key, value] of Object.entries(stored)) {
      if (value) combined.add(decodeRtdbKey(key));
    }
  }

  return combined;
}

export async function setCommentHiddenState(options: {
  commentId: string;
  pageId?: string;
  hidden: boolean;
}): Promise<boolean> {
  if (!isFirebaseConfigured()) return false;
  const safeKey = encodeRtdbKey(options.commentId.trim());
  if (!safeKey) return false;

  const path = `moderation/hidden_comments/${safeKey}`;
  if (options.hidden) {
    const res = await rtdbPut(path, {
      hiddenAt: Date.now(),
      ...(options.pageId ? { pageId: options.pageId } : {}),
    });
    if (res === null) return false;
  } else {
    const ok = await rtdbDelete(path);
    if (!ok) return false;
  }

  revalidateTag(MODERATION_TAG, "max");
  return true;
}
