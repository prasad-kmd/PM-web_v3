import { Cancel01Icon, SquareIcon } from "@hugeicons/core-free-icons";
import { OgIcon } from "./icon";
import { truncate } from "./sanitize";
import { OG_SHORTCUTS, OG_TYPES, type OgCardData } from "./theme";

const MENUS = ["File", "Explore", "View", "Window", "Help"];

/**
 * OG 02 · Desktop window (secondary, `?style=window` or `OG_STYLE=window`).
 * A miniature of the site: menubar, the type's Bloom wallpaper, a focused
 * window with the universal breadcrumb, and desktop shortcuts with the
 * current collection highlighted.
 */
export function WindowCard({ data }: { data: OgCardData }) {
  const theme = OG_TYPES[data.type];
  const isHome = data.kind === "home";
  const windowTitle = isHome
    ? "Prasad M. — Desktop Workspace"
    : `${theme.collection} — Prasad M.`;
  const crumbs = [
    "Home",
    isHome ? "Workspace" : theme.collection,
    ...(data.kind === "detail" ? [truncate(data.title, 30)] : []),
  ];
  const titleSize =
    data.title.length > 70 ? 44 : data.title.length > 45 ? 52 : 60;
  return (
    <div
      style={{
        position: "relative",
        width: 1200,
        height: 630,
        display: "flex",
        flexDirection: "column",
        background: "#1f1f1f",
        color: "#fafafa",
        fontFamily: "Outfit",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={data.media}
        width={1200}
        height={630}
        alt=""
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          objectFit: "cover",
          opacity: 0.75,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 1200,
          height: 630,
          display: "flex",
          backgroundColor: "rgba(37,37,37,0.42)",
        }}
      />

      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 22,
          height: 48,
          padding: "0 22px",
          background: "#252525",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          fontSize: 17,
          fontWeight: 500,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={data.logo} width={26} height={26} alt="" />
        {MENUS.map((menu) => (
          <span key={menu}>{menu}</span>
        ))}
        <span style={{ marginLeft: "auto", color: "#a3a3a3", fontSize: 15 }}>
          {data.domain}
        </span>
      </div>

      <div
        style={{
          position: "relative",
          display: "flex",
          flex: 1,
          padding: "40px 56px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignSelf: "flex-start",
            width: 860,
            background: "#2e2e2e",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 16,
            boxShadow: "0 30px 60px -10px rgba(0,0,0,0.67)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: 52,
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              fontSize: 18,
              fontWeight: 500,
              color: "#e5e5e5",
            }}
          >
            <span>{windowTitle}</span>
            <div
              style={{
                position: "absolute",
                right: 20,
                top: 15,
                display: "flex",
                gap: 18,
              }}
            >
              <OgIcon
                icon={SquareIcon}
                size={20}
                color="#8a8a8a"
                strokeWidth={2}
              />
              <OgIcon
                icon={Cancel01Icon}
                size={20}
                color="#8a8a8a"
                strokeWidth={2}
              />
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              height: 44,
              padding: "0 28px",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.02)",
              fontSize: 16,
              color: "#9a9a9a",
            }}
          >
            {crumbs.map((crumb, index) => (
              <div
                key={index}
                style={{ display: "flex", alignItems: "center", gap: 10 }}
              >
                {index ? <span>›</span> : null}
                <span
                  style={{
                    color: index === crumbs.length - 1 ? "#e5e5e5" : "#9a9a9a",
                  }}
                >
                  {crumb}
                </span>
              </div>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 18,
              padding: "34px 40px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 19,
                color: "#b5b5b5",
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  background: theme.accent,
                }}
              />
              <span>{data.eyebrow}</span>
            </div>
            <div
              style={{
                display: "flex",
                fontSize: titleSize,
                lineHeight: 1.1,
                fontWeight: 600,
                letterSpacing: "-0.025em",
              }}
            >
              {data.title}
            </div>
            {data.description ? (
              <div
                style={{
                  display: "flex",
                  fontSize: 22,
                  lineHeight: 1.5,
                  color: "#b0b0b0",
                }}
              >
                {truncate(data.description, 120)}
              </div>
            ) : null}
            {data.meta.length ? (
              <div style={{ display: "flex", fontSize: 18, color: "#8f8f8f" }}>
                {data.meta.join(" · ")}
              </div>
            ) : null}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            marginLeft: "auto",
            alignItems: "center",
          }}
        >
          {OG_SHORTCUTS.map((key) => {
            const shortcut = OG_TYPES[key];
            const active = key === data.type;
            return (
              <div
                key={key}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 14,
                  color: "#eaeaea",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 52,
                    height: 52,
                    borderRadius: 12,
                    background: "rgba(46,46,46,0.8)",
                    border: `1px solid ${active ? "rgba(255,255,255,0.33)" : "rgba(255,255,255,0.1)"}`,
                  }}
                >
                  <OgIcon
                    icon={shortcut.icon}
                    size={26}
                    color={active ? shortcut.accent : "#d4d4d4"}
                  />
                </div>
                <span>{shortcut.collection}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
