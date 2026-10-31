/**
 * The origin Vercel assigned to this deployment, as `https://<host>`.
 *
 * Only used for **preview** deployments (`VERCEL_ENV=preview`). `VERCEL_URL`
 * is the deployment's own hostname (for example
 * `pm-web-v3-git-main-abc123.vercel.app`) and is always a public HTTPS
 * origin. `VERCEL_BRANCH_URL` is preferred because it stays stable across
 * rebuilds of the same branch.
 *
 * Returns `undefined` everywhere else, so production and local development
 * keep their existing behaviour exactly.
 */
function resolvePreviewOrigin(): string | undefined {
  if (process.env.VERCEL_ENV !== "preview") return undefined;
  const host = (
    process.env.VERCEL_BRANCH_URL ||
    process.env.VERCEL_URL ||
    ""
  ).trim();
  if (!host) return undefined;
  try {
    const url = new URL(host.includes("://") ? host : `https://${host}`);
    if (url.protocol !== "https:") return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}

/**
 * Canonical public origin used consistently by metadata, feeds and discovery.
 *
 * Resolution order:
 *  1. `NEXT_PUBLIC_SITE_URL` — explicit configuration, always wins.
 *  2. The deployment's own Vercel origin — **preview deployments only**.
 *     Vercel builds every deployment (preview included) with
 *     `NODE_ENV=production`, so the strict production check below would fail
 *     a preview build that has no `NEXT_PUBLIC_SITE_URL` of its own. The
 *     origin is baked into the prerendered HTML, the canonical tags, the
 *     sitemap and the OG image URLs, so a preview still needs a real, public,
 *     HTTPS origin — just not the production one.
 *  3. `http://localhost:3000` — local development.
 *
 * Production builds still fail fast: a missing or non-public
 * `NEXT_PUBLIC_SITE_URL` throws, because a wrong origin would otherwise be
 * baked into every prerendered page and every OG image.
 */
export function getSiteUrl(): string {
  const candidate = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const production = process.env.NODE_ENV === "production";
  const previewOrigin = resolvePreviewOrigin();

  if (!candidate && previewOrigin) return previewOrigin;

  try {
    const url = new URL(candidate || "http://localhost:3000");
    if (
      production &&
      (url.protocol !== "https:" ||
        /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(url.hostname))
    )
      throw new Error("Production requires a public HTTPS origin.");
    if (url.protocol !== "https:" && url.protocol !== "http:")
      throw new Error("Invalid protocol");
    return url.origin;
  } catch {
    if (previewOrigin) return previewOrigin;
    if (production)
      throw new Error(
        "NEXT_PUBLIC_SITE_URL must be a valid public HTTPS origin.",
      );
    return "http://localhost:3000";
  }
}

/**
 * Where every "email me" style link points. The address itself is only shown
 * on the contact page, after a Turnstile check (see lib/contact/email.ts), so
 * it never ships in page HTML or client bundles.
 */
export const CONTACT_PATH = "/contact";

/** Contact page link, optionally pre-filling the form's subject. */
export function contactHref(subject?: string): string {
  return subject
    ? `${CONTACT_PATH}?subject=${encodeURIComponent(subject.slice(0, 120))}`
    : CONTACT_PATH;
}

export const SITE_NAME = "Prasad M. — Desktop Workspace";
export const SITE_DESCRIPTION =
  "Prasad Madhuranga — Mechanical and Mechatronics Engineer. A personal engineering portfolio and workspace.";
export function absoluteUrl(path: string): string {
  return new URL(path, getSiteUrl()).toString();
}
