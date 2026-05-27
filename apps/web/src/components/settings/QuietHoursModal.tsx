'use client'

import { useState } from 'react'
import { Moon, Clock, Globe2, X, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent } from '@/components/ui/dialog'

// ── Toggle ─────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
        'transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-[#6C3AED] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D1520]',
        checked ? 'bg-[#6C3AED]' : 'bg-[#1E2B42]',
      )}
    >
      <span className={cn(
        'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-md transition-transform duration-200',
        checked ? 'translate-x-4' : 'translate-x-0',
      )} />
    </button>
  )
}

// ── Time options ────────────────────────────────────────────────────

function buildTimeOptions() {
  const options: string[] = []
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      const period = h < 12 ? 'AM' : 'PM'
      const hour = h === 0 ? 12 : h > 12 ? h - 12 : h
      const min = m === 0 ? '00' : '30'
      options.push(`${hour}:${min} ${period}`)
    }
  }
  return options
}

const TIME_OPTIONS = buildTimeOptions()

const TIMEZONE_OPTIONS = [
  '(GMT-12:00) International Date Line West',
  '(GMT-08:00) Pacific Time (US & Canada)',
  '(GMT-07:00) Mountain Time (US & Canada)',
  '(GMT-06:00) Central Time (US & Canada)',
  '(GMT-05:00) Eastern Time (US & Canada)',
  '(GMT+00:00) UTC',
  '(GMT+01:00) Central European Time',
  '(GMT+02:00) Eastern European Time',
  '(GMT+03:00) Moscow Time',
  '(GMT+05:30) Asia/Kolkata',
  '(GMT+08:00) China Standard Time',
  '(GMT+09:00) Japan Standard Time',
  '(GMT+10:00) Australian Eastern Time',
  '(GMT+12:00) New Zealand Standard Time',
]

// ── SelectField ────────────────────────────────────────────────────

function SelectField({
  icon: Icon,
  label,
  value,
  options,
  onChange,
  wide,
}: {
  icon: React.ElementType
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
  wide?: boolean
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', wide ? 'flex-1' : '')}>
      <div className="flex items-center gap-1.5">
        <Icon size={12} className="text-[#5A6A85]" />
        <span className="text-[11px] font-medium text-[#5A6A85] uppercase tracking-wider">{label}</span>
      </div>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className={cn(
            'w-full appearance-none px-3.5 py-2.5 pr-8 rounded-xl text-[13px] font-medium',
            'bg-[#0F1623] border border-[#1E2B42] text-[#A8B4CC]',
            'hover:border-[#2A3A54] focus:border-[rgba(108,58,237,0.5)] focus:outline-none',
            'transition-colors cursor-pointer',
          )}
        >
          {options.map(opt => (
            <option key={opt} value={opt} className="bg-[#0D1520]">{opt}</option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#5A6A85]">
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
            <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </div>
    </div>
  )
}

// ── QuietHoursModal ─────────────────────────────────────────────────

export function QuietHoursModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [enabled, setEnabled]     = useState(true)
  const [startTime, setStartTime] = useState('10:00 PM')
  const [endTime, setEndTime]     = useState('7:00 AM')
  const [timezone, setTimezone]   = useState('(GMT+05:30) Asia/Kolkata')

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-[calc(100%-2rem)] sm:max-w-[600px] min-w-0 p-0 bg-[#0D1520] border-[#1E2B42] overflow-hidden gap-0 rounded-xl"
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-center gap-4 px-5 py-4 border-b border-[#1E2B42]">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[rgba(108,58,237,0.12)]">
            <Moon size={18} className="text-[#A78BFA]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[16px] font-semibold text-white leading-tight">Quiet Hours</p>
            <p className="text-[12px] text-[#5A6A85] mt-0.5">Pause non-urgent notifications during these times.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[12px] text-[#5A6A85]">Enable quiet hours</span>
            <Toggle checked={enabled} onChange={setEnabled} />
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#5A6A85] hover:text-[#A8B4CC] hover:bg-[#1E2B42] transition-all ml-1"
          >
            <X size={15} />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────────── */}
        <div className={cn('p-5 flex flex-col gap-5', !enabled && 'opacity-40 pointer-events-none')}>

          {/* Time + timezone row */}
          <div className="flex items-end gap-4">
            <SelectField
              icon={Clock}
              label="Start time"
              value={startTime}
              options={TIME_OPTIONS}
              onChange={setStartTime}
            />
            <SelectField
              icon={Clock}
              label="End time"
              value={endTime}
              options={TIME_OPTIONS}
              onChange={setEndTime}
            />
            <SelectField
              icon={Globe2}
              label="Time zone"
              value={timezone}
              options={TIMEZONE_OPTIONS}
              onChange={setTimezone}
              wide
            />
          </div>

          {/* Info note */}
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-[rgba(108,58,237,0.07)] border border-[rgba(108,58,237,0.15)]">
            <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-[rgba(108,58,237,0.15)] mt-0.5">
              <Info size={11} className="text-[#A78BFA]" />
            </div>
            <p className="text-[12px] text-[#A8B4CC] leading-relaxed">
              During quiet hours, only critical alerts like security notifications will be delivered.
            </p>
          </div>

        </div>

        {/* ── Bottom bar ─────────────────────────────────────── */}
        <div className="flex items-center gap-2.5 px-5 py-3 border-t border-[#1E2B42]">
          <div className="w-6 h-6 rounded-full flex items-center justify-center bg-[#131C2E] border border-[#1E2B42]">
            <Info size={11} className="text-[#5A6A85]" />
          </div>
          <p className="text-[12px] text-[#A8B4CC] leading-tight">Changes are saved automatically.</p>
        </div>

      </DialogContent>
    </Dialog>
  )
}
