/**
 * Mandatory opening-animation timing shared by the pre-paint boot script,
 * Settings preview, the boot overlay and the cookie-notice gate.
 *
 * There is deliberately no visitor preference, cookie, local-storage key,
 * skip action or opt-out for this sequence. The variant is decided before
 * first paint in `app/layout.tsx`:
 * - `full`: wordmark reveal (proposal 04) with the minimal status dock (05)
 * - `short`: the proposal-05 status card for refreshes. Operating-system
 *   reduced-motion requests also use this shorter form; CSS suppresses the
 *   movement while the mandatory opening screen remains visible.
 */
export type BootVariant = "full" | "short";

export const BOOT_DONE_EVENT = "pm:boot-done";
export const BOOT_PREVIEW_EVENT = "pm:boot-preview";

export const BOOT_TIMING: Record<
  BootVariant,
  { minMs: number; maxMs: number; exitMs: number }
> = {
  full: { minMs: 2000, maxMs: 2600, exitMs: 350 },
  short: { minMs: 1200, maxMs: 1700, exitMs: 250 },
};

export function resolveBootVariant(
  value: string | null | undefined,
): BootVariant {
  return value === "short" ? "short" : "full";
}

export function requestBootPreview() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(BOOT_PREVIEW_EVENT));
}
