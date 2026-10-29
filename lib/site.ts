/** Canonical public origin used consistently by metadata, feeds and discovery. */
export function getSiteUrl(): string {
  const candidate = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const production = process.env.NODE_ENV === "production";
  if (!candidate && production) {
    throw new Error(
      "Set NEXT_PUBLIC_SITE_URL to your public HTTPS origin before building.",
    );
  }
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
