"use client";

import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Handshake, Activity } from "lucide-react";

/* ================================================================== */
/*  Calendar View — Month view rendering deals/activities by date      */
/* ================================================================== */

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: "deal" | "activity" | "closed";
  color?: string;
  value?: number;
}

interface CalendarViewProps {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
}

const DAYS_ES = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Monday = 0, Sunday = 6
  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const days: Array<{ date: Date; isCurrentMonth: boolean }> = [];

  // Previous month days
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({ date: d, isCurrentMonth: false });
  }

  // Current month days
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push({ date: new Date(year, month, i), isCurrentMonth: true });
  }

  // Next month days to fill grid (6 rows)
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
  }

  return days;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const EVENT_COLORS: Record<string, string> = {
  deal: "#3ecf8e",
  activity: "#3b82f6",
  closed: "#f59e0b",
};

export function CalendarView({ events, onEventClick }: CalendarViewProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const days = useMemo(
    () => getMonthDays(currentYear, currentMonth),
    [currentYear, currentMonth]
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const d = new Date(event.date);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const arr = map.get(key) ?? [];
      arr.push(event);
      map.set(key, arr);
    }
    return map;
  }, [events]);

  function prevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  }

  function nextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  }

  function goToToday() {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-[16px] font-semibold" style={{ color: "var(--nl-text-primary)" }}>
            {MONTHS_ES[currentMonth]} {currentYear}
          </h2>
          <button
            onClick={goToToday}
            className="text-[11px] px-2 py-1 rounded border transition-colors"
            style={{
              color: "var(--nl-text-muted)",
              borderColor: "var(--nl-border-subtle)",
            }}
          >
            Hoy
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded hover:bg-[var(--nl-bg-elevated)] transition-colors"
            style={{ color: "var(--nl-text-muted)" }}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded hover:bg-[var(--nl-bg-elevated)] transition-colors"
            style={{ color: "var(--nl-text-muted)" }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS_ES.map((day) => (
          <div
            key={day}
            className="text-center text-[10px] uppercase tracking-wider py-2 font-medium"
            style={{ color: "var(--nl-text-faint)" }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div
        className="grid grid-cols-7 border-t border-l rounded-lg overflow-hidden"
        style={{ borderColor: "var(--nl-border)" }}
      >
        {days.map((day, idx) => {
          const key = `${day.date.getFullYear()}-${day.date.getMonth()}-${day.date.getDate()}`;
          const dayEvents = eventsByDate.get(key) ?? [];
          const isToday = isSameDay(day.date, today);

          return (
            <div
              key={idx}
              className="min-h-[80px] border-r border-b p-1 relative"
              style={{
                borderColor: "var(--nl-border)",
                backgroundColor: day.isCurrentMonth
                  ? "var(--nl-bg-primary)"
                  : "var(--nl-bg-root)",
              }}
            >
              {/* Day number */}
              <div className="flex justify-end mb-0.5">
                <span
                  className="text-[11px] w-5 h-5 flex items-center justify-center rounded-full"
                  style={{
                    color: !day.isCurrentMonth
                      ? "var(--nl-text-faint)"
                      : isToday
                      ? "black"
                      : "var(--nl-text-secondary)",
                    backgroundColor: isToday ? "var(--nl-accent)" : "transparent",
                    fontWeight: isToday ? 600 : 400,
                  }}
                >
                  {day.date.getDate()}
                </span>
              </div>

              {/* Events */}
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((event) => {
                  const color = event.color ?? EVENT_COLORS[event.type] ?? "var(--nl-accent)";
                  return (
                    <button
                      key={event.id}
                      onClick={() => onEventClick?.(event)}
                      className="w-full text-left text-[9px] px-1 py-0.5 rounded truncate transition-opacity hover:opacity-80"
                      style={{
                        backgroundColor: color + "20",
                        color,
                      }}
                      title={event.title}
                    >
                      {event.title}
                    </button>
                  );
                })}
                {dayEvents.length > 3 && (
                  <span className="text-[9px] px-1" style={{ color: "var(--nl-text-faint)" }}>
                    +{dayEvents.length - 3} mas
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3">
        {Object.entries(EVENT_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[10px] capitalize" style={{ color: "var(--nl-text-muted)" }}>
              {type === "deal" ? "Deals creados" : type === "activity" ? "Actividades" : "Deals cerrados"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
