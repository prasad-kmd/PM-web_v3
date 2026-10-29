import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import {
  loadAvatar,
  loadLogo,
  loadOgFonts,
  loadWallpaper,
} from "@/lib/og/assets";
import {
  CANVAS_PRESETS,
  OG_ACCENTS,
  OG_BACKDROPS,
  type OgCustomConfig,
  type OgIconId,
} from "@/lib/og/custom-schema";

const MAX_REMOTE_IMAGE_BYTES = 4 * 1024 * 1024;
const REMOTE_TIMEOUT_MS = 4000;
const ALLOWED_MIMES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

function isPrivateIpAddress(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) {
    const parts = ip.split(".").map(Number);
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a >= 224) return true;
    return false;
  }
  if (version === 6) {
    const normalized = ip.toLowerCase();
    if (normalized === "::1" || normalized === "::") return true;
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
    if (normalized.startsWith("fe8") || normalized.startsWith("fe9"))
      return true;
    if (normalized.startsWith("fea") || normalized.startsWith("feb"))
      return true;
    if (normalized.startsWith("::ffff:")) {
      return isPrivateIpAddress(normalized.slice(7));
    }
    return false;
  }
  return true;
}

async function resolveSafeExternalUrl(rawUrl: string): Promise<URL | null> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  const host = parsed.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".localhost")
  ) {
    return null;
  }
  if (isIP(host)) {
    return isPrivateIpAddress(host) ? null : parsed;
  }
  try {
    const records = await lookup(host, { all: true });
    if (!records.length) return null;
    for (const rec of records) {
      if (isPrivateIpAddress(rec.address)) return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function loadCustomVisual(
  config: OgCustomConfig,
  origin: string,
): Promise<string | null> {
  if (config.imageDataUri) {
    const trimmed = config.imageDataUri.trim();
    const match =
      /^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(
        trimmed,
      );
    if (match) {
      const approxBytes = Math.floor((match[2].length * 3) / 4);
      if (approxBytes <= MAX_REMOTE_IMAGE_BYTES) {
        return trimmed;
      }
    }
  }

  const raw = config.image.trim();
  if (!raw) return null;

  let fetchTarget: URL | null = null;
  if (
    raw.startsWith("/images/") ||
    raw.startsWith("/og/") ||
    raw.startsWith("/api/notion-image?")
  ) {
    try {
      fetchTarget = new URL(raw, origin);
    } catch {
      fetchTarget = null;
    }
  } else if (raw.startsWith("https://")) {
    fetchTarget = await resolveSafeExternalUrl(raw);
  }

  if (!fetchTarget) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REMOTE_TIMEOUT_MS);
  try {
    const response = await fetch(fetchTarget, {
      signal: controller.signal,
      redirect: "follow",
      headers: { Accept: "image/png,image/jpeg,image/webp;q=0.9" },
    });
    if (!response.ok) return null;
    const mime = (response.headers.get("content-type") || "")
      .split(";")[0]
      .trim()
      .toLowerCase();
    if (!ALLOWED_MIMES.has(mime)) return null;
    const declared = Number(response.headers.get("content-length") || 0);
    if (declared > MAX_REMOTE_IMAGE_BYTES) return null;
    const buf = Buffer.from(await response.arrayBuffer());
    if (buf.byteLength > MAX_REMOTE_IMAGE_BYTES) return null;
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function resolveTitlePx(
  title: string,
  sizePref: OgCustomConfig["titleSize"],
  hasSideVisual: boolean,
  isSquare: boolean,
): number {
  if (sizePref === "sm") return 42;
  if (sizePref === "md") return 52;
  if (sizePref === "lg") return 62;
  if (sizePref === "xl") return 72;

  const len = title.length;
  let base = 62;
  if (len > 110) base = 40;
  else if (len > 82) base = 46;
  else if (len > 56) base = 54;
  else if (len < 30) base = 68;

  if (hasSideVisual) base = Math.max(38, base - 8);
  if (isSquare) base = Math.min(72, base + 4);
  return base;
}

function resolveDescPx(sizePref: OgCustomConfig["descSize"]): number {
  if (sizePref === "sm") return 19;
  if (sizePref === "lg") return 26;
  return 22;
}

function IconGlyph({
  icon,
  logoUri,
  color,
}: {
  icon: OgIconId;
  logoUri: string;
  color: string;
}) {
  if (icon === "none") return null;
  if (icon === "pm") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUri}
        alt=""
        width={26}
        height={26}
        style={{ width: 26, height: 26, borderRadius: 6 }}
      />
    );
  }

  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (icon) {
    case "cpu":
      return (
        <svg {...common}>
          <rect x="5" y="5" width="14" height="14" rx="2" />
          <rect x="9" y="9" width="6" height="6" rx="1" />
          <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
        </svg>
      );
    case "code":
      return (
        <svg {...common}>
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      );
    case "layers":
      return (
        <svg {...common}>
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      );
    case "terminal":
      return (
        <svg {...common}>
          <polyline points="4 17 10 11 4 5" />
          <line x1="12" y1="19" x2="20" y2="19" />
        </svg>
      );
    case "sparkles":
      return (
        <svg {...common}>
          <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
          <path d="M19 16l.9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9L19 16z" />
        </svg>
      );
    case "compass":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
        </svg>
      );
    case "wrench":
      return (
        <svg {...common}>
          <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4l-5.6 5.6a2 2 0 0 0 2.8 2.8l5.6-5.6a4 4 0 0 0 5.4-5.4l-2.4 2.4-2.8-2.8 2.4-2.4z" />
        </svg>
      );
    default:
      return null;
  }
}

export async function buildCustomOgImage(
  config: OgCustomConfig,
  origin: string,
) {
  const dimensions = CANVAS_PRESETS[config.preset];
  const backdropMeta = OG_BACKDROPS[config.backdrop];
  const accentMeta = OG_ACCENTS[config.accent];

  const [fonts, avatarUri, logoUri, wallpaperUri, visualUri] =
    await Promise.all([
      loadOgFonts(),
      loadAvatar(),
      loadLogo(),
      backdropMeta.wallpaper
        ? loadWallpaper(backdropMeta.wallpaper)
        : Promise.resolve(null),
      loadCustomVisual(config, origin),
    ]);

  const isLightCard =
    config.backdrop === "daylight"
      ? config.cardTone !== "dark"
      : config.cardTone === "light";
  const ink = isLightCard ? "#0f172a" : "#f8fafc";
  const subInk = isLightCard
    ? "rgba(15, 23, 42, 0.72)"
    : "rgba(241, 245, 249, 0.76)";
  const mutedInk = isLightCard
    ? "rgba(15, 23, 42, 0.52)"
    : "rgba(226, 232, 240, 0.56)";
  const accentColor = isLightCard ? accentMeta.strong : accentMeta.hex;

  const vignetteAlpha =
    config.vignette === "subtle"
      ? 0.28
      : config.vignette === "deep"
        ? 0.66
        : 0.46;

  const tags = config.tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 5);

  const hasSideVisual = Boolean(
    visualUri && (config.layout === "split" || config.layout === "spotlight"),
  );
  const isSquare = config.preset === "square";
  const centered = config.layout === "minimal" || config.align === "center";
  const titlePx = resolveTitlePx(
    config.title,
    config.titleSize,
    hasSideVisual,
    isSquare,
  );
  const descPx = resolveDescPx(config.descSize);

  const outerPad = config.layout === "editorial" ? 0 : isSquare ? 54 : 46;
  const cardRadius = config.layout === "editorial" ? 0 : 28;

  const cardBackground = isLightCard
    ? "linear-gradient(155deg, rgba(255,255,255,0.90) 0%, rgba(248,250,252,0.82) 100%)"
    : config.layout === "editorial"
      ? "linear-gradient(140deg, rgba(8,13,24,0.86) 0%, rgba(12,19,34,0.68) 55%, rgba(8,13,24,0.88) 100%)"
      : "linear-gradient(155deg, rgba(13, 19, 33, 0.84) 0%, rgba(10, 15, 27, 0.74) 100%)";

  const borderStyle =
    config.showBorder && config.layout !== "editorial"
      ? isLightCard
        ? "1.5px solid rgba(15, 23, 42, 0.12)"
        : "1.5px solid rgba(255, 255, 255, 0.18)"
      : "none";

  const patternBg =
    config.pattern === "grid"
      ? {
          backgroundImage: isLightCard
            ? "linear-gradient(to right, rgba(15,23,42,0.055) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.055) 1px, transparent 1px)"
            : "linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }
      : config.pattern === "dots"
        ? {
            backgroundImage: isLightCard
              ? "radial-gradient(rgba(15,23,42,0.14) 1.25px, transparent 1.25px)"
              : "radial-gradient(rgba(255,255,255,0.16) 1.25px, transparent 1.25px)",
            backgroundSize: "24px 24px",
          }
        : null;

  const element = (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        fontFamily: "Outfit",
        padding: outerPad,
        background:
          config.backdrop === "daylight"
            ? "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)"
            : "linear-gradient(135deg, #070b14 0%, #0f172a 55%, #172554 100%)",
      }}
    >
      {/* Wallpaper or studio canvas layer */}
      {wallpaperUri && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={wallpaperUri}
          alt=""
          width={dimensions.width}
          height={dimensions.height}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: dimensions.width,
            height: dimensions.height,
            objectFit: "cover",
          }}
        />
      )}

      {/* Editorial background image mode when layout is editorial & visual is provided */}
      {visualUri && config.layout === "editorial" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={visualUri}
          alt=""
          width={dimensions.width}
          height={dimensions.height}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: dimensions.width,
            height: dimensions.height,
            objectFit: "cover",
            opacity: 0.34,
          }}
        />
      )}

      {/* Atmospheric vignette + accent bloom */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: dimensions.width,
          height: dimensions.height,
          display: "flex",
          background:
            config.backdrop === "daylight"
              ? `radial-gradient(circle at 84% 18%, ${accentMeta.soft} 0%, rgba(255,255,255,0) 58%)`
              : `linear-gradient(160deg, rgba(6, 10, 19, ${vignetteAlpha}) 0%, rgba(6, 10, 19, ${Math.min(0.84, vignetteAlpha + 0.18)}) 100%)`,
        }}
      />

      {/* Accent spotlight orb */}
      <div
        style={{
          position: "absolute",
          top: -120,
          right: -90,
          width: 480,
          height: 480,
          borderRadius: 9999,
          display: "flex",
          background: `radial-gradient(circle, ${accentMeta.soft} 0%, rgba(0,0,0,0) 70%)`,
        }}
      />

      {/* Optional blueprint grid / dot matrix overlay */}
      {patternBg && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: dimensions.width,
            height: dimensions.height,
            display: "flex",
            ...patternBg,
          }}
        />
      )}

      {/* Main Spotlight Card */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          borderRadius: cardRadius,
          background: cardBackground,
          border: borderStyle,
          padding: config.layout === "editorial" ? "58px 68px" : "44px 52px",
          boxShadow:
            config.layout === "editorial"
              ? "none"
              : isLightCard
                ? "0 28px 68px rgba(15, 23, 42, 0.16)"
                : "0 30px 76px rgba(0, 0, 0, 0.52)",
          overflow: "hidden",
        }}
      >
        {/* Top accent specular bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 52,
            width: 148,
            height: 3,
            borderRadius: 999,
            display: "flex",
            background: accentColor,
          }}
        />

        {/* Corner crosshair ticks when pattern === "crosshair" */}
        {config.pattern === "crosshair" && (
          <div
            style={{
              position: "absolute",
              top: 20,
              right: 24,
              display: "flex",
              alignItems: "center",
              gap: 6,
              opacity: 0.45,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: accentColor,
                display: "flex",
              }}
            />
            <div
              style={{
                width: 26,
                height: 1,
                background: mutedInk,
                display: "flex",
              }}
            />
          </div>
        )}

        {/* Top header row: icon + category pill + kicker */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: centered ? "center" : "space-between",
            width: "100%",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {config.icon !== "none" && (
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: isLightCard
                    ? "rgba(15, 23, 42, 0.06)"
                    : "rgba(255, 255, 255, 0.08)",
                  border: isLightCard
                    ? "1px solid rgba(15, 23, 42, 0.1)"
                    : "1px solid rgba(255, 255, 255, 0.14)",
                }}
              >
                <IconGlyph
                  icon={config.icon}
                  logoUri={logoUri}
                  color={accentColor}
                />
              </div>
            )}

            {config.category && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 15px",
                  borderRadius: 999,
                  background: accentMeta.soft,
                  border: `1px solid ${accentColor}44`,
                  color: accentColor,
                  fontSize: 16,
                  fontWeight: 600,
                  letterSpacing: "0.02em",
                }}
              >
                <span>{config.category}</span>
              </div>
            )}

            {config.kicker && (
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 500,
                  color: mutedInk,
                }}
              >
                {config.kicker}
              </span>
            )}
          </div>

          {!centered && config.siteUrl && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "6px 14px",
                borderRadius: 999,
                background: isLightCard
                  ? "rgba(15, 23, 42, 0.05)"
                  : "rgba(255, 255, 255, 0.06)",
                color: mutedInk,
                fontSize: 15,
                fontWeight: 500,
              }}
            >
              {config.siteUrl}
            </div>
          )}
        </div>

        {/* Middle body: Title + Description + Tags (+ Optional side visual) */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: centered ? "center" : "space-between",
            gap: 38,
            width: "100%",
            marginTop: 12,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: centered ? "center" : "flex-start",
              textAlign: centered ? "center" : "left",
              flex: 1,
              maxWidth: hasSideVisual ? "60%" : "96%",
            }}
          >
            <div
              style={{
                fontSize: titlePx,
                fontWeight: 600,
                lineHeight: 1.09,
                letterSpacing: "-0.03em",
                color: ink,
                display: "flex",
              }}
            >
              {config.title}
            </div>

            {config.description && (
              <div
                style={{
                  marginTop: 18,
                  fontSize: descPx,
                  fontWeight: 400,
                  lineHeight: 1.44,
                  color: subInk,
                  maxWidth: centered ? 860 : 820,
                  display: "flex",
                }}
              >
                {config.description}
              </div>
            )}

            {tags.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: centered ? "center" : "flex-start",
                  gap: 10,
                  marginTop: 22,
                }}
              >
                {tags.map((tag) => (
                  <div
                    key={tag}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "5px 13px",
                      borderRadius: 8,
                      fontSize: 15,
                      fontWeight: 500,
                      color: subInk,
                      background: isLightCard
                        ? "rgba(15, 23, 42, 0.055)"
                        : "rgba(255, 255, 255, 0.075)",
                      border: isLightCard
                        ? "1px solid rgba(15, 23, 42, 0.08)"
                        : "1px solid rgba(255, 255, 255, 0.11)",
                    }}
                  >
                    #{tag}
                  </div>
                ))}
              </div>
            )}
          </div>

          {hasSideVisual && visualUri && (
            <div
              style={{
                width: isSquare ? 360 : 370,
                height: isSquare ? 360 : 272,
                borderRadius: 20,
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: isLightCard
                  ? "rgba(15, 23, 42, 0.04)"
                  : "rgba(255, 255, 255, 0.05)",
                border: isLightCard
                  ? "1px solid rgba(15, 23, 42, 0.1)"
                  : "1px solid rgba(255, 255, 255, 0.16)",
                boxShadow: "0 20px 44px rgba(0, 0, 0, 0.34)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={visualUri}
                alt=""
                width={370}
                height={272}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: config.imageFit,
                }}
              />
            </div>
          )}
        </div>

        {/* Footer identity strip */}
        {config.showFooter ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: centered ? "center" : "space-between",
              width: "100%",
              paddingTop: 18,
              borderTop: isLightCard
                ? "1px solid rgba(15, 23, 42, 0.09)"
                : "1px solid rgba(255, 255, 255, 0.11)",
              gap: 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {config.showAvatar && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUri}
                  alt=""
                  width={42}
                  height={42}
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 999,
                    objectFit: "cover",
                    border: `2px solid ${accentColor}66`,
                  }}
                />
              )}
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: ink,
                    lineHeight: 1.2,
                  }}
                >
                  {config.author || config.siteName}
                </span>
                {config.siteName && config.siteName !== config.author && (
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 400,
                      color: mutedInk,
                      marginTop: 2,
                    }}
                  >
                    {config.siteName}
                  </span>
                )}
              </div>
            </div>

            {centered && config.siteUrl ? (
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 500,
                  color: mutedInk,
                }}
              >
                {config.siteUrl}
              </span>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: accentColor,
                    display: "flex",
                  }}
                />
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: mutedInk,
                  }}
                >
                  {dimensions.width} × {dimensions.height}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", height: 4 }} />
        )}
      </div>
    </div>
  );

  return {
    element,
    width: dimensions.width,
    height: dimensions.height,
    fonts,
  };
}
