# Engagement, Readership Insights & Telegram Topic Routing

This guide covers the server-side setup for:

1. **Ad-blocker-resilient public content read counters** (shown exclusively on content reader pages, loaded client-side from a first-party cached endpoint) and the protected **Content Insights** studio (`/insights`, `⌘⇧A`).
2. **Categorized Telegram notifications** using Forum Supergroup **Topics** (`message_thread_id`) for Contact submissions, Reader comments, and Admin authentication events.
3. **Inline comment moderation** (`Hide` / `Restore`) and the **`⌘K` Workspace Command Palette**.

---

## 1. Public Readership Counter & Content Insights (`/insights`)

### Architectural Guarantees

- **First-party readership flow, resilient to script & content blockers (uBlock Origin, EasyPrivacy, Brave Shields):**
  - Zero third-party scripts, pixels, or Firebase browser SDKs are shipped to visitors.
  - Active reads post to a neutral first-party endpoint (`POST /api/reader/pulse`) with zero filter-list trigger keywords. Recording a read never depends on a third-party host, so blocking rules cannot suppress it.
  - Read counts load after hydration from a same-origin, CDN-cached endpoint (`GET /api/reader/pulse`); the count is **not** part of the server-rendered HTML and therefore requires JavaScript to appear.
  - The count response is cached at the shared edge for one hour with a five-minute stale-while-revalidate window. A cache miss reads the aggregate from Firebase, so a displayed total may lag recent reads by roughly an hour.
  - A provider outage returns `503` with `Cache-Control: no-store`, so an error is never cached and never displayed as a frozen `0`.
- **Reader-Page Scope Only:**
  - Read counts are tracked and displayed **exclusively** on content reader pages (`/{type}/{slug}` across `projects`, `blog`, `articles`, `tutorials`, `glossary`, and `news`).
  - Non-content routes (`/`, `/resume`, `/settings`, `/contact`, `/bookmarks`) and owner studios (`/insights`, `/og-studio`, `/invoices`) never display a read counter.
- **Privacy & Deduplication:**
  - Client IPs and User-Agents are hashed transiently in memory (`HMAC-SHA256`) over a 12-hour window to prevent refresh inflation and are **never** written to Firebase.
  - Signed-in owner sessions, bots/crawlers, link prefetches, and DesktopOS window-focus remounts (`sessionStorage` guard + `1.5s` active visibility check) are excluded automatically.

### Step 1 — Create Firebase Realtime Database

1. Open the [Firebase Console](https://console.firebase.google.com/) and create a project (Spark free plan is more than sufficient).
2. Navigate to **Build → Realtime Database → Create Database**, select your preferred region, and start in **Locked mode**.
3. Under the **Rules** tab, keep all public client access completely disabled (server-side service account requests authenticate via Google OAuth2 and bypass client rules):

```json
{
  "rules": {
    ".read": false,
    ".write": false
  }
}
```

4. Copy your database root URL (for example `https://your-project-default-rtdb.asia-southeast1.firebasedatabase.app`).

### Step 2 — Generate Service Account Credentials

1. In Firebase Console, open **Project settings (gear icon) → Service accounts**.
2. Click **Generate new private key** to download the JSON key file.
3. Add three server-only environment variables in `.env.local` (and your hosting provider's secret settings):

```dotenv
FIREBASE_DATABASE_URL=https://your-project-default-rtdb.asia-southeast1.firebasedatabase.app
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG...\n-----END PRIVATE KEY-----\n"
```

> **Note:** Keep `FIREBASE_PRIVATE_KEY` wrapped in double quotes if pasting `\n`-escaped single-line PEM values into `.env.local`. `lib/firebase/rtdb.ts` normalizes both literal `\n` sequences and multiline PEM strings automatically. If these variables are left unset, the workspace degrades gracefully: reader pages omit the read counter and Settings → About reports `Readership counter: Not configured`.

### Step 3 — Opening Content Insights (`/insights`)

1. Sign in as owner (`⌘⇧L` or Profile menu → **Sign in…**).
2. Launch **Content Insights** via:
   - Profile menu → **Studio → Content Insights**
   - Keyboard shortcut **`⌘⇧A`** (`Ctrl+Shift+A`)
   - Command palette (`⌘K`) → type `insights` → **Content Insights**
   - Direct URL `/insights`
3. Switch across **Overview** (interactive Recharts **Area / Bars** readership chart, KPI cards, collection shares, and top entries preview), **Entries** (searchable, sortable full content leaderboard), and **Audience** (referrer hostnames and country-level distribution), filter by **7d / 30d / 90d / All**, or click **CSV** to download the filtered report.

---

## 2. Telegram Group Topics (`message_thread_id`) & Comment Notifications

`lib/telegram.ts` unifies all outgoing Telegram notifications across four channels (`contact`, `comments`, `auth`, and `system`).

### Standard Chat vs. Forum Group with Topics

- **1-on-1 Bot Chat (Default):** Set `TELEGRAM_TOKEN` and `TELEGRAM_CHAT_ID` only. Leave all `TELEGRAM_TOPIC_*` variables unset. Every notification delivers to that chat as before.
- **Telegram Group with Topics Enabled:**
  1. Create a private Telegram Group, open **Group Settings → Topics**, and enable **Topics** (this upgrades the group to a Forum supergroup).
  2. Add your bot to the group and grant it permission to **Post messages** (and **Manage topics** if desired).
  3. Create topics for your categories — for example:
     - `Contact`
     - `Comments`
     - `Security / Auth`
  4. **Find the `TELEGRAM_CHAT_ID` and Topic IDs (`message_thread_id`):**
     - Inside each topic in Telegram Desktop or Mobile, post a test message, right-click (or long-press) it, and choose **Copy Message Link**.
     - A private supergroup message link looks like: `https://t.me/c/1987654321/14/15` or `https://t.me/c/1987654321/14`:
       - Prefix the group number with `-100` for `TELEGRAM_CHAT_ID`: `-1001987654321`
       - The topic number (`14` in the example) is the integer `message_thread_id`.
  5. Configure `.env.local` / deployment secrets:

```dotenv
TELEGRAM_TOKEN=123456789:AAExampleBotToken
TELEGRAM_CHAT_ID=-1001987654321

TELEGRAM_TOPIC_CONTACT=14
TELEGRAM_TOPIC_COMMENTS=18
TELEGRAM_TOPIC_AUTH=22
# TELEGRAM_TOPIC_SYSTEM=
```

### Automatic Topic Fallback

If a configured topic is ever deleted, closed, or `TELEGRAM_CHAT_ID` is switched back to a regular non-forum chat, `lib/telegram.ts` automatically catches Telegram's HTTP `400` response and **retries immediately without `message_thread_id`**, ensuring messages and attachments still arrive in `General` rather than failing.

### Reader Comment Notifications & Inline Moderation

- Every guest comment submitted via `POST /api/comments` schedules a non-blocking background alert (`after()`) to `TELEGRAM_TOPIC_COMMENTS` containing the entry title, collection, author/social handle, guest email (for private follow-up), `Asia/Colombo` timestamp, IP/country context, body preview, and a direct `?comment=<id>#comment-<id>` permalink.
- On public domains (configured via `NEXT_PUBLIC_SITE_URL` or inferred from incoming `x-forwarded-host` / `origin` headers), the Telegram message includes both an explicit clickable URL and a native **Open discussion thread ↗** inline URL button. When testing locally on `http://localhost:3000` (where Telegram's HTML entity parser strips `<a href>` links without a public TLD), `lib/comments/telegram-notify.ts` automatically renders a tap-to-copy `<code>` URL instead so the link is never lost.
- Visiting either `?comment=<id>` or `#comment-<id>` automatically opens the reader's **Discussion** sheet and scrolls to that comment.
- Because the upstream Notion REST API does not expose a `DELETE /v1/comments` endpoint, PM Web v3 provides **1-click Hide / Restore moderation** directly inside `CommentItem.tsx` when signed in as owner (backed by `moderation/hidden_comments` in Firebase RTDB, plus optional static `COMMENTS_HIDDEN_IDS` in `.env`).

---

## 3. Workspace Command Palette (`⌘K`)

- Press **`⌘K`** (`Ctrl+K` on Windows/Linux), click the `Search` icon in the top-right menubar, or choose **File → Find in workspace…**.
- Opens as a single compact search bar with zero visual clutter; ranked, grouped matches across all 6 published collections (via cached `GET /api/search-index`), browser-saved items, workspace windows, Resume sections, owner studios, and appearance commands appear progressively as you type.
- Running **Refresh content** from the signed-in owner menu invalidates `/api/search-index`, `/api/latest`, `/llms.txt`, `/feed.xml`, and cached readership tags simultaneously.
