"use client";

import { motion } from "motion/react";
import { ChevronLeftIcon, ChevronRightIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMemo, useState } from "react";
import { FLYOUT_IN } from "@/lib/windows";

/* Calendar flyout — opens from the status-bar clock. */
const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

const AGENDA = [
  { time: "09:30", title: "Site walkthrough — Kandy", tone: "accent" as const },
  { time: "14:00", title: "Design review — pm-web v3", tone: "muted" as const },
];

export function CalendarFlyout() {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const days = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    // Monday-first offset
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(first);
    start.setDate(first.getDate() - offset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <motion.div
      className="flyout calendar-flyout"
      role="dialog"
      aria-label="Calendar"
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={FLYOUT_IN}
    >
      <div className="calendar-header">
        <h3>{monthLabel}</h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="cal-nav"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            aria-label="Previous month"
          >
            <HugeiconsIcon icon={ChevronLeftIcon} strokeWidth={2} aria-hidden="true" size={14} />
          </button>
          <button
            type="button"
            className="cal-nav"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            aria-label="Next month"
          >
            <HugeiconsIcon icon={ChevronRightIcon} strokeWidth={2} aria-hidden="true" size={14} />
          </button>
        </div>
      </div>

      <div className="calendar-grid">
        <div className="calendar-weekdays">
          {WEEKDAYS.map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <div className="calendar-days">
          {days.map((d) => {
            const isOther = d.getMonth() !== cursor.getMonth();
            const isToday = d.toDateString() === today.toDateString();
            return (
              <button
                key={d.toISOString()}
                type="button"
                className={`calendar-day${isToday ? " is-today" : ""}${isOther ? " is-other" : ""}`}
              >
                {d.getDate()}
              </button>
            );
          })}
        </div>
      </div>

      <div className="calendar-events">
        <h4>Today</h4>
        {AGENDA.map((item) => (
          <div key={item.time} className="calendar-event">
            <span className="cal-time">{item.time}</span>
            <span className="text-xs">{item.title}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
