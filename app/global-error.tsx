"use client";
/** Must work without the root layout, providers, or application CSS. */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#1d1d1d",
          color: "#f5f5f5",
          fontFamily: "Arial, sans-serif",
          padding: 20,
          boxSizing: "border-box",
        }}
      >
        <main
          style={{
            width: "min(100%, 420px)",
            border: "1px solid #484848",
            borderRadius: 10,
            background: "#292929",
            boxShadow: "0 16px 38px rgba(0,0,0,.3)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid #484848",
              fontSize: 13,
              textAlign: "center",
            }}
          >
            Workspace recovery
          </div>
          <div style={{ padding: 24 }}>
            <div
              aria-hidden="true"
              style={{
                width: 32,
                height: 32,
                display: "grid",
                placeItems: "center",
                border: "1px solid #555",
                borderRadius: 6,
              }}
            >
              !
            </div>
            <h1 style={{ fontSize: 19, lineHeight: 1.3, margin: "18px 0 8px" }}>
              Workspace couldn’t start
            </h1>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.6,
                color: "#c4c4c4",
                margin: 0,
              }}
            >
              The desktop is unavailable. Try again or return home.
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <button
                type="button"
                onClick={reset}
                style={{
                  background: "#f5f5f5",
                  color: "#1d1d1d",
                  border: 0,
                  borderRadius: 6,
                  padding: "9px 13px",
                  cursor: "pointer",
                }}
              >
                Try again
              </button>
              <a
                href="/"
                style={{
                  border: "1px solid #555",
                  borderRadius: 6,
                  color: "#f5f5f5",
                  padding: "8px 13px",
                  textDecoration: "none",
                  fontSize: 14,
                }}
              >
                Home
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
