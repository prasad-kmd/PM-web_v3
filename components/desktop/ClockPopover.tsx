"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Calendar03Icon,
  Clock01Icon,
  Location01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useClock } from "@/hooks/useClock";
import {
  Popover,
  PopoverPopup,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function ClockPopover() {
  const { now, formatted, colomboTime } = useClock();
  const referenceToday = useMemo(() => now ?? new Date(2026, 9, 26), [now]);
  const [cursorMonth, setCursorMonth] = useState<Date>(
    () => new Date(referenceToday.getFullYear(), referenceToday.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const activeDate = selectedDate ?? now ?? referenceToday;

  const days = useMemo(() => {
    const firstOfMonth = new Date(
      cursorMonth.getFullYear(),
      cursorMonth.getMonth(),
      1,
    );
    const mondayOffset = (firstOfMonth.getDay() + 6) % 7;
    const gridStart = new Date(firstOfMonth);
    gridStart.setDate(firstOfMonth.getDate() - mondayOffset);

    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(gridStart);
      day.setDate(gridStart.getDate() + index);
      return day;
    });
  }, [cursorMonth]);

  const monthHeading = cursorMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const selectedLabel = activeDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const isViewingCurrentMonth =
    now !== null &&
    cursorMonth.getFullYear() === now.getFullYear() &&
    cursorMonth.getMonth() === now.getMonth();

  const jumpToToday = () => {
    const target = now ?? new Date();
    setCursorMonth(new Date(target.getFullYear(), target.getMonth(), 1));
    setSelectedDate(target);
  };

  return (
    <Popover>
      <PopoverTrigger
        className="menu-bar-clock-btn"
        aria-label="Open calendar and local time"
      >
        <time className="menu-bar-clock">{formatted}</time>
      </PopoverTrigger>

      <PopoverPopup
        align="end"
        side="bottom"
        sideOffset={8}
        className="clock-popover"
      >
        <div className="clock-popover-header">
          <div className="clock-popover-zone">
            <span className="clock-popover-eyebrow">
              <HugeiconsIcon icon={Clock01Icon} strokeWidth={2} size={13} />
              Workspace time · UTC +05:30
            </span>
            <PopoverTitle className="clock-popover-time">
              {colomboTime}
            </PopoverTitle>
            <span className="clock-popover-sub">
              <HugeiconsIcon icon={Location01Icon} strokeWidth={2} size={12} />
              Sri Lanka · Open to collaboration
            </span>
          </div>
        </div>

        <div className="clock-calendar">
          <div className="clock-calendar-bar">
            <span className="clock-calendar-month">
              <HugeiconsIcon icon={Calendar03Icon} strokeWidth={2} size={14} />
              {monthHeading}
            </span>

            <div className="clock-calendar-actions">
              {!isViewingCurrentMonth && (
                <button
                  type="button"
                  className="clock-calendar-today-btn"
                  onClick={jumpToToday}
                >
                  Today
                </button>
              )}
              <button
                type="button"
                className="clock-calendar-nav-btn"
                onClick={() =>
                  setCursorMonth(
                    (prev) =>
                      new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
                  )
                }
                aria-label="Previous month"
              >
                <HugeiconsIcon
                  icon={ArrowLeft01Icon}
                  strokeWidth={2}
                  size={14}
                />
              </button>
              <button
                type="button"
                className="clock-calendar-nav-btn"
                onClick={() =>
                  setCursorMonth(
                    (prev) =>
                      new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
                  )
                }
                aria-label="Next month"
              >
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  strokeWidth={2}
                  size={14}
                />
              </button>
            </div>
          </div>

          <div className="clock-calendar-weekdays" aria-hidden="true">
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div
            className="clock-calendar-grid"
            role="grid"
            aria-label={monthHeading}
          >
            {days.map((day) => {
              const outside = day.getMonth() !== cursorMonth.getMonth();
              const isToday = now ? sameDay(day, now) : false;
              const isSelected =
                selectedDate !== null && sameDay(day, selectedDate);

              return (
                <button
                  key={`${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`}
                  type="button"
                  onClick={() => setSelectedDate(day)}
                  aria-pressed={isSelected || isToday}
                  aria-label={day.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                  className={`clock-calendar-day${outside ? " is-outside" : ""}${isToday ? " is-today" : ""}${isSelected && !isToday ? " is-selected" : ""}`}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        <div className="clock-popover-footer">
          <span className="clock-popover-date-label">{selectedLabel}</span>
          {selectedDate && (!now || !sameDay(selectedDate, now)) && (
            <button
              type="button"
              className="clock-calendar-today-btn"
              onClick={jumpToToday}
            >
              Reset
            </button>
          )}
        </div>
      </PopoverPopup>
    </Popover>
  );
}
