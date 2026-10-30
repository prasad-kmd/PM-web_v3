import type { Metadata } from "next";
import { PM_LOGO_SVG } from "@/components/system/PmLogo";

export const metadata: Metadata = {
  title: "Offline",
  description: "This page is not available offline yet.",
  robots: { index: false, follow: false },
};

const CSS = `
@font-face{font-family:"Outfit";src:url("/fonts/outfit-latin-variable.woff2") format("woff2");font-weight:100 900;font-display:swap}
.pm-offline{position:fixed;inset:0;z-index:58;display:grid;place-items:center;overflow:auto;box-sizing:border-box;padding:24px;background:oklch(.145 0 0);color:oklch(.985 0 0);font-family:Outfit,Arial,sans-serif;-webkit-font-smoothing:antialiased}
.pm-offline *{box-sizing:border-box}
.pm-offline-card{display:flex;width:min(520px,100%);flex-direction:column;align-items:center;gap:12px;text-align:center}
.pm-offline-logo{width:56px;height:56px;line-height:0}
.pm-offline-eyebrow{margin:10px 0 0;color:oklch(.708 0 0);font-size:11px;font-weight:600;letter-spacing:.16em;text-transform:uppercase}
.pm-offline h1{margin:0;font-size:26px;font-weight:650;line-height:1.25;letter-spacing:-.02em}
.pm-offline-copy{max-width:440px;margin:0;color:oklch(.708 0 0);font-size:14.5px;line-height:1.65}
.pm-offline-actions{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:8px}
.pm-offline-btn{display:inline-flex;min-height:38px;align-items:center;justify-content:center;padding:0 15px;border:1px solid oklch(1 0 0/14%);border-radius:8px;color:oklch(.985 0 0);font-size:14px;font-weight:500;text-decoration:none}
.pm-offline-btn.primary{border-color:transparent;background:oklch(.985 0 0);color:oklch(.145 0 0)}
.pm-offline-btn:hover{background:oklch(1 0 0/8%)}
.pm-offline-btn.primary:hover{background:oklch(.87 0 0)}
.pm-offline-btn:focus-visible{outline:2px solid oklch(.708 0 0);outline-offset:3px}
.pm-offline-links{display:flex;flex-wrap:wrap;justify-content:center;gap:8px 16px;margin-top:12px}
.pm-offline-links a{color:oklch(.87 0 0);font-size:13px;text-decoration:none}
.pm-offline-links a:hover{text-decoration:underline;text-underline-offset:3px}
.pm-offline-note{margin:8px 0 0;color:oklch(.556 0 0);font-size:12px;line-height:1.55}
`;

const CACHED_AREAS = [
  { href: "/", label: "Home" },
  { href: "/projects", label: "Projects" },
  { href: "/blog", label: "Blog" },
  { href: "/articles", label: "Articles" },
  { href: "/tutorials", label: "Tutorials" },
  { href: "/resume", label: "Resume" },
] as const;

export default function OfflinePage() {
  return (
    <main className="pm-offline" aria-labelledby="pm-offline-title">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="pm-offline-card">
        <span
          className="pm-offline-logo"
          aria-hidden
          dangerouslySetInnerHTML={{ __html: PM_LOGO_SVG }}
        />
        <p className="pm-offline-eyebrow">Prasad M. · Offline</p>
        <h1 id="pm-offline-title">You&apos;re offline</h1>
        <p className="pm-offline-copy">
          This page hasn&apos;t been saved for offline use yet. Public pages you
          have already visited may still open; forms, comments and owner tools
          need a connection.
        </p>

        <div className="pm-offline-actions">
          {/* A document navigation, so retrying works without client JS. */}
          <a className="pm-offline-btn primary" href="">
            Try again
          </a>
          <a className="pm-offline-btn" href="/">
            Open home
          </a>
        </div>

        <nav className="pm-offline-links" aria-label="Possibly cached areas">
          {CACHED_AREAS.map((area) => (
            <a key={area.href} href={area.href}>
              {area.label}
            </a>
          ))}
        </nav>

        <p className="pm-offline-note">
          Reconnect and try again to load the latest version.
        </p>
      </div>
    </main>
  );
}
