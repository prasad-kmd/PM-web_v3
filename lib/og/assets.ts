import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Static OG assets read from `public/` at request time (Node runtime).
 * `next.config.mjs → outputFileTracingIncludes` ships these files with the
 * `/api/og` function on serverless hosts.
 */
const PUBLIC_DIR = join(process.cwd(), "public");
const COVER_TIMEOUT_MS = 3000;
const COVER_MAX_BYTES = 4 * 1024 * 1024;

const memo = new Map<string, Promise<Buffer>>();
function readPublic(path: string): Promise<Buffer> {
  let pending = memo.get(path);
  if (!pending) {
    pending = readFile(join(PUBLIC_DIR, path));
    // Don't cache failures, so a transient error doesn't stick.
    pending.catch(() => memo.delete(path));
    memo.set(path, pending);
  }
  return pending;
}

const toDataUri = (data: Buffer, mime: string) =>
  `data:${mime};base64,${data.toString("base64")}`;

function toArrayBuffer(data: Buffer): ArrayBuffer {
  return data.buffer.slice(
    data.byteOffset,
    data.byteOffset + data.byteLength,
  ) as ArrayBuffer;
}

/** Outfit as static WOFF (Satori can't read the site's variable WOFF2). */
export async function loadOgFonts() {
  const weights = [400, 500, 600] as const;
  const files = await Promise.all(
    weights.map((weight) => readPublic(`og/outfit-${weight}.woff`)),
  );
  return files.map((data, index) => ({
    name: "Outfit",
    data: toArrayBuffer(data),
    weight: weights[index],
    style: "normal" as const,
  }));
}

export async function loadWallpaper(name: string): Promise<string> {
  return toDataUri(await readPublic(`og/wallpaper-${name}.jpg`), "image/jpeg");
}

export async function loadAvatar(): Promise<string> {
  return toDataUri(
    await readPublic("images/profile-placeholder.jpg"),
    "image/jpeg",
  );
}

export async function loadLogo(): Promise<string> {
  return toDataUri(await readPublic("favicon-pm.svg"), "image/svg+xml");
}

/**
 * Fetches a Notion cover through the site's own `/api/notion-image` proxy
 * (it validates the page and redirects to a fresh signed URL). Only that
 * same-origin path is accepted, so the renderer can't be used for SSRF.
 * Returns a data URI, or `null` so the caller falls back to the wallpaper.
 */
export async function loadCover(
  cover: string | null,
  origin: string,
): Promise<string | null> {
  if (!cover || !cover.startsWith("/api/notion-image?")) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), COVER_TIMEOUT_MS);
  try {
    const response = await fetch(new URL(cover, origin), {
      signal: controller.signal,
      redirect: "follow",
      headers: { Accept: "image/png,image/jpeg;q=0.9" },
    });
    if (!response.ok) return null;
    const mime = (response.headers.get("content-type") || "")
      .split(";")[0]
      .trim()
      .toLowerCase();
    if (mime !== "image/png" && mime !== "image/jpeg") return null;
    const declared = Number(response.headers.get("content-length") || 0);
    if (declared > COVER_MAX_BYTES) return null;
    const data = Buffer.from(await response.arrayBuffer());
    if (data.byteLength > COVER_MAX_BYTES) return null;
    return toDataUri(data, mime);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
