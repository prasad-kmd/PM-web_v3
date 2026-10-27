import { OG_TYPES, type OgCardData } from "./theme";

/**
 * OG 04 · Editorial split (default). Copy and author on a flat light
 * panel; the right panel shows the entry's Notion cover, or the type's
 * Bloom wallpaper, with a column of facts on top.
 * Satori rules: flexbox only, every multi-child node is `display:flex`.
 */
export function EditorialCard({ data }: { data: OgCardData }) {
  const accent = OG_TYPES[data.type].accent;
  const length = data.title.length;
  const titleSize = length > 90 ? 46 : length > 55 ? 54 : 66;
  return (
    <div
      style={{
        width: 1200,
        height: 630,
        display: "flex",
        background: "#fafafa",
        color: "#1f1f1f",
        fontFamily: "Outfit",
      }}
    >
      <div
        style={{
          width: 740,
          height: 630,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 64px 56px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontSize: 21,
              fontWeight: 500,
              color: "#525252",
            }}
          >
            <div style={{ width: 28, height: 3, background: accent }} />
            <span>{data.eyebrow}</span>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: titleSize,
              lineHeight: 1.08,
              fontWeight: 600,
              letterSpacing: "-0.03em",
            }}
          >
            {data.title}
          </div>
          {data.description ? (
            <div
              style={{
                display: "flex",
                fontSize: 24,
                lineHeight: 1.5,
                color: "#5c5c5c",
              }}
            >
              {data.description}
            </div>
          ) : null}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.avatar}
            width={52}
            height={52}
            alt=""
            style={{
              borderRadius: 12,
              border: "1px solid #e5e5e5",
              objectFit: "cover",
            }}
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 20, fontWeight: 600 }}>{data.author}</span>
            <span style={{ fontSize: 16, color: "#737373" }}>
              {data.domain}
            </span>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.logo}
            width={44}
            height={44}
            alt=""
            style={{ marginLeft: "auto" }}
          />
        </div>
      </div>

      <div
        style={{
          position: "relative",
          width: 460,
          height: 630,
          display: "flex",
          background: "#1f1f1f",
          color: "#fafafa",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={data.media}
          width={460}
          height={630}
          alt=""
          style={{ position: "absolute", top: 0, left: 0, objectFit: "cover" }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 460,
            height: 630,
            display: "flex",
            backgroundImage:
              "linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.62) 52%, rgba(0,0,0,0.9) 72%, rgba(0,0,0,0.95) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 36,
            right: 36,
            bottom: 28,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {data.facts.map((fact) => (
            <div
              key={fact.label}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                padding: "16px 0",
                borderTop: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              <span style={{ fontSize: 14, color: "rgba(255,255,255,0.67)" }}>
                {fact.label}
              </span>
              <span style={{ fontSize: 19, fontWeight: 500 }}>
                {fact.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
