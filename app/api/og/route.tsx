import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { CONTENT_META, type ContentType } from "@/lib/content-types";
import { LEGAL_EFFECTIVE_DATE, LEGAL_VERSION } from "@/lib/legal";
import { OG_IMAGE_SIZE } from "@/lib/content-metadata";
import { resumeProfile } from "@/lib/resume-data";
import { getSiteUrl } from "@/lib/site";
import {
  loadAvatar,
  loadCover,
  loadLogo,
  loadOgFonts,
  loadWallpaper,
} from "@/lib/og/assets";
import { EditorialCard } from "@/lib/og/EditorialCard";
import { cleanText } from "@/lib/og/sanitize";
import {
  OG_TYPES,
  resolveOgKind,
  resolveOgStyle,
  resolveOgType,
  type OgCardData,
} from "@/lib/og/theme";
import { WindowCard } from "@/lib/og/WindowCard";

/**
 * Open Graph images (1200 × 630), inspired by v1's generator.
 *
 * Query: `title`, `description`, `type` (projects | blog | articles |
 * tutorials | glossary | news | legal | categories | tags | pages | default),
 * `kind` (detail | collection | home), `date`, `read`, `count` (taxonomy
 * entry count), `cover` (same-origin `/api/notion-image?…` only), `style`
 * (editorial | window, default from `OG_STYLE`, else editorial).
 *
 * Node runtime: fonts and wallpapers are read from `public/` on disk.
 */
export const runtime = "nodejs";

function siteHost() {
  try {
    return new URL(getSiteUrl()).host;
  } catch {
    return "prasadm.vercel.app";
  }
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const type = resolveOgType(params.get("type"));
  const kind = resolveOgKind(params.get("kind"), type);
  const style = resolveOgStyle(params.get("style"));
  const theme = OG_TYPES[type];
  const collection =
    type in CONTENT_META ? CONTENT_META[type as ContentType] : null;
  const isTaxonomy = type === "categories" || type === "tags";

  let title = cleanText(params.get("title"), 120) || "Prasad M.";
  let description = cleanText(params.get("description"), 160);
  const date = cleanText(params.get("date"), 32);
  const readValue = Number.parseInt(params.get("read") || "", 10);
  const read =
    Number.isFinite(readValue) && readValue > 0 && readValue < 600
      ? `${readValue} min read`
      : "";
  const countValue = Number.parseInt(params.get("count") || "", 10);
  const count =
    Number.isFinite(countValue) && countValue >= 0 && countValue <= 1_000_000
      ? countValue
      : null;
  const countLabel =
    count === null ? "" : `${count} ${count === 1 ? "entry" : "entries"}`;

  let eyebrow: string = theme.singular;
  let facts: OgCardData["facts"] = [];
  let meta: string[] = [];
  if (kind === "home") {
    eyebrow = "Desktop workspace";
    title = resumeProfile.name;
    description =
      description ||
      `${resumeProfile.role} — an engineering portfolio presented as an interactive desktop.`;
    facts = [
      { label: "Based in", value: resumeProfile.location },
      { label: "Role", value: resumeProfile.role },
    ];
    meta = [resumeProfile.location];
  } else if (kind === "collection") {
    eyebrow = isTaxonomy ? "Browse by topic" : "Collection";
    facts = [
      { label: "Section", value: theme.collection },
      ...(isTaxonomy
        ? [{ label: "Scope", value: "All collections" }]
        : collection
          ? [{ label: "Format", value: collection.eyebrow }]
          : []),
      ...(countLabel ? [{ label: "Entries", value: countLabel }] : []),
    ];
    meta = isTaxonomy
      ? ["All collections", countLabel].filter(Boolean)
      : collection
        ? [collection.eyebrow]
        : [];
  } else if (kind === "detail") {
    facts = [
      { label: "Type", value: theme.singular },
      ...(date ? [{ label: "Published", value: date }] : []),
      ...(read ? [{ label: "Reading time", value: read }] : []),
    ];
    meta = [date, read].filter(Boolean);
  } else if (type === "legal") {
    eyebrow = "Legal & privacy";
    facts = [
      { label: "Section", value: theme.collection },
      { label: "Version", value: LEGAL_VERSION },
      { label: "Effective", value: LEGAL_EFFECTIVE_DATE },
    ];
    meta = [`Version ${LEGAL_VERSION}`, LEGAL_EFFECTIVE_DATE];
  } else if (isTaxonomy) {
    eyebrow = "Browse by topic";
    facts = [
      { label: "Section", value: theme.collection },
      { label: "Scope", value: "All collections" },
      ...(countLabel ? [{ label: "Entries", value: countLabel }] : []),
    ];
    meta = ["All collections", countLabel].filter(Boolean);
  } else {
    eyebrow = "Workspace";
    facts = [
      { label: "Section", value: title },
      { label: "Author", value: resumeProfile.name },
    ];
  }

  try {
    const [fonts, avatar, logo, wallpaper, cover] = await Promise.all([
      loadOgFonts(),
      loadAvatar(),
      loadLogo(),
      loadWallpaper(theme.wallpaper),
      kind === "detail"
        ? loadCover(params.get("cover"), request.nextUrl.origin)
        : Promise.resolve(null),
    ]);
    const data: OgCardData = {
      type,
      kind,
      eyebrow,
      title,
      description,
      facts,
      meta,
      media: cover ?? wallpaper,
      hasCover: Boolean(cover),
      avatar,
      logo,
      domain: siteHost(),
      author: resumeProfile.name,
    };
    return new ImageResponse(
      style === "window" ? (
        <WindowCard data={data} />
      ) : (
        <EditorialCard data={data} />
      ),
      {
        ...OG_IMAGE_SIZE,
        fonts,
        headers: {
          "Cache-Control":
            "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch {
    return new Response("Image unavailable", {
      status: 500,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
