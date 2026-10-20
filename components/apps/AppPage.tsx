"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAppearance } from "@/lib/appearance";
import { APP_REGISTRY, WALLPAPERS, type AppId } from "@/lib/registry";
import { AppBody } from "./AppBody";

/* Standalone route view for one app — same body the window renders,
   so a deep link (/settings, /readme) and the window never drift. */
export function AppPage({ appId }: { appId: AppId }) {
  const { wallpaper } = useAppearance();
  const meta = APP_REGISTRY[appId];

  return (
    <main className="standalone">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="desktop-wallpaper" src={WALLPAPERS[wallpaper].src} alt="" aria-hidden />
      <div className="wallpaper-tint" aria-hidden />

      <div className="standalone-shell">
        <div className="standalone-bar">
          <Link href="/" className="standalone-back">
            <ArrowLeft size={14} /> Back to desktop
          </Link>
          <span className="standalone-title">{meta.title}</span>
        </div>
        <div className="standalone-body">
          <AppBody appId={appId} />
        </div>
      </div>
    </main>
  );
}
