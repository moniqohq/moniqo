/*
 * Moniqo is a personal finance management application designed to help users
 * track, manage, and optimize their financial activities.
 *
 * Copyright (C) 2026 Moniqo <support@moniqo.in>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
"use client";

import { useState, useRef, useEffect } from "react";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── helpers ──────────────────────────────────────────────── */
const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatLabel(from: Date | null, to: Date | null): string {
  if (!from) return "Select dates";
  const fmt = (d: Date) => `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
  return to ? `${fmt(from)} — ${fmt(to)}` : fmt(from);
}

/* ── single month grid ────────────────────────────────────── */
interface MonthProps {
  year: number;
  month: number;
  from: Date | null;
  to: Date | null;
  hovered: Date | null;
  onSelect: (d: Date) => void;
  onHover: (d: Date | null) => void;
}

function MonthGrid({ year, month, from, to, hovered, onSelect, onHover }: MonthProps) {
  const total = daysInMonth(year, month);
  const offset = firstDayOfMonth(year, month);
  const rangeEnd = to ?? hovered;

  return (
    <div className="w-[220px]">
      <p className="mb-3 text-center text-sm font-semibold text-[#E8EEF8]">
        {MONTHS[month]} {year}
      </p>
      {/* day-of-week headers */}
      <div className="mb-1 grid grid-cols-7">
        {DAYS.map((d) => (
          <span key={d} className="py-1 text-center text-[10px] font-medium text-[#3A4A60]">
            {d}
          </span>
        ))}
      </div>
      {/* day cells */}
      <div className="grid grid-cols-7">
        {Array.from({ length: offset }).map((_, i) => (
          <span key={`e-${i}`} />
        ))}
        {Array.from({ length: total }).map((_, i) => {
          const day = new Date(year, month, i + 1);
          const isFrom = !!from && isSameDay(day, from);
          const isTo = !!to && isSameDay(day, to);
          const isHovered = !!hovered && !to && isSameDay(day, hovered);
          const inRange =
            !!from &&
            !!rangeEnd &&
            day > (from < rangeEnd ? from : rangeEnd) &&
            day < (from < rangeEnd ? rangeEnd : from);
          const isEdge = isFrom || isTo;

          return (
            <button
              key={i}
              onClick={() => onSelect(day)}
              onMouseEnter={() => onHover(day)}
              onMouseLeave={() => onHover(null)}
              className={cn(
                "relative h-8 rounded-lg text-xs transition-colors focus:outline-none focus:ring-1 focus:ring-[#6C3AED]/50",
                isEdge && "z-10 bg-[#6C3AED] font-semibold text-white",
                isHovered && !isEdge && "bg-[#6C3AED]/30 text-white",
                inRange && !isEdge && "rounded-none bg-[#6C3AED]/15 text-[#A8B4CC]",
                !isEdge &&
                  !inRange &&
                  !isHovered &&
                  "text-[#5A6A85] hover:bg-[#1A2640] hover:text-white",
                isFrom && rangeEnd && from! < rangeEnd && "rounded-r-none",
                isFrom && rangeEnd && from! > rangeEnd && "rounded-l-none",
                isTo && "rounded-l-none",
              )}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── main component ───────────────────────────────────────── */
export interface DateRange {
  from: Date | null;
  to: Date | null;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  triggerClassName?: string;
}

export function DateRangePicker({ value, onChange, triggerClassName }: DateRangePickerProps) {
  const today = new Date();
  const defaultRange: DateRange = {
    from: new Date(today.getFullYear(), today.getMonth(), 1),
    to: new Date(today.getFullYear(), today.getMonth() + 1, 0),
  };
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<Date | null>(null);
  const [leftYear, setLeftYear] = useState(today.getFullYear());
  const [leftMonth, setLeftMonth] = useState(today.getMonth());
  const ref = useRef<HTMLDivElement>(null);

  // right panel = left + 1
  const rightMonth = leftMonth === 11 ? 0 : leftMonth + 1;
  const rightYear = leftMonth === 11 ? leftYear + 1 : leftYear;

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  function prevMonth() {
    if (leftMonth === 0) {
      setLeftMonth(11);
      setLeftYear((y) => y - 1);
    } else setLeftMonth((m) => m - 1);
  }

  function nextMonth() {
    if (leftMonth === 11) {
      setLeftMonth(0);
      setLeftYear((y) => y + 1);
    } else setLeftMonth((m) => m + 1);
  }

  function handleSelect(day: Date) {
    const { from, to } = value;
    if (!from || (from && to)) {
      onChange({ from: day, to: null });
    } else {
      if (isSameDay(day, from)) {
        onChange(defaultRange);
      } else if (day < from) {
        onChange({ from: day, to: from });
      } else {
        onChange({ from, to: day });
      }
    }
  }

  function clearRange(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(defaultRange);
  }

  const hasRange = value.from || value.to;

  return (
    <div ref={ref} className="relative">
      {/* trigger */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex items-center gap-1.5 whitespace-nowrap text-sm transition-all",
          triggerClassName,
          open && "border-[#6C3AED]/60 text-[#A8B4CC]",
        )}
      >
        <Calendar size={12} />
        <span>{formatLabel(value.from, value.to)}</span>
        {hasRange ? (
          <X
            size={10}
            onClick={clearRange}
            className="ml-0.5 transition-colors hover:text-red-400"
          />
        ) : (
          <ChevronDown size={11} />
        )}
      </button>

      {/* popover */}
      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 rounded-xl border border-[#1A2640] bg-[#0D1B2E] p-4 shadow-2xl">
          {/* nav header */}
          <div className="mb-3 flex items-center justify-between">
            <button
              onClick={prevMonth}
              className="rounded-lg p-1.5 text-[#5A6A85] transition-colors hover:bg-[#1A2640] hover:text-white focus:outline-none"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={nextMonth}
              className="rounded-lg p-1.5 text-[#5A6A85] transition-colors hover:bg-[#1A2640] hover:text-white focus:outline-none"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* two-month grid */}
          <div className="flex gap-6">
            <MonthGrid
              year={leftYear}
              month={leftMonth}
              from={value.from}
              to={value.to}
              hovered={hovered}
              onSelect={handleSelect}
              onHover={setHovered}
            />
            <div className="w-px self-stretch bg-[#131E30]" />
            <MonthGrid
              year={rightYear}
              month={rightMonth}
              from={value.from}
              to={value.to}
              hovered={hovered}
              onSelect={handleSelect}
              onHover={setHovered}
            />
          </div>

          {/* footer */}
          <div className="mt-4 flex items-center justify-between border-t border-[#131E30] pt-3">
            <span className="text-xs text-[#3A4A60]">
              {!value.from
                ? "Select start date"
                : !value.to
                  ? "Select end date"
                  : formatLabel(value.from, value.to)}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => onChange(defaultRange)}
                className="rounded-lg border border-[#1A2640] px-3 py-1.5 text-xs text-[#5A6A85] transition-colors hover:bg-[#131C2E] hover:text-white"
              >
                Reset
              </button>
              <button
                onClick={() => setOpen(false)}
                disabled={!value.from || !value.to}
                className="rounded-lg bg-[#6C3AED] px-3 py-1.5 text-xs text-white transition-colors hover:bg-[#7C4AFF] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
