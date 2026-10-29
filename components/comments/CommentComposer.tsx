"use client";

import { useEffect, useRef, useState } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import {
  ArrowUp02Icon,
  CheckmarkBadge01Icon,
  PencilEdit02Icon,
  Shield01Icon,
  UserCheck01Icon,
  UserRemove01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useOptionalAdminAuth } from "@/components/admin/AdminAuthProvider";
import { COMMENT_MAX_LENGTH, COMMENT_MIN_LENGTH } from "@/lib/comments/limits";
import type { CommentError, CommentView } from "@/lib/comments/types";
import { useCommenterIdentity } from "@/hooks/use-commenter-identity";
import { CommentAvatar } from "./CommentAvatar";

/**
 * The composer.
 *
 * When signed in as the workspace owner, owner details and the distinguished
 * Owner badge are applied automatically without requiring manual fields or a
 * separate spam challenge. Otherwise, guest identity states apply.
 */

const DRAFT_PREFIX = "pm_comment_draft:";

export function CommentComposer({
  pageId,
  siteKey,
  onPosted,
}: {
  pageId: string;
  siteKey: string;
  onPosted: (comment: CommentView) => void;
}) {
  const adminAuth = useOptionalAdminAuth();
  const adminProfile = adminAuth?.authenticated
    ? adminAuth.commentProfile
    : null;
  const { identity, setIdentity, save, forget, known } = useCommenterIdentity();
  const [guestOverride, setGuestOverride] = useState(false);
  const [content, setContent] = useState("");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState("");
  const [error, setError] = useState<CommentError | null>(null);
  const widgetRef = useRef<TurnstileInstance>(undefined);
  const honeypotRef = useRef<HTMLInputElement | null>(null);
  const draftKey = `${DRAFT_PREFIX}${pageId}`;

  const activeOwner = Boolean(adminProfile) && !guestOverride;

  // Automatically engage Owner mode whenever admin sign-in activates.
  useEffect(() => {
    if (adminProfile) {
      setGuestOverride(false);
      setEditing(false);
      setError(null);
    }
  }, [adminProfile]);

  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(draftKey);
      if (saved) setContent(saved);
    } catch {
      /* private mode */
    }
  }, [draftKey]);

  const updateDraft = (value: string) => {
    setContent(value);
    try {
      if (value) window.sessionStorage.setItem(draftKey, value);
      else window.sessionStorage.removeItem(draftKey);
    } catch {
      /* ignore */
    }
  };

  // Signed-in owner posts are authenticated by the HttpOnly session cookie;
  // guest posts require a valid Turnstile token.
  const canSubmit =
    content.trim().length >= COMMENT_MIN_LENGTH &&
    (activeOwner || (Boolean(token) && Boolean(siteKey))) &&
    !busy;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const payload = activeOwner
        ? {
            pageId,
            content: content.trim(),
            website: honeypotRef.current?.value ?? "",
            asOwner: true,
          }
        : {
            pageId,
            content: content.trim(),
            name: identity.name.trim(),
            email: identity.email.trim(),
            github: identity.github?.trim() || undefined,
            linkedin: identity.linkedin?.trim() || undefined,
            twitter: identity.twitter?.trim() || undefined,
            website: honeypotRef.current?.value ?? "",
            turnstileToken: token,
            asOwner: false,
          };

      const response = await fetch("/api/comments", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as {
        comment?: CommentView;
        error?: CommentError;
      };
      if (!response.ok || !data.comment) {
        setError(
          data.error ?? {
            type: "unknown",
            message: "The comment was not saved.",
          },
        );
        if (!activeOwner) {
          setToken("");
          widgetRef.current?.reset();
        }
        return;
      }
      if (!activeOwner) {
        save({
          name: identity.name.trim(),
          email: identity.email.trim(),
          github: identity.github?.trim(),
          linkedin: identity.linkedin?.trim(),
          twitter: identity.twitter?.trim(),
        });
        setToken("");
        widgetRef.current?.reset();
        setEditing(false);
      }
      onPosted(data.comment);
      updateDraft("");
    } catch {
      setError({
        type: "unknown",
        message: "The connection dropped before the comment was saved.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dsn-composer">
      {activeOwner && adminProfile ? (
        <div className="dsn-ident" data-owner="">
          <CommentAvatar
            name={adminProfile.name}
            src={adminProfile.avatar}
            size={28}
          />
          <div className="dsn-ident-copy">
            <div className="dsn-ident-title">
              <strong>{adminProfile.name}</strong>
              <span
                className="dsn-tag dsn-tag-owner"
                data-tone="owner"
                title="Verified workspace owner"
              >
                <HugeiconsIcon
                  icon={CheckmarkBadge01Icon}
                  strokeWidth={2.2}
                  size={10.5}
                  aria-hidden
                />
                Owner
              </span>
            </div>
            <span>Signed in · commenting with owner badge</span>
          </div>
          <div className="dsn-ident-actions">
            <button
              type="button"
              onClick={() => setGuestOverride(true)}
              title="Switch to guest comment mode"
            >
              <HugeiconsIcon
                icon={UserRemove01Icon}
                strokeWidth={2}
                size={12}
                aria-hidden
              />
              Guest mode
            </button>
          </div>
        </div>
      ) : null}

      {!activeOwner && known && !editing ? (
        <div className="dsn-ident">
          <CommentAvatar name={identity.name} src={null} size={26} />
          <div className="dsn-ident-copy">
            <strong>{identity.name}</strong>
            <span>{identity.email} · saved on this device</span>
          </div>
          <div className="dsn-ident-actions">
            {adminProfile ? (
              <button
                type="button"
                onClick={() => {
                  setGuestOverride(false);
                  setEditing(false);
                }}
              >
                <HugeiconsIcon
                  icon={UserCheck01Icon}
                  strokeWidth={2}
                  size={12}
                  aria-hidden
                />
                As owner
              </button>
            ) : null}
            <button type="button" onClick={() => setEditing(true)}>
              <HugeiconsIcon
                icon={PencilEdit02Icon}
                strokeWidth={2}
                size={12}
                aria-hidden
              />
              Edit
            </button>
            <button
              type="button"
              onClick={() => {
                forget();
                setEditing(true);
              }}
            >
              <HugeiconsIcon
                icon={UserRemove01Icon}
                strokeWidth={2}
                size={12}
                aria-hidden
              />
              Not you?
            </button>
          </div>
        </div>
      ) : null}

      {!activeOwner && (!known || editing) ? (
        <div className="dsn-fields">
          <div className="dsn-fields-head">
            <p className="dsn-fields-note">
              Comments are public. Your name and email travel with the comment
              so a reply can reach you; the email is never shown to other
              readers.
            </p>
            {adminProfile ? (
              <button
                type="button"
                className="dsn-owner-switch"
                onClick={() => {
                  setGuestOverride(false);
                  setEditing(false);
                }}
              >
                <HugeiconsIcon
                  icon={CheckmarkBadge01Icon}
                  strokeWidth={2}
                  size={11}
                  aria-hidden
                />
                Use owner profile
              </button>
            ) : null}
          </div>
          <div className="dsn-field-row">
            <label>
              <span>Name</span>
              <input
                value={identity.name}
                onChange={(event) =>
                  setIdentity({ ...identity, name: event.target.value })
                }
                maxLength={60}
                autoComplete="name"
                placeholder="Your name"
              />
            </label>
            <label>
              <span>Email</span>
              <input
                value={identity.email}
                onChange={(event) =>
                  setIdentity({ ...identity, email: event.target.value })
                }
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
              />
            </label>
          </div>
          <details className="dsn-fields-more">
            <summary>Add a profile link (optional)</summary>
            <div className="dsn-field-row">
              <label>
                <span>GitHub</span>
                <input
                  value={identity.github ?? ""}
                  onChange={(event) =>
                    setIdentity({ ...identity, github: event.target.value })
                  }
                  placeholder="handle or profile URL"
                  autoComplete="off"
                />
              </label>
              <label>
                <span>X / Twitter</span>
                <input
                  value={identity.twitter ?? ""}
                  onChange={(event) =>
                    setIdentity({ ...identity, twitter: event.target.value })
                  }
                  placeholder="optional"
                  autoComplete="off"
                />
              </label>
            </div>
            <div className="dsn-field-row is-single">
              <label>
                <span>LinkedIn</span>
                <input
                  value={identity.linkedin ?? ""}
                  onChange={(event) =>
                    setIdentity({ ...identity, linkedin: event.target.value })
                  }
                  placeholder="optional"
                  autoComplete="off"
                />
              </label>
            </div>
          </details>
          {known ? (
            <button
              type="button"
              className="dsn-fields-done"
              onClick={() => {
                save(identity);
                setEditing(false);
              }}
            >
              Save details
            </button>
          ) : null}
        </div>
      ) : null}

      <label className="dsn-textarea">
        <span className="sr-only">Your comment</span>
        <textarea
          value={content}
          onChange={(event) =>
            updateDraft(event.target.value.slice(0, COMMENT_MAX_LENGTH))
          }
          rows={3}
          placeholder={
            activeOwner ? "Reply as workspace owner…" : "Add to the discussion…"
          }
        />
      </label>

      {/* Honeypot: visually and programmatically hidden from people, not bots. */}
      <div className="dsn-honeypot" aria-hidden="true">
        <label>
          Website
          <input
            ref={honeypotRef}
            tabIndex={-1}
            autoComplete="off"
            name="website"
            defaultValue=""
          />
        </label>
      </div>

      <div className="dsn-composer-foot">
        <span
          className="dsn-turnstile"
          data-state={activeOwner || token ? "ok" : "idle"}
        >
          <HugeiconsIcon
            icon={activeOwner ? CheckmarkBadge01Icon : Shield01Icon}
            strokeWidth={2}
            size={12}
            aria-hidden
          />
          {activeOwner
            ? "Verified owner"
            : siteKey
              ? token
                ? "Verified"
                : "Security check"
              : "Not configured"}
        </span>
        <span className="dsn-count">
          {content.trim().length} / {COMMENT_MAX_LENGTH}
        </span>
        <button
          type="button"
          className="dsn-post"
          onClick={submit}
          disabled={!canSubmit}
        >
          <HugeiconsIcon
            icon={ArrowUp02Icon}
            strokeWidth={2}
            size={13}
            aria-hidden
          />
          {busy ? "Posting…" : "Post comment"}
        </button>
      </div>

      {!activeOwner && siteKey ? (
        <div className="dsn-turnstile-widget">
          <Turnstile
            ref={widgetRef}
            siteKey={siteKey}
            onSuccess={setToken}
            onExpire={() => setToken("")}
            onError={() => setToken("")}
            options={{ theme: "auto", appearance: "interaction-only" }}
          />
        </div>
      ) : null}

      {error ? (
        <p className="dsn-error" role="alert">
          {error.message}
          {error.fields
            ? ` ${Object.values(error.fields).flat().join(" ")}`
            : ""}
        </p>
      ) : null}
    </div>
  );
}
