export const COOKIE_THEME = "pm-theme";
export const COOKIE_WALLPAPER = "pm-desktop-wallpaper";
export const COOKIE_WALLPAPER_INTENSITY = "pm-wallpaper-intensity";
export const COOKIE_SLIDESHOW_ENABLED = "pm-wallpaper-slideshow";
export const COOKIE_SLIDESHOW_INTERVAL = "pm-wallpaper-interval";
/** Guest comment identity (name, email, handles) — see components/comments. */
export const COOKIE_COMMENTER = "pm_commenter";
/** Owner workstation session cookies (HttpOnly, server-managed). */
export const COOKIE_ADMIN_DEV = "pm_admin";
export const COOKIE_ADMIN_PROD = "__Host-pm_admin";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function getClientCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  try {
    const prefix = `${encodeURIComponent(name)}=`;
    const parts = document.cookie ? document.cookie.split("; ") : [];
    for (const part of parts) {
      if (part.startsWith(prefix)) {
        return decodeURIComponent(part.slice(prefix.length));
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function setClientCookie(
  name: string,
  value: string,
  maxAgeSeconds: number = ONE_YEAR_SECONDS,
): void {
  if (typeof document === "undefined") return;
  try {
    const secure =
      typeof window !== "undefined" && window.location.protocol === "https:"
        ? "; Secure"
        : "";
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax${secure}`;
  } catch {
    // Cookie writes are optional if blocked by strict privacy settings.
  }
}
