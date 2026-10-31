import {
  COOKIE_ADMIN_HINT,
  COOKIE_COMMENTER,
  COOKIE_COOKIE_NOTICE,
  COOKIE_SLIDESHOW_ENABLED,
  COOKIE_SLIDESHOW_INTERVAL,
  COOKIE_THEME,
  COOKIE_WALLPAPER,
  COOKIE_WALLPAPER_INTENSITY,
} from "./cookies";
import {
  PWA_CORE_CACHE,
  PWA_IMAGES_CACHE,
  PWA_INSTALL_HINT_KEY,
  PWA_PAGES_CACHE,
  PWA_STATIC_CACHE,
} from "./pwa";

/**
 * Canonical legal metadata and the shared cookie/browser-storage register.
 *
 * The Privacy Policy and Settings render from STORAGE_REGISTER so the published
 * disclosure and the in-workspace control surface cannot quietly drift apart.
 * Bump COOKIE_NOTICE_VERSION only for a material storage/privacy change.
 */
export const LEGAL_VERSION = "1.1";
export const LEGAL_EFFECTIVE_DATE = "30 October 2026";
export const LEGAL_EFFECTIVE_DATE_ISO = "2026-10-30";
export const LEGAL_LAST_UPDATED = LEGAL_EFFECTIVE_DATE;
export const LEGAL_LAST_UPDATED_ISO = LEGAL_EFFECTIVE_DATE_ISO;
export const COOKIE_NOTICE_VERSION = 2;
export const COOKIE_NOTICE_OPEN_EVENT = "pm:open-cookie-notice";

export const COOKIE_NOTICE_TITLE = "Cookies & browser storage";
export const COOKIE_NOTICE_BODY =
  "This workspace uses first-party storage to remember appearance, window layout, saved items and reader preferences. Its service worker also keeps public pages and assets you visit in Cache Storage for offline use; APIs and owner tools are never cached. If you comment, it can also remember your name, email and handles on this device. There are no advertising cookies or third-party analytics scripts. Entry pages record aggregate read counts; the Privacy Policy lists every cookie and storage key.";
export const COOKIE_NOTICE_BODY_COMPACT =
  "First-party storage remembers appearance, windows, saved items and reader preferences, and keeps visited public pages available offline. No advertising cookies or third-party analytics scripts are used.";

export type LegalDocumentId = "privacy" | "terms" | "disclaimer";

export type LegalDocumentMeta = {
  id: LegalDocumentId;
  title: string;
  shortTitle: string;
  route: "/privacy-policy" | "/terms-and-conditions" | "/disclaimer";
  description: string;
  lede: string;
};

export const LEGAL_HUB_ROUTE = "/legal" as const;

export const LEGAL_DOCUMENTS: readonly LegalDocumentMeta[] = [
  {
    id: "privacy",
    title: "Privacy Policy",
    shortTitle: "Privacy",
    route: "/privacy-policy",
    description:
      "How Prasad M. handles contact enquiries, public comments, aggregate readership, cookies and browser storage.",
    lede: "What this workspace remembers, what you send through its forms, and the services that process it.",
  },
  {
    id: "terms",
    title: "Terms and Conditions",
    shortTitle: "Terms",
    route: "/terms-and-conditions",
    description:
      "The terms for using Prasad M.’s portfolio workspace, comments, contact form and published material.",
    lede: "The rules for using the workspace, posting comments and reusing published material.",
  },
  {
    id: "disclaimer",
    title: "Disclaimer",
    shortTitle: "Disclaimer",
    route: "/disclaimer",
    description:
      "The limits of the engineering notes, AI-assisted entries, examples and owner utilities published in this workspace.",
    lede: "The limits of the engineering notes, examples and AI-assisted entries published here.",
  },
] as const;

export const LEGAL_ROUTES = [
  LEGAL_HUB_ROUTE,
  ...LEGAL_DOCUMENTS.map((document) => document.route),
] as const;

export function getLegalDocument(id: LegalDocumentId): LegalDocumentMeta {
  const document = LEGAL_DOCUMENTS.find((entry) => entry.id === id);
  if (!document) throw new Error(`Unknown legal document: ${id}`);
  return document;
}

export type StorageRegisterEntry = {
  name: string;
  type:
    | "Cookie"
    | "Cookie + local storage"
    | "Local storage"
    | "Session storage"
    | "Cache Storage"
    | "HttpOnly cookies";
  purpose: string;
  duration: string;
  scope: "visitor" | "owner";
};

export const STORAGE_REGISTER: readonly StorageRegisterEntry[] = [
  {
    name: COOKIE_COOKIE_NOTICE,
    type: "Cookie",
    purpose: "Remembers which version of the cookie notice you acknowledged",
    duration: "1 year",
    scope: "visitor",
  },
  {
    name: COOKIE_THEME,
    type: "Cookie + local storage",
    purpose: "Light/dark appearance",
    duration: "Cookie: 1 year; local copy until cleared",
    scope: "visitor",
  },
  {
    name: COOKIE_WALLPAPER,
    type: "Cookie + local storage",
    purpose: "Selected desktop wallpaper",
    duration: "Cookie: 1 year; local copy until cleared",
    scope: "visitor",
  },
  {
    name: COOKIE_WALLPAPER_INTENSITY,
    type: "Cookie + local storage",
    purpose: "Wallpaper visibility intensity",
    duration: "Cookie: 1 year; local copy until cleared",
    scope: "visitor",
  },
  {
    name: COOKIE_SLIDESHOW_ENABLED,
    type: "Cookie + local storage",
    purpose: "Wallpaper slideshow on/off",
    duration: "Cookie: 1 year; local copy until cleared",
    scope: "visitor",
  },
  {
    name: COOKIE_SLIDESHOW_INTERVAL,
    type: "Cookie + local storage",
    purpose: "Wallpaper slideshow interval",
    duration: "Cookie: 1 year; local copy until cleared",
    scope: "visitor",
  },
  {
    name: "pm-window-layout-v1",
    type: "Local storage",
    purpose: "Desktop window position, size and maximised state",
    duration: "Until cleared",
    scope: "visitor",
  },
  {
    name: "pm-content-bookmarks-v1",
    type: "Local storage",
    purpose:
      "Entries you save, including entry title, date, description and image reference",
    duration: "Until removed or cleared",
    scope: "visitor",
  },
  {
    name: "pm-listing-prefs-v1:<collection>",
    type: "Local storage",
    purpose: "Collection view and sort choices",
    duration: "Until cleared",
    scope: "visitor",
  },
  {
    name: "pm-reader-preferences-v1",
    type: "Local storage",
    purpose: "Reader text size, line height, serif and contrast choices",
    duration: "Until cleared",
    scope: "visitor",
  },
  {
    name: "pm-reader-outline-v1",
    type: "Local storage",
    purpose: "Whether the reader outline is shown",
    duration: "Until cleared",
    scope: "visitor",
  },
  {
    name: "quiz_status_<id>",
    type: "Local storage",
    purpose: "Quiz completion, score and completion date",
    duration: "Until cleared",
    scope: "visitor",
  },
  {
    name: COOKIE_COMMENTER,
    type: "Cookie",
    purpose: "Guest-comment name, email and optional handles for prefill",
    duration: "180 days",
    scope: "visitor",
  },
  {
    name: "pm_comment_draft:<page>",
    type: "Session storage",
    purpose: "Unsent comment draft for that entry",
    duration: "Browser session/tab lifetime",
    scope: "visitor",
  },
  {
    name: "pm_rdr_seen:<type>:<slug>",
    type: "Session storage",
    purpose: "Avoids repeating the read pulse for an entry in the same session",
    duration: "Browser session/tab lifetime",
    scope: "visitor",
  },
  {
    name: PWA_CORE_CACHE,
    type: "Cache Storage",
    purpose: "Essential offline page, app manifest, font and core icons",
    duration:
      "Until cache-version cleanup, Settings clear, or browser eviction",
    scope: "visitor",
  },
  {
    name: PWA_STATIC_CACHE,
    type: "Cache Storage",
    purpose:
      "Same-origin scripts, styles, fonts and public text assets needed to reopen cached pages",
    duration:
      "Until cache cap/version cleanup, Settings clear, or browser eviction",
    scope: "visitor",
  },
  {
    name: PWA_PAGES_CACHE,
    type: "Cache Storage",
    purpose: "Public HTML pages you have visited, for offline reading",
    duration:
      "Until cache cap/version cleanup, Settings clear, or browser eviction",
    scope: "visitor",
  },
  {
    name: PWA_IMAGES_CACHE,
    type: "Cache Storage",
    purpose: "Public same-origin images shown on pages you have visited",
    duration:
      "Until cache cap/version cleanup, Settings clear, or browser eviction",
    scope: "visitor",
  },
  {
    name: PWA_INSTALL_HINT_KEY,
    type: "Local storage",
    purpose:
      "Counts workspace visits and remembers whether the one-time install hint was dismissed",
    duration: "Until cleared",
    scope: "visitor",
  },
  {
    name: "Owner session/trust cookies",
    type: "HttpOnly cookies",
    purpose: "Operator authentication and optional trusted-browser recognition",
    duration: "Session default 12 hours; trust default 30 days",
    scope: "owner",
  },
  {
    name: COOKIE_ADMIN_HINT,
    type: "Cookie",
    purpose:
      "Non-sensitive boolean hint ('1') set only after operator sign-in so public visitors skip session checks",
    duration: "Matches operator session (default 12 hours)",
    scope: "owner",
  },
] as const;

/** Visitor-readable cookies that Settings lists and can clear by name. */
export const VISITOR_COOKIE_REGISTER = STORAGE_REGISTER.filter(
  (entry) => entry.scope === "visitor" && entry.type.startsWith("Cookie"),
);
