"use client";

import { useEffect, useState } from "react";

/**
 * Clock hook with format: YYYY-MM-DD , hh:MM A/PM
 * Example: 2026-10-26 , 09:45 AM
 */
export function useClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!now) {
    return {
      now: null as Date | null,
      formatted: "----.--.-- , --:-- --",
      colomboTime: "--:--:-- --",
      date: "----.--.--",
      time: "--:-- --",
      seconds: "--",
    };
  }

  const pad = (n: number) => n.toString().padStart(2, "0");
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const hours24 = now.getHours();
  const ampm = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  const hh = pad(hours12);
  const mm = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());
  const time = `${hh}:${mm} ${ampm}`;
  const formatted = `${date} , ${time}`;

  let colomboTime = "--:--:-- --";
  try {
    colomboTime = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Colombo",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(now);
  } catch {
    colomboTime = `${hh}:${mm}:${seconds} ${ampm}`;
  }

  return { now, formatted, colomboTime, date, time, seconds };
}
