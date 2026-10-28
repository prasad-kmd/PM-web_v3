import "server-only";

/**
 * The contact address. Server-only: it is returned by
 * /api/contact/email after a Turnstile check and never rendered into HTML or
 * bundled for the browser. Set CONTACT_EMAIL to override the default.
 */
const DEFAULT_CONTACT_EMAIL = "prasad.madhuranga@pm.me";

export function contactEmail(): string {
  const configured = process.env.CONTACT_EMAIL?.trim();
  return configured && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(configured)
    ? configured
    : DEFAULT_CONTACT_EMAIL;
}
