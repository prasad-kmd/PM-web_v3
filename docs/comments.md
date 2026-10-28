# Comments

Guest comments on Notion-backed entries, compatible with PM-Web_V2.

There is no sign-in on v3. A visitor leaves a name, an email and — optionally —
one social handle; the comment is written to Notion as a **native comment on the
page itself**, so there is no database and no new infrastructure.

---

## What a visitor sees

A **Comments** button in the reader toolbar, next to *Outline*, plus a “Join the
discussion” card at the end of `projects | blog | articles | tutorials |
glossary | news` entries. Both open the same **sheet inside the reader window**
(C1): a 400 px panel on the right at ≥ 768 px, and a bottom drawer at 78 % of
the window height below that.

The toolbar button morphs between a speech bubble and a close mark (the same
`MorphIcon` transition the save and share buttons use), and the sheet slides in
and out with `AnimatePresence` — the scrim fades, the panel springs from the
edge, and both reverse on close. Reduced motion turns this into a plain fade.

The sheet is **not** a body portal. It is a zero-height `position: sticky` layer
inside `.rdr-app`, which pins the scrim and the panel to the window’s visible
height (`--rdr-viewport`, published by `ReaderProvider`). That is what lets it
survive the desktop’s frozen route snapshot: a portal would escape the window
and be duplicated or orphaned when the snapshot is taken.

The comment count is lazy. The first `GET` fires only when the trigger card is
scrolled into view, so a reader who never reaches the end of an article never
costs a Notion round-trip.

---

## Protection, in order

| #   | Layer             | Implementation                              | Failure           |
| --- | ----------------- | ------------------------------------------- | ----------------- |
| 1   | Kill switch       | `COMMENTS_ENABLED=false`                    | 403 `disabled`    |
| 2   | Same-origin       | `Origin`/`Referer` vs `Host`                | 403 `validation`  |
| 3   | Burst limit       | 3 / 60 s per IP                             | 429 `rate_limit`  |
| 4   | Daily limit       | 12 / 24 h per IP                            | 429 `rate_limit`  |
| 5   | Shape             | `zod`                                       | 400 `validation`  |
| 6   | Honeypot          | hidden `website` field                      | 400 (generic)     |
| 7   | Disposable email  | `fakeout`                                   | 400 `profanity`\* |
| 8   | Profanity         | `obscenity`                                 | 400 `profanity`\* |
| 9   | Bot check         | Cloudflare Turnstile                        | 400 `turnstile`   |

\* Layers 7 and 8 share one response and one message, so a rejected sender is
never told which check failed. The honeypot reply is deliberately generic and
never names a field.

Limits come from `lib/comments/rate-limit.ts`, which reuses the contact form’s
`createLimiter` (`lib/contact/security.ts`). They are per server instance and
reset on cold start — Turnstile and the honeypot are the real gate. To make them
global, replace `createLimiter`; callers only ever see “seconds to wait”.

---

## Wire format — v2-compatible

Notion gives an integration no author metadata, so attribution is folded into
the comment text:

```
PMc1   [PMc1|Name|email|source:handle|avatarUrl]: body
PMc2   [PMc2|Name|email|source:handle|avatarUrl|role]: body
```

**v3 writes `PMc1`.** It has no accounts, so it is a guest on v2’s terms, and a
`PMc1` comment renders in PM-Web_V2 exactly like one of its own.

`parseComment()` recognises four shapes:

1. `PMc2|…` — current v2, including the `role` segment. `owner` renders an
   **Owner** badge; v3 never writes this segment, it only reads it.
2. `PMc1|…` — v2 guests and every v3 comment.
3. `[Name|userId|avatar]:` — pre-PMc legacy comments, still rendered.
4. Anything else — written directly, shown as “Direct note”.

Pipes, brackets and newlines in names are sanitised; the body is truncated so
meta + body always fit Notion’s 2 000-character cap. The budget is computed from
the assembled meta, so it needs no arithmetic anywhere else.

**The email is stored but never returned.** `toCommentView()` drops it before
the response leaves the server: the owner needs it to reply, readers do not need
it at all. Set `COMMENTS_STORE_EMAIL=false` to store `sha256:<16>` instead.

---

## Avatars

Handles are probed **server-side** — GitHub → X → LinkedIn — and the first image
that resolves is stored with the comment, so the feed makes no external image
calls at render time.

| Platform | Method                                                   | Reliability |
| -------- | -------------------------------------------------------- | ----------- |
| GitHub   | `github.com/{user}.png` (302 → `avatars.githubusercontent.com`) | High        |
| X        | `api.fxtwitter.com/{handle}` → `avatar_url`               | High        |
| LinkedIn | `unavatar.io/linkedin/{user}?fallback=false`              | Low         |

**A failed avatar never loses the handle.** Notion stores one `source:handle`
pair per comment, so a visitor’s links compete for it: the platform that produced
an avatar wins, and when none did the first handle they actually gave is
published instead (GitHub → X → LinkedIn). That is what keeps a LinkedIn profile
visible even though LinkedIn almost never answers an anonymous avatar lookup.

Everything fails open to a deterministic initials avatar (FNV-1a hue, no
network). Only hosts in `ALLOWED_AVATAR_HOSTS` can ever reach an `<img src>`, and
each of them is already in the `img-src` CSP in `next.config.mjs` — **no CSP
change is needed**.

---

## API

```
GET    /api/comments?pageId=…&cursor=…   list (25 per page, newest first)
POST   /api/comments                     create
DELETE /api/comments/identity            forget the pm_commenter cookie
```

`GET` → `{ results, nextCursor, hasMore, configured }`

`POST` body:

```json
{
  "pageId": "…32-hex…",
  "content": "…",
  "name": "…",
  "email": "…",
  "github": "…",          // optional, handle or profile URL
  "linkedin": "…",        // optional
  "twitter": "…",         // optional
  "website": "",          // honeypot, must stay empty
  "turnstileToken": "…"
}
```

`POST` → `{ comment, identity }` plus `Set-Cookie: pm_commenter=…`
Errors → `{ error: { type, message, fields? } }`

---

## Identity cookie

`pm_commenter` — URL-encoded JSON `{v,n,e,g,l,t}`, 180 days, `Path=/`,
`SameSite=Lax`, `Secure` in production. Byte-compatible with v2, so a visitor who
commented on v2 finds their details already filled in.

Not HttpOnly, by necessity: the composer prefills from it. It is therefore never
trusted — every field is re-validated on each POST. **Edit** overwrites it;
**Not you?** clears it and calls `DELETE /api/comments/identity`.

---

## Files

```
lib/comments/types.ts              shared types
lib/comments/limits.ts             length limits (client-safe)
lib/comments/config.ts             env + tuning (server only)
lib/comments/format.ts             PMc1/PMc2 encode + decode
lib/comments/avatar.ts             platform avatar resolution
lib/comments/validate.ts           zod schema + filters
lib/comments/identity-cookie.ts    pm_commenter helpers
lib/comments/rate-limit.ts         limiter instances
lib/comments/request-context.ts    client IP + same-origin
app/api/comments/route.ts          GET + POST
app/api/comments/identity/route.ts DELETE

components/comments/DiscussionContext.tsx  shared state
components/comments/DiscussionSheet.tsx    the panel
components/comments/DiscussionTrigger.tsx  the end-of-article card
components/comments/CommentComposer.tsx    identity + body + Turnstile
components/comments/CommentItem.tsx        one comment
components/comments/CommentAvatar.tsx      avatar + initials
hooks/use-commenter-identity.ts            cookie-backed identity
app/library.css                            `.dsn-*` block
components/notion/ContentDetailPage.tsx    mounts the provider
lib/contact/security.ts                    exports createLimiter
```

---

## Setup

1. `pnpm install` (nothing new: `zod`, `fakeout`, `obscenity` and
   `@marsidev/react-turnstile` are already used by the contact form).
2. Set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` (already
   documented for `/contact`). In development the Cloudflare test keys are used
   automatically.
3. In Notion, share each page with the integration and grant **Read comments**
   and **Insert comments**.
4. Rebuild — `NEXT_PUBLIC_*` is inlined at build time.

## Known limitations

- Flat threads only; Notion comments have no replies.
- No visitor edit/delete. Moderation happens in Notion, and the site reflects it
  on the next load.
- Rate limits are per instance (see above).
- LinkedIn avatars rarely resolve.
