'use client'

import { useState, useEffect, useId, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Search, Calendar, ChevronDown, Sparkles, TrendingUp,
  RefreshCw, Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type GoalPriority = 'low' | 'medium' | 'high' | 'critical'
type GoalColor = 'purple' | 'blue' | 'cyan' | 'green' | 'yellow' | 'orange' | 'pink'

interface GoalIcon {
  id: string
  emoji: string
  label: string
}

interface Envelope {
  id: string
  name: string
  color: string
  suggested?: boolean
}

export interface CreateGoalDialogProps {
  open: boolean
  onClose: () => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GOAL_ICONS: GoalIcon[] = [
  { id: 'travel',     emoji: '✈️', label: 'Travel'     },
  { id: 'vehicle',    emoji: '🚗', label: 'Vehicle'    },
  { id: 'home',       emoji: '🏠', label: 'Home'       },
  { id: 'education',  emoji: '🎓', label: 'Education'  },
  { id: 'technology', emoji: '💻', label: 'Technology' },
  { id: 'wedding',    emoji: '💍', label: 'Wedding'    },
  { id: 'vacation',   emoji: '🧳', label: 'Vacation'   },
  { id: 'savings',    emoji: '💰', label: 'Savings'    },
  { id: 'custom',     emoji: '🎯', label: 'Custom'     },
]

const GOAL_COLORS: { id: GoalColor; hex: string; label: string }[] = [
  { id: 'purple', hex: '#7C3AED', label: 'Purple' },
  { id: 'blue',   hex: '#3B82F6', label: 'Blue'   },
  { id: 'cyan',   hex: '#06B6D4', label: 'Cyan'   },
  { id: 'green',  hex: '#22C55E', label: 'Green'  },
  { id: 'yellow', hex: '#EAB308', label: 'Yellow' },
  { id: 'orange', hex: '#F97316', label: 'Orange' },
  { id: 'pink',   hex: '#EC4899', label: 'Pink'   },
]

const MOCK_ENVELOPES: Envelope[] = [
  { id: 'e1', name: 'Travel',         color: '#7C3AED', suggested: true },
  { id: 'e2', name: 'Emergency Fund', color: '#22C55E' },
  { id: 'e3', name: 'New Laptop',     color: '#3B82F6' },
  { id: 'e4', name: 'Custom Envelope', color: '#5A6A85' },
]

const PRIORITY_OPTIONS: { id: GoalPriority; label: string }[] = [
  { id: 'low',      label: 'Low'      },
  { id: 'medium',   label: 'Medium'   },
  { id: 'high',     label: 'High'     },
  { id: 'critical', label: 'Critical' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('en-IN')
}

function monthsBetween(start: Date, end: Date): number {
  const y = end.getFullYear() - start.getFullYear()
  const m = end.getMonth() - start.getMonth()
  return Math.max(1, y * 12 + m)
}

function todayStr() {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

function formatDisplayDate(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function computeStatus(pct: number, targetDate: string): 'on_track' | 'behind' | 'completed' {
  if (pct >= 100) return 'completed'
  if (!targetDate) return 'on_track'
  const months = monthsBetween(new Date(), new Date(targetDate + 'T00:00:00'))
  return months > 0 ? 'on_track' : 'behind'
}

// ─── SectionCard ──────────────────────────────────────────────────────────────

function SectionCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn('rounded-2xl border border-[#1E2B42] bg-[#0F1623] p-5 space-y-4', className)}
    >
      {children}
    </div>
  )
}

function SectionTitle({ num, title }: { num: number; title: string }) {
  return (
    <div className="flex items-center gap-2.5 pb-0.5">
      <div className="w-6 h-6 rounded-lg bg-[#6C3AED] flex items-center justify-center flex-shrink-0">
        <span className="text-white text-[11px] font-bold">×</span>
      </div>
      <h3 className="text-[15px] font-semibold text-white">{num}. {title}</h3>
    </div>
  )
}

// ─── GoalProgressRing ─────────────────────────────────────────────────────────

function GoalProgressRing({ pct, size = 140, color }: { pct: number; size?: number; color: string }) {
  const uid = useId().replace(/:/g, '')
  const stroke = 12
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - Math.min(pct, 100) / 100)
  const cx = size / 2

  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <defs>
          <linearGradient id={`cgRingGrad-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>
          <filter id={`cgRingGlow-${uid}`}>
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Track */}
        <circle
          cx={cx} cy={cx} r={r}
          fill="none" stroke="#1A1A35" strokeWidth={stroke}
          transform={`rotate(-90, ${cx}, ${cx})`}
        />
        {/* Progress arc */}
        {pct > 0 && (
          <circle
            cx={cx} cy={cx} r={r}
            fill="none"
            stroke={`url(#cgRingGrad-${uid})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            transform={`rotate(-90, ${cx}, ${cx})`}
            filter={`url(#cgRingGlow-${uid})`}
            style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1)' }}
          />
        )}
      </svg>
      {/* Centre content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-[28px] font-bold text-white leading-none">{Math.min(pct, 100)}%</span>
        <span className="text-[11px] text-[#7A8BA8] mt-1">complete</span>
      </div>
    </div>
  )
}

// ─── EnvelopeSelector ────────────────────────────────────────────────────────

function EnvelopeSelector({ value, onChange, error }: {
  value: string; onChange: (id: string) => void; error?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const filtered = MOCK_ENVELOPES.filter(e =>
    e.name.toLowerCase().includes(query.toLowerCase())
  )

  const selected = MOCK_ENVELOPES.find(e => e.id === value)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn(
          'w-full flex items-center gap-2 h-11 px-3 rounded-xl border bg-[#0D1525] text-sm text-left transition-all focus:outline-none',
          error
            ? 'border-[#F87171]/60 ring-2 ring-[#F87171]/20'
            : open
              ? 'border-[#6C3AED] ring-2 ring-[#6C3AED]/30'
              : 'border-[#1E2B42] hover:border-[#3A4A62]',
        )}
      >
        {selected ? (
          <>
            <span className="w-5 h-5 rounded-md flex-shrink-0" style={{ backgroundColor: `${selected.color}30`, border: `1px solid ${selected.color}60` }} />
            <span className="flex-1 text-white truncate">{selected.name}</span>
          </>
        ) : (
          <span className="flex-1 text-[#3A4A62]">Search or select envelope</span>
        )}
        <Search size={14} className="text-[#3A4A62] flex-shrink-0" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-20 top-full mt-1.5 w-full rounded-xl border border-[#1E2B42] bg-[#0D1525] shadow-2xl overflow-hidden"
          >
            <div className="p-2 border-b border-[#1A2438]">
              <div className="flex items-center gap-2 px-2 py-1.5 bg-[#080C14] rounded-lg border border-[#1E2B42]">
                <Search size={13} className="text-[#3A4A62]" />
                <input
                  autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search envelopes…"
                  className="flex-1 bg-transparent text-[13px] text-white placeholder:text-[#3A4A62] focus:outline-none"
                />
              </div>
            </div>
            <div className="py-1 max-h-48 overflow-y-auto">
              {filtered.map(env => (
                <button
                  key={env.id}
                  type="button"
                  onClick={() => { onChange(env.id); setOpen(false); setQuery('') }}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-[#111B2D] transition-colors',
                    value === env.id && 'bg-[#111B2D]',
                  )}
                >
                  <span
                    className="w-7 h-7 rounded-lg flex-shrink-0"
                    style={{ backgroundColor: `${env.color}20`, border: `1px solid ${env.color}40` }}
                  />
                  <span className="flex-1 text-[#C8D4E4] text-left">{env.name}</span>
                  {env.suggested && (
                    <span className="text-[11px] text-[#6C3AED] font-medium px-2 py-0.5 bg-[#6C3AED]/10 rounded-full border border-[#6C3AED]/20">
                      Suggested
                    </span>
                  )}
                  {value === env.id && <Check size={13} className="text-[#6C3AED]" />}
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-[13px] text-[#3A4A62] px-3 py-4 text-center">No envelopes found</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── DateInput ────────────────────────────────────────────────────────────────

function DateInput({ value, onChange, placeholder, error }: {
  value: string; onChange: (v: string) => void; placeholder?: string; error?: boolean
}) {
  return (
    <div className="relative">
      <input
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full h-11 pl-3 pr-10 rounded-xl border bg-[#0D1525] text-sm text-white focus:outline-none transition-all appearance-none',
          '[color-scheme:dark]',
          error
            ? 'border-[#F87171]/60 ring-2 ring-[#F87171]/20'
            : 'border-[#1E2B42] hover:border-[#3A4A62] focus:border-[#6C3AED] focus:ring-2 focus:ring-[#6C3AED]/30',
        )}
      />
      <Calendar size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3A4A62] pointer-events-none" />
    </div>
  )
}

// ─── CurrencyInput ────────────────────────────────────────────────────────────

function CurrencyInput({ value, onChange, placeholder, large, error }: {
  value: string; onChange: (v: string) => void; placeholder?: string
  large?: boolean; error?: boolean
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d]/g, '')
    onChange(raw)
  }

  const displayValue = value ? parseInt(value, 10).toLocaleString('en-IN') : ''

  return (
    <div className={cn(
      'relative flex items-center rounded-xl border bg-[#0D1525] transition-all',
      error
        ? 'border-[#F87171]/60 ring-2 ring-[#F87171]/20'
        : 'border-[#1E2B42] hover:border-[#3A4A62] focus-within:border-[#6C3AED] focus-within:ring-2 focus-within:ring-[#6C3AED]/30',
    )}>
      <span className={cn(
        'pl-4 text-[#6C3AED] font-bold flex-shrink-0',
        large ? 'text-[22px]' : 'text-lg',
      )}>₹</span>
      <input
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder ?? '0'}
        className={cn(
          'flex-1 bg-transparent pr-4 text-white font-semibold placeholder:text-[#2A3A54] focus:outline-none',
          large ? 'py-3.5 text-[22px] pl-2' : 'py-2.5 text-base pl-2',
        )}
      />
    </div>
  )
}

// ─── HeroIllustration ─────────────────────────────────────────────────────────

function HeroIllustration() {
  return (
    <div className="relative flex items-center justify-center h-[130px] pointer-events-none select-none">
      {/* Glow orb */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-28 h-28 rounded-full opacity-30" style={{
          background: 'radial-gradient(circle, #6C3AED 0%, transparent 70%)',
        }} />
      </div>

      {/* Sparkle dots */}
      <div className="absolute top-3 left-[42%] w-1.5 h-1.5 rounded-full bg-white/60" />
      <div className="absolute top-6 right-[28%] w-1 h-1 rounded-full bg-purple-400/80" />
      <div className="absolute bottom-4 left-[30%] w-1 h-1 rounded-full bg-purple-300/60" />
      <div className="absolute top-10 left-[20%] w-2 h-2 rounded-full bg-white/20" />

      {/* Clouds */}
      <div className="absolute bottom-3 left-6 flex gap-1.5 opacity-40">
        <div className="w-10 h-5 rounded-full bg-[#1A2438]" />
        <div className="w-7 h-4 rounded-full bg-[#1E2B42] mt-1" />
      </div>
      <div className="absolute bottom-2 right-5 flex gap-1.5 opacity-30">
        <div className="w-8 h-4 rounded-full bg-[#1A2438]" />
        <div className="w-5 h-3 rounded-full bg-[#1E2B42] mt-0.5" />
      </div>

      {/* Target / Bullseye */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="relative">
          {/* Outer ring */}
          <div className="w-20 h-20 rounded-full border-4 border-[#6C3AED]/50 flex items-center justify-center" style={{
            background: 'radial-gradient(circle, #1E1040 0%, #120A28 100%)',
            boxShadow: '0 0 30px rgba(108,58,237,0.4)',
          }}>
            {/* Mid ring */}
            <div className="w-12 h-12 rounded-full border-4 border-[#8B5CF6]/60 flex items-center justify-center"
              style={{ background: 'rgba(108,58,237,0.2)' }}>
              {/* Inner */}
              <div className="w-5 h-5 rounded-full bg-[#EC4899] shadow-[0_0_12px_rgba(236,72,153,0.7)]" />
            </div>
          </div>
          {/* Arrow */}
          <div
            className="absolute -top-2 -right-1 w-1 h-10 rounded-full origin-bottom"
            style={{
              background: 'linear-gradient(to bottom, #F97316, #A855F7)',
              transform: 'rotate(35deg)',
              boxShadow: '0 0 8px rgba(249,115,22,0.6)',
            }}
          />
        </div>

        {/* Coins stack */}
        <div className="absolute -bottom-1 -right-7 flex flex-col items-center gap-[2px]">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-full border border-[#F59E0B]/40" style={{
              width: 18 - i * 1,
              height: 5,
              background: `linear-gradient(90deg, #D97706 0%, #FBBF24 50%, #D97706 100%)`,
              opacity: 1 - i * 0.15,
            }} />
          ))}
        </div>

        {/* Plant / Sprout */}
        <div className="absolute -bottom-1 -left-6 opacity-70">
          <div className="w-1 h-6 bg-[#22C55E] rounded-full mx-auto" />
          <div className="w-4 h-3 bg-[#16A34A] rounded-full -mt-2 -ml-1.5 rotate-[-20deg]" />
          <div className="w-4 h-3 bg-[#22C55E] rounded-full -mt-2 ml-1 rotate-[20deg]" />
        </div>
      </div>
    </div>
  )
}

// ─── SmartInsightsCard ────────────────────────────────────────────────────────

function SmartInsightsCard({ insights }: { insights: { icon: 'trending' | 'cycle'; body: string }[] }) {
  return (
    <div className="rounded-2xl border border-[#1E2B42] bg-[#0F1623] p-4">
      <div className="flex items-center gap-2 mb-3.5">
        <Sparkles size={15} className="text-[#A855F7]" />
        <h4 className="text-[13px] font-semibold text-white">Smart Insights</h4>
      </div>
      <div className="space-y-3">
        {insights.map((ins, i) => (
          <div key={i} className="flex gap-3 items-start">
            <div className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
              ins.icon === 'trending' ? 'bg-[rgba(34,197,94,0.12)]' : 'bg-[rgba(108,58,237,0.12)]',
            )}>
              {ins.icon === 'trending'
                ? <TrendingUp size={14} className="text-[#22C55E]" />
                : <RefreshCw size={14} className="text-[#8B5CF6]" />
              }
            </div>
            <p className="text-[12.5px] text-[#A8B4CC] leading-relaxed">{ins.body}</p>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-[#3A4A62] mt-3 pt-3 border-t border-[#1A2438]">
        Insights update as you save and spend.
      </p>
    </div>
  )
}

// ─── SuggestedSavingCard ──────────────────────────────────────────────────────

function SuggestedSavingCard({ amount }: { amount: number }) {
  return (
    <div
      className="relative rounded-xl overflow-hidden p-4"
      style={{
        background: 'linear-gradient(135deg, #1E0A3C 0%, #2D1060 40%, #1A0A30 100%)',
        border: '1px solid rgba(108,58,237,0.3)',
      }}
    >
      {/* Sparkle glows */}
      <div className="absolute top-3 right-10 w-2 h-2 rounded-full bg-white/20" />
      <div className="absolute bottom-4 right-6 w-3 h-3 rounded-full bg-purple-400/30" />
      <div className="absolute top-5 right-4 w-1.5 h-1.5 rounded-full bg-white/30" />

      <div className="flex gap-3 items-start">
        <div className="w-10 h-10 rounded-xl bg-[rgba(108,58,237,0.2)] border border-[#6C3AED]/30 flex items-center justify-center flex-shrink-0">
          <TrendingUp size={18} className="text-[#A855F7]" />
        </div>
        <div>
          <p className="text-[10px] font-semibold text-[#9B7EDC] uppercase tracking-widest mb-0.5">
            Suggested Monthly Saving
          </p>
          <p className="text-[17px] font-bold text-white leading-tight">
            Save ₹{fmt(amount)}{' '}
            <span className="text-[13px] font-normal text-[#9B7EDC]">/ month to reach your target</span>
          </p>
          <p className="text-[11px] text-[#7A5BAA] mt-0.5">
            Based on your target date and current saved amount
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── GoalPreviewCard ──────────────────────────────────────────────────────────

function GoalPreviewCard({
  name, selectedIcon, colorHex, pct, targetAmount, savedAmount,
  targetDate, monthlySaving, status,
}: {
  name: string
  selectedIcon: GoalIcon
  colorHex: string
  pct: number
  targetAmount: number
  savedAmount: number
  targetDate: string
  monthlySaving: number
  status: 'on_track' | 'behind' | 'completed'
}) {
  const remaining = Math.max(0, targetAmount - savedAmount)

  const statusCfg = {
    on_track:  { label: 'On Track',  color: '#22C55E' },
    behind:    { label: 'Behind',    color: '#EF4444' },
    completed: { label: 'Completed', color: '#22C55E' },
  }[status]

  const estCompletion = targetDate ? 'On time' : '—'

  return (
    <div className="rounded-2xl border border-[#1E2B42] bg-[#0F1623] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#1A2438]">
        <h4 className="text-[13px] font-semibold text-white">Goal Preview</h4>
      </div>

      {/* Progress ring area */}
      <div className="relative flex justify-center pt-4 pb-2">
        {/* Sparkles */}
        <div className="absolute top-3 left-8 w-1.5 h-1.5 rounded-full bg-white/30" />
        <div className="absolute top-6 right-10 w-1 h-1 rounded-full bg-purple-400/50" />
        <div className="absolute bottom-2 left-12 w-1 h-1 rounded-full bg-white/20" />

        <div className="relative">
          <GoalProgressRing pct={pct} size={140} color={colorHex} />
          {/* Emoji badge */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ marginTop: -2 }}
          >
            <div
              className="absolute bottom-[18px] right-[10px] w-9 h-9 rounded-full flex items-center justify-center text-lg"
              style={{
                background: `${colorHex}22`,
                border: `2px solid ${colorHex}55`,
                boxShadow: `0 0 14px ${colorHex}40`,
              }}
            >
              {selectedIcon.emoji}
            </div>
          </div>
        </div>
      </div>

      {/* Goal name + status */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[15px] font-bold text-white truncate">
            {name || 'Your Goal'}
          </span>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusCfg.color }} />
            <span className="text-[12px] font-medium" style={{ color: statusCfg.color }}>
              {statusCfg.label}
            </span>
          </div>
        </div>
        <p className="text-[12.5px] text-[#5A6A85]">
          {targetAmount > 0
            ? `₹${fmt(savedAmount)} saved of ₹${fmt(targetAmount)}`
            : 'Set a target to preview progress'}
        </p>
      </div>

      {/* Metrics */}
      <div className="mx-4 mb-4 rounded-xl border border-[#1A2438] bg-[#080C14] divide-y divide-[#1A2438]">
        {[
          { label: 'Target Amount',       value: targetAmount > 0 ? `₹${fmt(targetAmount)}` : '—', color: 'text-[#E8EEF8]' },
          { label: 'Current Saved',        value: `₹${fmt(savedAmount)}`,                           color: 'text-[#E8EEF8]' },
          { label: 'Remaining',            value: targetAmount > 0 ? `₹${fmt(remaining)}` : '—',    color: 'text-[#E8EEF8]' },
          { label: 'Target Date',          value: targetDate ? formatDisplayDate(targetDate) : '—', color: 'text-[#E8EEF8]' },
          { label: 'Est. Monthly Saving',  value: monthlySaving > 0 ? `₹${fmt(monthlySaving)}` : '—', color: 'text-[#6C3AED]' },
          { label: 'Estimated Completion', value: estCompletion,                                    color: 'text-[#22C55E]' },
        ].map(row => (
          <div key={row.label} className="flex items-center justify-between px-3.5 py-2.5">
            <span className="text-[12px] text-[#5A6A85]">{row.label}</span>
            <span className={cn('text-[12px] font-semibold', row.color)}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── CreateGoalDialog ─────────────────────────────────────────────────────────

export function CreateGoalDialog({ open, onClose }: CreateGoalDialogProps) {
  // ── Section 1: Goal Information ──
  const [name,        setName]        = useState('')
  const [description, setDescription] = useState('')
  const [iconId,      setIconId]      = useState('travel')
  const [colorId,     setColorId]     = useState<GoalColor>('purple')

  // ── Section 2: Financial Target ──
  const [targetRaw,  setTargetRaw]  = useState('')
  const [savedRaw,   setSavedRaw]   = useState('0')
  const [envelopeId, setEnvelopeId] = useState('')

  // ── Section 3: Timeline ──
  const [startDate,  setStartDate]  = useState(todayStr)
  const [targetDate, setTargetDate] = useState('2026-12-31')
  const [priority,   setPriority]   = useState<GoalPriority>('high')

  // ── Validation ──
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)

  // ── Derived values ──
  const targetAmount  = parseInt(targetRaw  || '0', 10)
  const savedAmount   = parseInt(savedRaw   || '0', 10)
  const remaining     = Math.max(0, targetAmount - savedAmount)
  const pct           = targetAmount > 0 ? Math.min(Math.round((savedAmount / targetAmount) * 100), 100) : 0
  const months        = targetDate ? monthsBetween(new Date(startDate), new Date(targetDate + 'T00:00:00')) : 1
  const monthlySaving = targetAmount > 0 && targetDate ? Math.round(remaining / months) : 0
  const status        = computeStatus(pct, targetDate)

  const selectedIcon  = GOAL_ICONS.find(i => i.id === iconId) ?? GOAL_ICONS[0]
  const selectedColor = GOAL_COLORS.find(c => c.id === colorId) ?? GOAL_COLORS[0]

  // ── Smart Insights ──
  const insights = [
    monthlySaving > 0
      ? {
          icon: 'trending' as const,
          body: `You can reach this goal 2 months earlier by saving ₹${fmt(Math.round(monthlySaving * 0.2))} more monthly.`,
        }
      : {
          icon: 'trending' as const,
          body: 'Set a target amount and date to get personalized savings insights.',
        },
    {
      icon: 'cycle' as const,
      body: 'This goal is achievable based on your current budget velocity.',
    },
  ]

  // ── Side effects ──
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = '' }
  }, [open, onClose])

  const validate = useCallback(() => {
    const e: Record<string, string> = {}
    if (!name.trim())          e.name       = 'Goal name is required'
    if (targetAmount <= 0)     e.target     = 'Target amount must be greater than zero'
    if (savedAmount > targetAmount && targetAmount > 0)
                               e.saved      = 'Cannot exceed target amount'
    if (!envelopeId)           e.envelope   = 'Linked envelope is required'
    if (!startDate)            e.startDate  = 'Start date is required'
    if (targetDate && targetDate <= startDate)
                               e.targetDate = 'Target date must be after start date'
    return e
  }, [name, targetAmount, savedAmount, envelopeId, startDate, targetDate])

  const handleCreate = () => {
    setSubmitted(true)
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length === 0) {
      // TODO: call API
      onClose()
      resetForm()
    }
  }

  const resetForm = () => {
    setName(''); setDescription(''); setIconId('travel'); setColorId('purple')
    setTargetRaw(''); setSavedRaw('0'); setEnvelopeId('')
    setStartDate(todayStr()); setTargetDate('2026-12-31'); setPriority('high')
    setErrors({}); setSubmitted(false)
  }

  const handleClose = () => { onClose(); resetForm() }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/80 backdrop-blur-md"
            onClick={handleClose}
          />

          {/* Scroll container */}
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-4 px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 10 }}
              transition={{ type: 'spring', damping: 28, stiffness: 360 }}
              style={{ maxWidth: 1400 }}
              className="relative w-full bg-[#0B1120] border border-[#1A2540] rounded-2xl shadow-[0_0_0_1px_rgba(108,58,237,0.14),0_40px_100px_rgba(0,0,0,0.8),0_0_80px_rgba(108,58,237,0.08)] my-auto overflow-hidden"
              onClick={e => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Create Savings Goal"
            >
              {/* Top accent line */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#6C3AED]/50 to-transparent" />

              {/* ── Header ── */}
              <div className="relative flex items-start justify-between px-7 pt-6 pb-5 border-b border-[#111B2D]">
                <div>
                  <h2 className="text-[1.5rem] font-bold text-white leading-tight">Create Savings Goal</h2>
                  <p className="text-[14px] text-[#4A5A75] mt-1">Plan and track money for something important</p>
                </div>

                {/* Hero illustration — positioned top-center */}
                <div className="absolute left-1/2 -translate-x-1/2 -top-1 pointer-events-none">
                  <HeroIllustration />
                </div>

                <button
                  onClick={handleClose}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-[#4A5A75] hover:text-white hover:bg-[#1A2540] transition-colors focus:outline-none flex-shrink-0"
                  aria-label="Close"
                >
                  <X size={17} />
                </button>
              </div>

              {/* ── Body ── */}
              <div className="flex gap-5 px-7 pt-5 pb-5 max-h-[calc(95vh-140px)] overflow-y-auto">

                {/* ─── LEFT COLUMN (65%) ─── */}
                <div className="flex-[65] min-w-0 space-y-4">

                  {/* ── SECTION 1: Goal Information ── */}
                  <SectionCard>
                    <SectionTitle num={1} title="Goal Information" />

                    {/* Name + Description */}
                    <div className="flex gap-4">
                      {/* Goal Name */}
                      <div className="flex-1">
                        <label className="block mb-1.5 text-[13px] font-medium text-[#C8D4E4]">
                          Goal Name <span className="text-[#EF4444]">*</span>
                        </label>
                        <input
                          type="text"
                          maxLength={80}
                          value={name}
                          onChange={e => { setName(e.target.value); if (submitted) setErrors(v => ({ ...v, name: '' })) }}
                          placeholder="e.g. Japan Vacation"
                          className={cn(
                            'w-full h-11 px-3 rounded-xl border bg-[#0D1525] text-sm text-white placeholder:text-[#2A3A54] focus:outline-none transition-all',
                            errors.name
                              ? 'border-[#F87171]/60 ring-2 ring-[#F87171]/20'
                              : 'border-[#1E2B42] hover:border-[#3A4A62] focus:border-[#6C3AED] focus:ring-2 focus:ring-[#6C3AED]/30',
                          )}
                        />
                        {errors.name && (
                          <p className="mt-1 text-[11px] text-[#F87171]">{errors.name}</p>
                        )}
                      </div>

                      {/* Description */}
                      <div className="flex-1">
                        <label className="block mb-1.5 text-[13px] font-medium text-[#C8D4E4]">
                          Description{' '}
                          <span className="text-[#4A5A75] font-normal">(optional)</span>
                        </label>
                        <div className="relative">
                          <textarea
                            maxLength={120}
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="e.g. Saving for a trip in spring 2027"
                            rows={3}
                            className="w-full px-3 py-2.5 rounded-xl border border-[#1E2B42] bg-[#0D1525] text-sm text-white placeholder:text-[#2A3A54] focus:outline-none focus:border-[#6C3AED] focus:ring-2 focus:ring-[#6C3AED]/30 transition-all resize-none hover:border-[#3A4A62]"
                          />
                          <span className="absolute bottom-2 right-3 text-[10px] text-[#3A4A62]">
                            {description.length} / 120
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Goal Icon */}
                    <div>
                      <label className="block mb-2 text-[13px] font-medium text-[#C8D4E4]">Goal Icon</label>
                      <div className="flex gap-2 flex-wrap">
                        {GOAL_ICONS.map(icon => {
                          const active = iconId === icon.id
                          return (
                            <motion.button
                              key={icon.id}
                              type="button"
                              whileHover={{ y: -1 }}
                              onClick={() => setIconId(icon.id)}
                              className={cn(
                                'w-14 h-14 rounded-xl border flex items-center justify-center text-2xl transition-all',
                                active
                                  ? 'border-[#6C3AED] bg-[#1A0A38] shadow-[0_0_16px_rgba(108,58,237,0.4),inset_0_1px_0_rgba(108,58,237,0.25)]'
                                  : 'border-[#1E2B42] bg-[#0D1525] hover:border-[#3A4A62] hover:bg-[#111B2D]',
                              )}
                            >
                              {icon.emoji}
                            </motion.button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Goal Color */}
                    <div>
                      <label className="block mb-2 text-[13px] font-medium text-[#C8D4E4]">Goal Color</label>
                      <div className="flex gap-2.5">
                        {GOAL_COLORS.map(c => {
                          const active = colorId === c.id
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => setColorId(c.id)}
                              className="relative w-9 h-9 rounded-full flex items-center justify-center transition-all focus:outline-none"
                              style={{
                                backgroundColor: c.hex,
                                boxShadow: active ? `0 0 14px ${c.hex}80, 0 0 0 3px ${c.hex}40` : undefined,
                              }}
                              aria-label={c.label}
                            >
                              {active && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="w-4 h-4 rounded-full bg-white/90 flex items-center justify-center"
                                >
                                  <Check size={10} className="text-[#111]" strokeWidth={3} />
                                </motion.div>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </SectionCard>

                  {/* ── SECTION 2: Financial Target ── */}
                  <SectionCard>
                    <SectionTitle num={2} title="Financial Target" />

                    <div className="flex gap-4">
                      {/* Target Amount */}
                      <div className="flex-1">
                        <label className="block mb-1.5 text-[13px] font-medium text-[#C8D4E4]">
                          Target Amount <span className="text-[#EF4444]">*</span>
                        </label>
                        <CurrencyInput
                          value={targetRaw}
                          onChange={v => { setTargetRaw(v); if (submitted) setErrors(e => ({ ...e, target: '' })) }}
                          large
                          error={!!errors.target}
                        />
                        {errors.target && (
                          <p className="mt-1 text-[11px] text-[#F87171]">{errors.target}</p>
                        )}
                      </div>

                      {/* Linked Envelope */}
                      <div className="flex-1">
                        <label className="block mb-1.5 text-[13px] font-medium text-[#C8D4E4]">
                          Linked Envelope <span className="text-[#EF4444]">*</span>
                        </label>
                        <EnvelopeSelector
                          value={envelopeId}
                          onChange={v => { setEnvelopeId(v); if (submitted) setErrors(e => ({ ...e, envelope: '' })) }}
                          error={!!errors.envelope}
                        />
                        {errors.envelope && (
                          <p className="mt-1 text-[11px] text-[#F87171]">{errors.envelope}</p>
                        )}
                      </div>
                    </div>

                    {/* Current Saved */}
                    <div className="w-[calc(50%-8px)]">
                      <label className="block mb-1.5 text-[13px] font-medium text-[#C8D4E4]">
                        Current Saved Amount{' '}
                        <span className="text-[#4A5A75] font-normal">(optional)</span>
                      </label>
                      <CurrencyInput
                        value={savedRaw === '0' ? '' : savedRaw}
                        onChange={v => { setSavedRaw(v || '0'); if (submitted) setErrors(e => ({ ...e, saved: '' })) }}
                        placeholder="0"
                        error={!!errors.saved}
                      />
                      {errors.saved && (
                        <p className="mt-1 text-[11px] text-[#F87171]">{errors.saved}</p>
                      )}
                    </div>

                    {/* Suggested Monthly Saving */}
                    {monthlySaving > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                      >
                        <SuggestedSavingCard amount={monthlySaving} />
                      </motion.div>
                    )}
                  </SectionCard>

                  {/* ── SECTION 3: Timeline ── */}
                  <SectionCard>
                    <SectionTitle num={3} title="Timeline" />

                    <div className="flex gap-4">
                      {/* Start Date */}
                      <div className="flex-1">
                        <label className="block mb-1.5 text-[13px] font-medium text-[#C8D4E4]">
                          Start Date <span className="text-[#EF4444]">*</span>
                        </label>
                        <DateInput
                          value={startDate}
                          onChange={v => { setStartDate(v); if (submitted) setErrors(e => ({ ...e, startDate: '' })) }}
                          error={!!errors.startDate}
                        />
                      </div>

                      {/* Target Date */}
                      <div className="flex-1">
                        <label className="block mb-1.5 text-[13px] font-medium text-[#C8D4E4]">
                          Target Date{' '}
                          <span className="text-[#4A5A75] font-normal">(optional)</span>
                        </label>
                        <DateInput
                          value={targetDate}
                          onChange={v => { setTargetDate(v); if (submitted) setErrors(e => ({ ...e, targetDate: '' })) }}
                          error={!!errors.targetDate}
                        />
                        {errors.targetDate && (
                          <p className="mt-1 text-[11px] text-[#F87171]">{errors.targetDate}</p>
                        )}
                      </div>

                      {/* Goal Priority */}
                      <div className="flex-1">
                        <label className="block mb-1.5 text-[13px] font-medium text-[#C8D4E4]">
                          Goal Priority <span className="text-[#EF4444]">*</span>
                        </label>
                        <div className="flex gap-1 h-11">
                          {PRIORITY_OPTIONS.map(opt => {
                            const active = priority === opt.id
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => setPriority(opt.id)}
                                className={cn(
                                  'flex-1 text-[12.5px] font-medium rounded-xl border transition-all focus:outline-none',
                                  active
                                    ? 'border-[#6C3AED] bg-[#6C3AED] text-white shadow-[0_0_14px_rgba(108,58,237,0.45)]'
                                    : 'border-[#1E2B42] bg-[#0D1525] text-[#7A8BA8] hover:border-[#3A4A62] hover:text-[#C8D4E4]',
                                )}
                              >
                                {opt.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </SectionCard>
                </div>

                {/* ─── RIGHT SIDEBAR (35%) ─── */}
                <div className="flex-[35] min-w-[280px] space-y-4">

                  {/* Goal Preview Card */}
                  <GoalPreviewCard
                    name={name}
                    selectedIcon={selectedIcon}
                    colorHex={selectedColor.hex}
                    pct={pct}
                    targetAmount={targetAmount}
                    savedAmount={savedAmount}
                    targetDate={targetDate}
                    monthlySaving={monthlySaving}
                    status={status}
                  />

                  {/* Smart Insights */}
                  <SmartInsightsCard insights={insights} />
                </div>
              </div>

              {/* ── Footer ── */}
              <div className="flex items-center justify-between px-7 py-4 border-t border-[#111B2D] bg-[#080C14]">
                <button
                  type="button"
                  onClick={handleClose}
                  className="h-10 px-5 rounded-xl text-[13.5px] font-medium text-[#7A8BA8] border border-[#1E2B42] bg-[#0D1525] hover:text-white hover:border-[#3A4A62] transition-all"
                >
                  Cancel
                </button>

                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCreate}
                  className="flex items-center gap-2 h-10 px-7 rounded-xl text-[13.5px] font-semibold text-white transition-all focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/50"
                  style={{
                    background: 'linear-gradient(135deg, #5B21B6 0%, #6C3AED 50%, #7C3AED 100%)',
                    boxShadow: '0 4px 24px rgba(108,58,237,0.45)',
                  }}
                >
                  Create Goal
                  <Sparkles size={14} />
                </motion.button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
