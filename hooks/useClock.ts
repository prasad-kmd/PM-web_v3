"use client";

import { useEffect, useState } from "react";

/**
 * Clock hook with format: YYYY-MM-DD , hh:MM A/PM
 * Example: 2026-10-21 , 09:45 AM
 */
export function useClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!now) {
    return { formatted: "----.--.-- , --:-- --" };
  }

  const pad = (n: number) => n.toString().padStart(2, "0");
  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());

  let hours = now.getHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hh = pad(hours);
  const mm = pad(now.getMinutes());

  const formatted = `${year}-${month}-${day} , ${hh}:${mm} ${ampm}`;

  return { now, formatted };
}
