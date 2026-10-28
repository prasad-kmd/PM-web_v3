/**
 * Build-time facts for the About tab.
 *
 * Values are optional: without them the About tab simply shows what the
 * package metadata already tells us (see `package.json` → version). Nothing
 * here is secret, and nothing is read on the server at request time.
 */
export const BUILD_INFO = {
  version: "3.2.75",
  /** Short commit, set at build time (e.g. `NEXT_PUBLIC_BUILD_SHA`). */
  commit: (process.env.NEXT_PUBLIC_BUILD_SHA || "").trim().slice(0, 7),
  /** ISO build timestamp, set at build time (`NEXT_PUBLIC_BUILD_TIME`). */
  builtAt: (process.env.NEXT_PUBLIC_BUILD_TIME || "").trim(),
  environment:
    process.env.NODE_ENV === "production" ? "production" : "development",
} as const;

/** Framework versions shown in Settings → About. Kept next to the build data
 *  so the tab never hard-codes a string that drifts from package.json. */
export const STACK_INFO = [
  { label: "Next.js", value: "16" },
  { label: "React", value: "19" },
  { label: "Tailwind CSS", value: "4" },
  { label: "Base UI", value: "1.8" },
  { label: "Animate UI", value: "2.4" },
  { label: "Motion", value: "14" },
] as const;
