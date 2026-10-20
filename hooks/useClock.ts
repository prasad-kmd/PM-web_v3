"use client";

import { useEffect, useState } from "react";

/* Status-bar clock — ticks every second, SSR-safe (renders after mount). */
export function useClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const time = now
    ? now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false })
    : "--:--";
  const seconds = now ? now.getSeconds().toString().padStart(2, "0") : "00";
  const date = now
    ? now.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })
    : "";

  return { now, time, seconds, date };
}
