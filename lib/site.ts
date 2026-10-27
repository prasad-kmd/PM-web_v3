/** Canonical public origin used consistently by metadata, feeds and discovery. */
export function getSiteUrl(): string {
  const candidate =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" && url.protocol !== "http:")
      throw new Error("Invalid protocol");
    return url.origin;
  } catch {
    return "http://localhost:3000";
  }
}

/** Public contact address (corrections, enquiries). */
export const CONTACT_EMAIL = "prasad.madhuranga@pm.me";

export const SITE_NAME = "Prasad M. — Desktop Workspace";
export const SITE_DESCRIPTION =
  "Prasad Madhuranga — Mechanical and Mechatronics Engineer. A personal engineering portfolio and workspace.";
export function absoluteUrl(path: string): string {
  return new URL(path, getSiteUrl()).toString();
}
