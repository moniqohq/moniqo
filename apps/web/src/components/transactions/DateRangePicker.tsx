'use client'

import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ── helpers ──────────────────────────────────────────────── */
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function firstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function formatLabel(from: Date | null, to: Date | null): string {
  if (!from) return 'Select dates'
  const fmt = (d: Date) => `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`
  return to ? `${fmt(from)} — ${fmt(to)}` : fmt(from)
}

/* ── single month grid ────────────────────────────────────── */
interface MonthProps {
  year: number
  month: number
  from: Date | null
  to: Date | null
  hovered: Date | null
  onSelect: (d: Date) => void
  onHover: (d: Date | null) => void
}

function MonthGrid({ year, month, from, to, hovered, onSelect, onHover }: MonthProps) {
  const total = daysInMonth(year, month)
  const offset = firstDayOfMonth(year, month)
  const rangeEnd = to ?? hovered

  return (
    <div className="w-[220px]">
      <p className="text-center text-sm font-semibold text-[#E8EEF8] mb-3">
        {MONTHS[month]} {year}
      </p>
      {/* day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => (
          <span key={d} className="text-center text-[10px] font-medium text-[#3A4A60] py-1">
            {d}
          </span>
        ))}
      </div>
      {/* day cells */}
      <div className="grid grid-cols-7">
        {Array.from({ length: offset }).map((_, i) => <span key={`e-${i}`} />)}
        {Array.from({ length: total }).map((_, i) => {
          const day = new Date(year, month, i + 1)
          const isFrom = !!from && isSameDay(day, from)
          const isTo = !!to && isSameDay(day, to)
          const isHovered = !!hovered && !to && isSameDay(day, hovered)
          const inRange = !!from && !!rangeEnd &&
            day > (from < rangeEnd ? from : rangeEnd) &&
            day < (from < rangeEnd ? rangeEnd : from)
          const isEdge = isFrom || isTo

          return (
            <button
              key={i}
              onClick={() => onSelect(day)}
              onMouseEnter={() => onHover(day)}
              onMouseLeave={() => onHover(null)}
              className={cn(
                'relative h-8 text-xs transition-colors focus:outline-none focus:ring-1 focus:ring-[#6C3AED]/50 rounded-lg',
                isEdge && 'bg-[#6C3AED] text-white font-semibold z-10',
                isHovered && !isEdge && 'bg-[#6C3AED]/30 text-white',
                inRange && !isEdge && 'bg-[#6C3AED]/15 text-[#A8B4CC] rounded-none',
                !isEdge && !inRange && !isHovered && 'text-[#5A6A85] hover:bg-[#1A2640] hover:text-white',
                isFrom && rangeEnd && from! < rangeEnd && 'rounded-r-none',
                isFrom && rangeEnd && from! > rangeEnd && 'rounded-l-none',
                isTo && 'rounded-l-none',
              )}
            >
              {i + 1}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ── main component ───────────────────────────────────────── */
export interface DateRange {
  from: Date | null
  to: Date | null
}

interface DateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
  triggerClassName?: string
}

export function DateRangePicker({ value, onChange, triggerClassName }: DateRangePickerProps) {
  const today = new Date()
  const defaultRange: DateRange = {
    from: new Date(today.getFullYear(), today.getMonth(), 1),
    to:   new Date(today.getFullYear(), today.getMonth() + 1, 0),
  }
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState<Date | null>(null)
  const [leftYear, setLeftYear] = useState(today.getFullYear())
  const [leftMonth, setLeftMonth] = useState(today.getMonth())
  const ref = useRef<HTMLDivElement>(null)

  // right panel = left + 1
  const rightMonth = leftMonth === 11 ? 0 : leftMonth + 1
  const rightYear = leftMonth === 11 ? leftYear + 1 : leftYear

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  function prevMonth() {
    if (leftMonth === 0) { setLeftMonth(11); setLeftYear(y => y - 1) }
    else setLeftMonth(m => m - 1)
  }

  function nextMonth() {
    if (leftMonth === 11) { setLeftMonth(0); setLeftYear(y => y + 1) }
    else setLeftMonth(m => m + 1)
  }

  function handleSelect(day: Date) {
    const { from, to } = value
    if (!from || (from && to)) {
      onChange({ from: day, to: null })
    } else {
      if (isSameDay(day, from)) {
        onChange(defaultRange)
      } else if (day < from) {
        onChange({ from: day, to: from })
      } else {
        onChange({ from, to: day })
      }
    }
  }

  function clearRange(e: React.MouseEvent) {
    e.stopPropagation()
    onChange(defaultRange)
  }

  const hasRange = value.from || value.to

  return (
    <div ref={ref} className="relative">
      {/* trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'inline-flex items-center gap-1.5 text-sm transition-all whitespace-nowrap',
          triggerClassName,
          open && 'border-[#6C3AED]/60 text-[#A8B4CC]',
        )}
      >
        <Calendar size={12} />
        <span>{formatLabel(value.from, value.to)}</span>
        {hasRange
          ? <X size={10} onClick={clearRange} className="ml-0.5 hover:text-red-400 transition-colors" />
          : <ChevronDown size={11} />
        }
      </button>

      {/* popover */}
      {open && (
        <div className="absolute top-full left-0 mt-2 z-30 rounded-xl border border-[#1A2640] bg-[#0D1B2E] shadow-2xl p-4">
          {/* nav header */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg text-[#5A6A85] hover:bg-[#1A2640] hover:text-white transition-colors focus:outline-none"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg text-[#5A6A85] hover:bg-[#1A2640] hover:text-white transition-colors focus:outline-none"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* two-month grid */}
          <div className="flex gap-6">
            <MonthGrid
              year={leftYear} month={leftMonth}
              from={value.from} to={value.to}
              hovered={hovered}
              onSelect={handleSelect}
              onHover={setHovered}
            />
            <div className="w-px bg-[#131E30] self-stretch" />
            <MonthGrid
              year={rightYear} month={rightMonth}
              from={value.from} to={value.to}
              hovered={hovered}
              onSelect={handleSelect}
              onHover={setHovered}
            />
          </div>

          {/* footer */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#131E30]">
            <span className="text-xs text-[#3A4A60]">
              {!value.from ? 'Select start date' : !value.to ? 'Select end date' : formatLabel(value.from, value.to)}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => onChange(defaultRange)}
                className="px-3 py-1.5 text-xs rounded-lg border border-[#1A2640] text-[#5A6A85] hover:bg-[#131C2E] hover:text-white transition-colors"
              >
                Reset
              </button>
              <button
                onClick={() => setOpen(false)}
                disabled={!value.from || !value.to}
                className="px-3 py-1.5 text-xs rounded-lg bg-[#6C3AED] text-white hover:bg-[#7C4AFF] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
