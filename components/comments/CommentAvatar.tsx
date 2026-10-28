"use client";

/** Two letters for the fallback, from the first and last word of the name. */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

/**
 * Stable tint for the initials avatar: FNV-1a folded into 12 hue buckets, so the
 * same name gets the same dot on every device with no network request.
 */
function hue(name: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < name.length; index++) {
    hash ^= name.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return Math.round((hash % 12) * 30);
}

export function CommentAvatar({
  name,
  src,
  size = 30,
}: {
  name: string;
  src?: string | null;
  size?: number;
}) {
  const letters = initials(name);
  const tint = hue(name);
  return (
    <span
      className="dsn-avatar"
      style={{
        width: size,
        height: size,
        // Monochrome-first: the tint is a 6% wash, not a colour block.
        ["--dsn-hue" as string]: String(tint),
        fontSize: Math.max(9, Math.round(size * 0.34)),
      }}
      aria-hidden="true"
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" />
      ) : (
        letters
      )}
    </span>
  );
}
