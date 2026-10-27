import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
export const runtime = "nodejs";
const labels: Record<string, string> = {
  projects: "Projects",
  blog: "Blog",
  articles: "Articles",
  tutorials: "Tutorials",
  glossary: "Glossary",
  pages: "Workspace",
  default: "Desktop Workspace",
};
function text(value: string, max: number) {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const title = text(
    params.get("title") || "Prasad M. — Desktop Workspace",
    180,
  );
  const description = text(
    params.get("description") ||
      "An engineering portfolio and personal workspace.",
    200,
  );
  const rawType = params.get("type") || "default";
  const label = Object.hasOwn(labels, rawType)
    ? labels[rawType]
    : labels.default;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "#1d1d1d",
        color: "#f5f5f5",
        padding: "56px",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          border: "1px solid #555",
          borderRadius: 18,
          background: "#292929",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: 66,
            display: "flex",
            alignItems: "center",
            padding: "0 28px",
            borderBottom: "1px solid #4a4a4a",
            color: "#c4c4c4",
            fontSize: 20,
          }}
        >
          <div style={{ display: "flex", gap: 9, marginRight: 22 }}>
            <div
              style={{
                width: 13,
                height: 13,
                borderRadius: 20,
                background: "#969696",
              }}
            />
            <div
              style={{
                width: 13,
                height: 13,
                borderRadius: 20,
                background: "#696969",
              }}
            />
            <div
              style={{
                width: 13,
                height: 13,
                borderRadius: 20,
                background: "#505050",
              }}
            />
          </div>
          <span>{label}</span>
        </div>
        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "50px 56px 36px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: 19,
                color: "#b5b5b5",
                marginBottom: 22,
              }}
            >
              {label} / Prasad M.
            </div>
            <div
              style={{
                fontSize: title.length > 90 ? 52 : 64,
                fontWeight: 700,
                lineHeight: 1.13,
                letterSpacing: -1.5,
                maxHeight: 220,
                overflow: "hidden",
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: 25,
                lineHeight: 1.35,
                color: "#bdbdbd",
                marginTop: 22,
                maxHeight: 110,
                overflow: "hidden",
              }}
            >
              {description}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid #4a4a4a",
              paddingTop: 21,
              fontSize: 19,
              color: "#bababa",
            }}
          >
            <span>Prasad Madhuranga</span>
            <span>Engineering · Ideas · Work</span>
          </div>
        </div>
      </div>
    </div>,
    {
      width: 1280,
      height: 720,
      headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" },
    },
  );
}
