'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Filter, ArrowUpDown, LayoutGrid, List, Plus,
  MoreHorizontal, Calendar, TrendingUp,
  Pause, Pencil, Trash2, Eye, Sparkles,
} from 'lucide-react'
import { GoalDetailsModal } from './GoalDetailsModal'
import { CreateGoalDialog } from './CreateGoalDialog'
import { ModifyGoalDialog, type GoalFormData } from './ModifyGoalDialog'
import { GoalCompletionDialog, type CompletionGoal } from './GoalCompletionDialog'
import { DeleteGoalDialog, type DeleteGoalTarget } from './DeleteGoalDialog'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/shared/PageHeader'

// ─── Types ─────────────────────────────────────────────────────────────────

type GoalStatus = 'on_track' | 'slightly_behind' | 'behind' | 'completed' | 'paused'
type GoalType = 'emergency_fund' | 'vacation' | 'vehicle' | 'home' | 'education' | 'technology' | 'custom'
type ViewMode = 'grid' | 'list'
type SortKey = 'progress' | 'target_date' | 'target_amount' | 'monthly' | 'name'

interface Contributor {
  initials: string
  color: string
}

interface GoalData {
  id: string
  name: string
  displayName: string
  type: GoalType
  status: GoalStatus
  targetAmount: number
  savedAmount: number
  monthlyContribution: number
  targetDate?: string
  iconEmoji: string
  iconBg: string
  ringColor: string
  ringBg: string
  contributors: Contributor[]
  recentContribution: number
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

const MOCK_GOALS: GoalData[] = [
  {
    id: 'g1',
    name: 'Emergency Fund',
    displayName: 'Emergency Fund',
    type: 'emergency_fund',
    status: 'on_track',
    targetAmount: 120000,
    savedAmount: 72000,
    monthlyContribution: 8000,
    iconEmoji: '🛡️',
    iconBg: '#22C55E',
    ringColor: '#22D3EE',
    ringBg: '#0A2028',
    contributors: [
      { initials: 'SA', color: '#6C3AED' },
      { initials: 'MA', color: '#EC4899' },
      { initials: '+2', color: '#3B82F6' },
    ],
    recentContribution: 8000,
  },
  {
    id: 'g2',
    name: 'Goa Trip',
    displayName: 'Goa Trip ✈️',
    type: 'vacation',
    status: 'slightly_behind',
    targetAmount: 60000,
    savedAmount: 27000,
    monthlyContribution: 5000,
    targetDate: '2025-08-01',
    iconEmoji: '🌅',
    iconBg: '#F59E0B',
    ringColor: '#F59E0B',
    ringBg: '#201500',
    contributors: [
      { initials: 'SA', color: '#6C3AED' },
      { initials: 'MA', color: '#22C55E' },
    ],
    recentContribution: 0,
  },
  {
    id: 'g3',
    name: 'MacBook Pro',
    displayName: 'MacBook Pro 💻',
    type: 'technology',
    status: 'on_track',
    targetAmount: 180000,
    savedAmount: 135000,
    monthlyContribution: 15000,
    iconEmoji: '💻',
    iconBg: '#8B5CF6',
    ringColor: '#8B5CF6',
    ringBg: '#1A0D30',
    contributors: [
      { initials: 'SA', color: '#6C3AED' },
      { initials: 'KR', color: '#F59E0B' },
      { initials: '+1', color: '#3B82F6' },
    ],
    recentContribution: 15000,
  },
  {
    id: 'g4',
    name: 'Car Down Payment',
    displayName: 'Car Down Payment 🚗',
    type: 'vehicle',
    status: 'behind',
    targetAmount: 500000,
    savedAmount: 125000,
    monthlyContribution: 16000,
    targetDate: '2027-12-01',
    iconEmoji: '🚗',
    iconBg: '#3B82F6',
    ringColor: '#FB7185',
    ringBg: '#22080E',
    contributors: [
      { initials: 'SA', color: '#6C3AED' },
      { initials: 'MA', color: '#EC4899' },
    ],
    recentContribution: 8000,
  },
  {
    id: 'g5',
    name: 'Japan Vacation',
    displayName: 'Japan Vacation ✈️',
    type: 'vacation',
    status: 'completed',
    targetAmount: 250000,
    savedAmount: 250000,
    monthlyContribution: 10400,
    targetDate: '2026-05-24',
    iconEmoji: '✈️',
    iconBg: '#7C3AED',
    ringColor: '#A855F7',
    ringBg: '#1A0D30',
    contributors: [
      { initials: 'SA', color: '#6C3AED' },
      { initials: 'MA', color: '#EC4899' },
    ],
    recentContribution: 0,
  },
]

const STATS_DATA = [
  {
    title: 'Total Goal Targets',
    value: '₹4,50,000',
    illustration: '🎯',
    gradFrom: '#1A0E35',
    gradTo: '#27194A',
    titleColor: '#C4B5FD',
    borderColor: '#6C3AED33',
  },
  {
    title: 'Total Saved',
    value: '₹1,82,000',
    illustration: '💰',
    gradFrom: '#0A2215',
    gradTo: '#123020',
    titleColor: '#86EFAC',
    borderColor: '#22C55E33',
  },
  {
    title: 'Remaining to Reach',
    value: '₹2,68,000',
    illustration: '⛰️',
    gradFrom: '#221500',
    gradTo: '#331E00',
    titleColor: '#FDE68A',
    borderColor: '#F59E0B33',
  },
  {
    title: 'Active Goals',
    value: '6',
    illustration: '👥',
    gradFrom: '#071A30',
    gradTo: '#0D2540',
    titleColor: '#93C5FD',
    borderColor: '#3B82F633',
  },
  {
    title: 'Monthly Contribution',
    value: '₹24,000',
    illustration: '🐷',
    gradFrom: '#220A18',
    gradTo: '#330D24',
    titleColor: '#FBCFE8',
    borderColor: '#EC489933',
  },
]

const FORECAST_DATA = [
  { month: 'Dec 24', value: 50000 },
  { month: 'Jan', value: 74000 },
  { month: 'Feb', value: 98000 },
  { month: 'Mar', value: 122000 },
  { month: 'Apr', value: 148000 },
  { month: 'May', value: 182000 },
  { month: 'Jun', value: 206000 },
  { month: 'Jul', value: 232000 },
  { month: 'Aug', value: 260000 },
  { month: 'Sep', value: 290000 },
  { month: 'Oct', value: 322000 },
  { month: 'Nov', value: 356000 },
  { month: 'Dec 26', value: 450000 },
]

const ALLOCATION_DATA = [
  { name: 'Emergency Fund', value: 26.7, color: '#22C55E' },
  { name: 'Goa Trip', value: 13.3, color: '#F59E0B' },
  { name: 'MacBook Pro', value: 40.0, color: '#8B5CF6' },
  { name: 'Car Down Payment', value: 20.0, color: '#3B82F6' },
]

const TIMELINE_ITEMS = [
  { name: 'Goa Trip', date: 'Aug 2025', emoji: '🌅', bg: '#201500' },
  { name: 'MacBook Pro', date: 'Mar 2026', emoji: '💻', bg: '#1A0D30' },
  { name: 'Emergency Fund', date: 'Dec 2026', emoji: '🛡️', bg: '#0A2215' },
  { name: 'Car Down Payment', date: 'Dec 2027', emoji: '🚗', bg: '#071A30' },
]

const MONTHLY_TREND = [
  { month: 'Jan', amount: 18000 },
  { month: 'Feb', amount: 20000 },
  { month: 'Mar', amount: 16000 },
  { month: 'Apr', amount: 22000 },
  { month: 'May', amount: 19000 },
  { month: 'Jun', amount: 24000 },
]

const STATUS_OPTIONS = [
  { label: 'All Goals', value: 'all' },
  { label: 'On Track', value: 'on_track' },
  { label: 'Slightly Behind', value: 'slightly_behind' },
  { label: 'Behind', value: 'behind' },
  { label: 'Completed', value: 'completed' },
  { label: 'Paused', value: 'paused' },
]

const TYPE_OPTIONS = [
  { label: 'Emergency Fund', value: 'emergency_fund' },
  { label: 'Vacation', value: 'vacation' },
  { label: 'Vehicle', value: 'vehicle' },
  { label: 'Home', value: 'home' },
  { label: 'Education', value: 'education' },
  { label: 'Technology', value: 'technology' },
  { label: 'Custom', value: 'custom' },
]

const SORT_OPTIONS = [
  { label: 'Progress', value: 'progress' },
  { label: 'Target Date', value: 'target_date' },
  { label: 'Target Amount', value: 'target_amount' },
  { label: 'Monthly Contribution', value: 'monthly' },
  { label: 'Goal Name', value: 'name' },
]

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('en-IN')
}

function fmtDate(d?: string) {
  if (!d) return null
  const date = new Date(d)
  return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
}

function getPct(saved: number, target: number) {
  return Math.min(Math.round((saved / target) * 100), 100)
}

// ─── ProgressRing ───────────────────────────────────────────────────────────

function ProgressRing({
  pct,
  color,
  bgColor,
  size = 110,
  stroke = 11,
}: {
  pct: number
  color: string
  bgColor: string
  size?: number
  stroke?: number
}) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - pct / 100)
  const cx = size / 2

  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={cx} cy={cx} r={r}
          fill="none"
          stroke={bgColor}
          strokeWidth={stroke}
        />
        <motion.circle
          cx={cx} cy={cx} r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[21px] font-bold text-white leading-none">{pct}%</span>
      </div>
    </div>
  )
}

// ─── StatusBadge ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<GoalStatus, { label: string; bg: string; text: string; prefix?: string }> = {
  on_track:        { label: 'On Track',        bg: 'rgba(34,197,94,0.15)',   text: '#22C55E' },
  slightly_behind: { label: 'Slightly Behind', bg: 'rgba(245,158,11,0.18)', text: '#F59E0B', prefix: '⚡' },
  behind:          { label: 'Behind',          bg: 'rgba(239,68,68,0.15)',  text: '#EF4444', prefix: '⚡' },
  completed:       { label: 'Completed',       bg: 'rgba(34,197,94,0.15)',  text: '#22C55E', prefix: '✓' },
  paused:          { label: 'Paused',          bg: 'rgba(90,106,133,0.18)', text: '#A8B4CC', prefix: '⏸' },
}

function StatusBadge({ status }: { status: GoalStatus }) {
  const cfg = STATUS_CFG[status]
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.text }}
    >
      {cfg.prefix && <span>{cfg.prefix}</span>}
      {cfg.label}
    </span>
  )
}

// ─── GoalActionsMenu ────────────────────────────────────────────────────────

function GoalActionsMenu({ onEdit, onCelebrate, onDelete }: { onEdit?: () => void; onCelebrate?: () => void; onDelete?: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const actions: { icon: typeof Eye; label: string; danger?: boolean; onClick?: () => void }[] = [
    { icon: Eye,    label: 'View Goal' },
    { icon: Pencil, label: 'Edit Goal',    onClick: onEdit },
    ...(onCelebrate ? [{ icon: Sparkles as typeof Eye, label: '🎉 View Achievement', onClick: onCelebrate }] : []),
    { icon: Plus,   label: 'Add Contribution' },
    { icon: Pause,  label: 'Pause Goal' },
    { icon: Trash2, label: 'Delete Goal', danger: true, onClick: onDelete },
  ]

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-[#5A6A85] hover:bg-[#1E2B42] hover:text-[#A8B4CC] transition-colors"
      >
        <MoreHorizontal size={15} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-1 w-44 bg-[#0D1525] border border-[#1E2B42] rounded-xl shadow-xl z-50 py-1.5"
          >
            {actions.map(({ icon: Icon, label, danger, onClick }) => (
              <button
                key={label}
                onClick={() => { setOpen(false); onClick?.() }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors',
                  danger
                    ? 'text-[#EF4444] hover:bg-[#1A0808]'
                    : 'text-[#A8B4CC] hover:bg-[#131C2E] hover:text-white'
                )}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── GoalCard ───────────────────────────────────────────────────────────────

function GoalCard({ goal, index, onOpen, onEdit, onCelebrate, onDelete }: { goal: GoalData; index: number; onOpen: (id: string) => void; onEdit: (id: string) => void; onCelebrate: (id: string) => void; onDelete: (id: string) => void }) {
  const pct = getPct(goal.savedAmount, goal.targetAmount)
  const remaining = goal.targetAmount - goal.savedAmount
  const targetDate = fmtDate(goal.targetDate)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.07 }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      className="bg-[#0F1623] border border-[#1E2B42] rounded-2xl p-5 flex flex-col gap-4 group cursor-pointer"
      onClick={() => onOpen(goal.id)}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-[18px] flex-shrink-0"
            style={{ background: `${goal.iconBg}22` }}
          >
            {goal.iconEmoji}
          </div>
          <span className="text-[15px] font-semibold text-white truncate">{goal.displayName}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <StatusBadge status={goal.status} />
          <GoalActionsMenu
            onEdit={() => onEdit(goal.id)}
            onCelebrate={goal.status === 'completed' ? () => onCelebrate(goal.id) : undefined}
            onDelete={() => onDelete(goal.id)}
          />
        </div>
      </div>

      {/* Progress + Metrics row */}
      <div className="flex items-start gap-5">
        <ProgressRing pct={pct} color={goal.ringColor} bgColor={goal.ringBg} size={112} stroke={11} />

        <div className="flex-1 min-w-0 flex flex-col gap-0">
          <MetricRow value={`₹${fmt(goal.targetAmount)}`} label="Target" />
          <MetricRow value={`₹${fmt(goal.savedAmount)}`} label="Saved" />
          <MetricRow value={`₹${fmt(remaining)}`} label="Remaining" />
          <div className="flex items-center gap-1.5 mt-3 text-[13px] text-[#5A6A85]">
            <Calendar size={12} className="flex-shrink-0" />
            <span>₹{fmt(goal.monthlyContribution)} / month</span>
          </div>
        </div>
      </div>

      {/* Footer row */}
      <div className="flex items-center justify-between pt-0.5 border-t border-[#161F30]">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#5A6A85]">Recent contributions</span>
          <div className="flex items-center">
            {goal.contributors.map((c, i) => (
              <div
                key={i}
                className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white border-[1.5px] border-[#0F1623]"
                style={{
                  background: c.color,
                  marginLeft: i > 0 ? '-5px' : '0',
                  zIndex: goal.contributors.length - i,
                  position: 'relative',
                }}
              >
                {c.initials}
              </div>
            ))}
          </div>
          {goal.recentContribution > 0 && (
            <span className="text-[12px] text-[#22C55E] font-medium">
              +₹{fmt(goal.recentContribution)} this month
            </span>
          )}
        </div>
        {targetDate && (
          <span className="text-[12px] text-[#5A6A85]">Target: {targetDate}</span>
        )}
      </div>
    </motion.div>
  )
}

function MetricRow({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-[#111827] last:border-0">
      <span className="text-[15px] font-semibold text-white tabular-nums">{value}</span>
      <span className="text-[12px] text-[#5A6A85]">{label}</span>
    </div>
  )
}

// ─── GoalListTable ──────────────────────────────────────────────────────────

function GoalListTable({ goals }: { goals: GoalData[] }) {
  const cols = ['Goal', 'Status', 'Progress', 'Saved', 'Remaining', 'Monthly', 'Target Date', '']
  return (
    <div className="bg-[#0F1623] border border-[#1E2B42] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1E2B42]">
              {cols.map(c => (
                <th key={c} className="text-left px-4 py-3 text-[11px] font-medium text-[#5A6A85] uppercase tracking-wider whitespace-nowrap">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {goals.map((goal, i) => {
              const pct = getPct(goal.savedAmount, goal.targetAmount)
              const remaining = goal.targetAmount - goal.savedAmount
              return (
                <motion.tr
                  key={goal.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="border-b border-[#111827] last:border-0 hover:bg-[#131C2E] transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[14px] flex-shrink-0"
                        style={{ background: `${goal.iconBg}22` }}
                      >
                        {goal.iconEmoji}
                      </div>
                      <div>
                        <div className="text-[14px] font-medium text-white whitespace-nowrap">{goal.name}</div>
                        <div className="text-[11px] text-[#5A6A85] capitalize">
                          {goal.type.replace(/_/g, ' ')}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={goal.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-[#1E2B42] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: i * 0.05 }}
                          className="h-full rounded-full"
                          style={{ background: goal.ringColor }}
                        />
                      </div>
                      <span className="text-[12px] text-[#A8B4CC] tabular-nums">{pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[14px] text-white tabular-nums whitespace-nowrap">₹{fmt(goal.savedAmount)}</td>
                  <td className="px-4 py-3 text-[14px] text-[#A8B4CC] tabular-nums whitespace-nowrap">₹{fmt(remaining)}</td>
                  <td className="px-4 py-3 text-[14px] text-[#A8B4CC] tabular-nums whitespace-nowrap">₹{fmt(goal.monthlyContribution)}/mo</td>
                  <td className="px-4 py-3 text-[13px] text-[#5A6A85] whitespace-nowrap">
                    {fmtDate(goal.targetDate) ?? <span className="text-[#2A3A55]">—</span>}
                  </td>
                  <td className="px-4 py-3"><GoalActionsMenu /></td>
                </motion.tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Sidebar: Savings Forecast ──────────────────────────────────────────────

function SavingsForecastCard() {
  return (
    <div className="bg-[#0F1623] border border-[#1E2B42] rounded-xl p-4">
      <div className="flex items-center justify-between mb-0.5">
        <h3 className="text-[14px] font-semibold text-white">Savings Forecast</h3>
        <div className="w-2 h-2 rounded-full bg-[#2A3A55]" />
      </div>
      <p className="text-[12px] text-[#5A6A85] mb-3 leading-relaxed">
        You&apos;re on track to reach ₹4,50,000 by Dec 2026
      </p>
      <div className="h-[130px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={FORECAST_DATA} margin={{ top: 4, right: 4, bottom: 0, left: -30 }}>
            <defs>
              <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6C3AED" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#6C3AED" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="month"
              tick={{ fill: '#5A6A85', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis hide />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                return (
                  <div className="bg-[#131C2E] border border-[#1E2B42] rounded-lg px-2.5 py-1.5 text-[11px] text-white shadow-xl">
                    ₹{fmt(payload[0].value as number)}
                  </div>
                )
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#6C3AED"
              strokeWidth={2}
              fill="url(#forecastGrad)"
              dot={false}
              activeDot={{ r: 3, fill: '#8B5CF6', stroke: '#080C14', strokeWidth: 1.5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── Sidebar: Goal Completion Timeline ─────────────────────────────────────

function GoalTimelineCard() {
  return (
    <div className="bg-[#0F1623] border border-[#1E2B42] rounded-xl p-4">
      <h3 className="text-[14px] font-semibold text-white mb-3">Goal Completion Timeline</h3>
      <div className="space-y-2.5">
        {TIMELINE_ITEMS.map((item, i) => (
          <motion.div
            key={item.name}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07 }}
            className="flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[13px] flex-shrink-0"
                style={{ background: item.bg }}
              >
                {item.emoji}
              </div>
              <span className="text-[13px] text-[#A8B4CC] truncate">{item.name}</span>
            </div>
            <span className="text-[12px] text-[#5A6A85] whitespace-nowrap">{item.date}</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ─── Sidebar: Goal Allocation Breakdown ────────────────────────────────────

function GoalAllocationChart() {
  return (
    <div className="bg-[#0F1623] border border-[#1E2B42] rounded-xl p-4">
      <h3 className="text-[14px] font-semibold text-white mb-3">Goal Allocation Breakdown</h3>
      <div className="flex items-center gap-3">
        <div className="relative flex-shrink-0" style={{ width: 120, height: 120 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={ALLOCATION_DATA}
                cx="50%"
                cy="50%"
                innerRadius={38}
                outerRadius={56}
                paddingAngle={2}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
                stroke="none"
              >
                {ALLOCATION_DATA.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[11px] font-bold text-white leading-none">₹4,50,000</span>
            <span className="text-[9px] text-[#5A6A85] mt-0.5 text-center leading-tight">Total<br/>Target</span>
          </div>
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          {ALLOCATION_DATA.map(item => (
            <div key={item.name} className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                <span className="text-[11px] text-[#A8B4CC] truncate">{item.name}</span>
              </div>
              <span className="text-[11px] text-[#5A6A85] whitespace-nowrap flex-shrink-0">{item.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Sidebar: Monthly Savings Trend ────────────────────────────────────────

function MonthlySavingsTrend() {
  return (
    <div className="bg-[#0F1623] border border-[#1E2B42] rounded-xl p-4">
      <h3 className="text-[14px] font-semibold text-white mb-3">Monthly Savings Trend</h3>
      <div className="flex items-end gap-3">
        <div className="flex-1 h-[90px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={MONTHLY_TREND} margin={{ top: 0, right: 0, bottom: 0, left: -20 }} barSize={14}>
              <XAxis
                dataKey="month"
                tick={{ fill: '#5A6A85', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Bar dataKey="amount" radius={[3, 3, 0, 0]}>
                {MONTHLY_TREND.map((_, i) => (
                  <Cell
                    key={i}
                    fill={i === MONTHLY_TREND.length - 1 ? '#6C3AED' : '#1E2B42'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col items-end pb-5 flex-shrink-0">
          <span className="text-[18px] font-bold text-white leading-none">₹24,000</span>
          <span className="text-[10px] text-[#5A6A85] mt-1 text-right leading-tight">
            Avg monthly<br />contribution
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1 mt-1 text-[11px] text-[#22C55E]">
        <TrendingUp size={11} />
        <span>↑ 12% vs last month</span>
      </div>
    </div>
  )
}

// ─── Stats Cards Row ────────────────────────────────────────────────────────

function GoalStatsCards() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {STATS_DATA.map((stat, i) => (
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.06 }}
          whileHover={{ y: -2, transition: { duration: 0.15 } }}
          className="relative overflow-hidden rounded-xl p-4 flex flex-col justify-between min-h-[100px] cursor-default"
          style={{
            background: `linear-gradient(135deg, ${stat.gradFrom}, ${stat.gradTo})`,
            border: `1px solid ${stat.borderColor}`,
          }}
        >
          <span className="text-[12px] font-medium leading-tight" style={{ color: stat.titleColor }}>
            {stat.title}
          </span>
          <div className="flex items-end justify-between mt-2">
            <span className="text-[20px] font-bold text-white leading-none tabular-nums">
              {stat.value}
            </span>
            <span className="text-[30px] leading-none select-none" aria-hidden>
              {stat.illustration}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// ─── Empty State ────────────────────────────────────────────────────────────

function EmptyState({ onCreateGoal }: { onCreateGoal?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0F1623] border border-[#1E2B42] rounded-2xl p-16 flex flex-col items-center text-center"
    >
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4"
        style={{ background: 'rgba(108,58,237,0.12)' }}
      >
        🎯
      </div>
      <h3 className="text-[18px] font-semibold text-white mb-2">No goals yet</h3>
      <p className="text-[14px] text-[#5A6A85] max-w-xs mb-6 leading-relaxed">
        Create your first financial goal to start tracking your savings progress.
      </p>
      <button
        onClick={onCreateGoal}
        className="flex items-center gap-2 h-10 px-5 rounded-lg bg-[#6C3AED] text-[14px] font-medium text-white hover:bg-[#7C4AFF] transition-colors shadow-lg shadow-[#6C3AED]/20"
      >
        <Plus size={15} />
        Create Goal
      </button>
    </motion.div>
  )
}

// ─── Goal → form data mapper ──────────────────────────────────────────────────

function goalToFormData(goal: GoalData): GoalFormData {
  const iconMap: Record<GoalType, string> = {
    emergency_fund: 'savings',
    vacation:       'travel',
    vehicle:        'vehicle',
    home:           'home',
    education:      'education',
    technology:     'technology',
    custom:         'custom',
  }
  return {
    id:           goal.id,
    name:         goal.displayName.replace(/\s[\S]+$/, '').trim() || goal.name,
    description:  '',
    iconId:       iconMap[goal.type] ?? 'custom',
    colorId:      'purple',
    targetAmount: goal.targetAmount,
    savedAmount:  goal.savedAmount,
    envelopeId:   'e1',
    startDate:    new Date().toISOString().slice(0, 10),
    targetDate:   goal.targetDate ?? '',
    priority:     'high',
  }
}

// ─── GoalsView (main export) ────────────────────────────────────────────────

export function GoalsView() {
  const [view, setView] = useState<ViewMode>('grid')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sort, setSort] = useState<SortKey>('progress')
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null)
  const [createOpen,     setCreateOpen]     = useState(false)
  const [modifyGoalId,     setModifyGoalId]     = useState<string | null>(null)
  const [completionGoalId, setCompletionGoalId] = useState<string | null>(null)
  const [deleteGoalId,     setDeleteGoalId]     = useState<string | null>(null)

  const completionGoalData = useMemo<CompletionGoal | null>(() => {
    if (!completionGoalId) return null
    const g = MOCK_GOALS.find(g => g.id === completionGoalId)
    if (!g) return null
    return {
      id: g.id,
      title: g.name,
      icon: g.iconEmoji,
      targetAmount: g.targetAmount,
      savedAmount: g.savedAmount,
      completedAt: new Date('2026-05-24'),
      createdAt: new Date('2025-01-24'),
    }
  }, [completionGoalId])

  const deleteGoalData = useMemo<DeleteGoalTarget | null>(() => {
    if (!deleteGoalId) return null
    const g = MOCK_GOALS.find(g => g.id === deleteGoalId)
    if (!g) return null
    return {
      id: g.id,
      title: g.name,
      icon: g.iconEmoji,
      targetAmount: g.targetAmount,
      savedAmount: g.savedAmount,
      progressPercentage: Math.round((g.savedAmount / g.targetAmount) * 100),
      contributionCount: 4,
    }
  }, [deleteGoalId])

  const modifyGoalData = useMemo(
    () => modifyGoalId ? goalToFormData(MOCK_GOALS.find(g => g.id === modifyGoalId)!) : null,
    [modifyGoalId],
  )

  const [filterOpen, setFilterOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)
  const sortRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false)
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const sortLabel = SORT_OPTIONS.find(o => o.value === sort)?.label ?? 'Sort'
  const filterActive = statusFilter !== 'all'

  const filteredGoals = useMemo(() => {
    const goals = MOCK_GOALS.filter(g => {
      if (search) {
        const q = search.toLowerCase()
        if (!g.name.toLowerCase().includes(q) && !g.displayName.toLowerCase().includes(q)) return false
      }
      if (statusFilter !== 'all' && g.status !== statusFilter) return false
      return true
    })

    return [...goals].sort((a, b) => {
      switch (sort) {
        case 'progress':
          return getPct(b.savedAmount, b.targetAmount) - getPct(a.savedAmount, a.targetAmount)
        case 'target_amount':
          return b.targetAmount - a.targetAmount
        case 'monthly':
          return b.monthlyContribution - a.monthlyContribution
        case 'name':
          return a.name.localeCompare(b.name)
        case 'target_date': {
          if (!a.targetDate && !b.targetDate) return 0
          if (!a.targetDate) return 1
          if (!b.targetDate) return -1
          return a.targetDate.localeCompare(b.targetDate)
        }
        default:
          return 0
      }
    })
  }, [search, statusFilter, sort])

  return (
    <div className="layout-page py-6 space-y-5">
      {/* Header */}
      <PageHeader
        title="Financial Goals ✨"
        description="Track progress toward your future plans"
        actions={
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6A85] pointer-events-none" />
              <input
                type="text"
                placeholder="Search goals..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-[350px] h-10 pl-9 pr-3 rounded-lg bg-[#0F1623] border border-[#1E2B42] text-[14px] text-white placeholder-[#5A6A85] outline-none focus:border-[#6C3AED] transition-colors"
              />
            </div>

            {/* Filter */}
            <div className="relative" ref={filterRef}>
              <button
                onClick={() => { setFilterOpen(v => !v); setSortOpen(false) }}
                className={cn(
                  'flex items-center gap-2 h-10 px-4 rounded-lg border text-[14px] transition-colors',
                  filterActive
                    ? 'border-[#6C3AED] text-[#C4B5FD] bg-[#131C2E]'
                    : 'border-[#1E2B42] text-[#A8B4CC] hover:bg-[#131C2E] hover:text-white'
                )}
              >
                <Filter size={13} />
                Filter
                {filterActive && <span className="w-1.5 h-1.5 rounded-full bg-[#6C3AED]" />}
              </button>
              <AnimatePresence>
                {filterOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.97 }}
                    transition={{ duration: 0.13 }}
                    className="absolute left-0 top-full mt-1.5 w-52 bg-[#0D1525] border border-[#1E2B42] rounded-xl shadow-2xl z-50 py-2 overflow-hidden"
                  >
                    <div className="px-3 pt-1 pb-1.5 text-[10px] font-semibold text-[#5A6A85] uppercase tracking-widest">
                      Status
                    </div>
                    {STATUS_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => { setStatusFilter(opt.value); setFilterOpen(false) }}
                        className={cn(
                          'w-full text-left px-3 py-1.5 text-[13px] transition-colors',
                          opt.value === statusFilter
                            ? 'text-white bg-[#131C2E]'
                            : 'text-[#A8B4CC] hover:bg-[#131C2E] hover:text-white'
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                    <div className="border-t border-[#1E2B42] my-1.5" />
                    <div className="px-3 pb-1.5 text-[10px] font-semibold text-[#5A6A85] uppercase tracking-widest">
                      Goal Type
                    </div>
                    {TYPE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => { setFilterOpen(false) }}
                        className="w-full text-left px-3 py-1.5 text-[13px] text-[#A8B4CC] hover:bg-[#131C2E] hover:text-white transition-colors"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Sort */}
            <div className="relative" ref={sortRef}>
              <button
                onClick={() => { setSortOpen(v => !v); setFilterOpen(false) }}
                className="flex items-center gap-2 h-10 px-4 rounded-lg border border-[#1E2B42] text-[14px] text-[#A8B4CC] hover:bg-[#131C2E] hover:text-white transition-colors"
              >
                <ArrowUpDown size={13} />
                {sortLabel}
              </button>
              <AnimatePresence>
                {sortOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.97 }}
                    transition={{ duration: 0.13 }}
                    className="absolute left-0 top-full mt-1.5 w-52 bg-[#0D1525] border border-[#1E2B42] rounded-xl shadow-2xl z-50 py-2 overflow-hidden"
                  >
                    {SORT_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => { setSort(opt.value as SortKey); setSortOpen(false) }}
                        className={cn(
                          'w-full text-left px-3 py-2 text-[13px] transition-colors',
                          opt.value === sort
                            ? 'text-white bg-[#131C2E]'
                            : 'text-[#A8B4CC] hover:bg-[#131C2E] hover:text-white'
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* View toggle */}
            <div className="flex items-center gap-1 bg-[#0F1623] border border-[#1E2B42] rounded-lg p-1">
              <button
                onClick={() => setView('grid')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-all',
                  view === 'grid'
                    ? 'bg-[#6C3AED] text-white shadow-sm'
                    : 'text-[#5A6A85] hover:text-[#A8B4CC]'
                )}
              >
                <LayoutGrid size={13} />
                Grid
              </button>
              <button
                onClick={() => setView('list')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-all',
                  view === 'list'
                    ? 'bg-[#6C3AED] text-white shadow-sm'
                    : 'text-[#5A6A85] hover:text-[#A8B4CC]'
                )}
              >
                <List size={13} />
                List
              </button>
            </div>

            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 h-10 px-5 rounded-lg bg-[#6C3AED] text-[14px] font-medium text-white hover:bg-[#7C4AFF] transition-colors shadow-lg shadow-[#6C3AED]/25"
            >
              <Plus size={15} />
              Create Goal
            </button>
          </div>
        }
      />

      {/* KPI Stats */}
      <GoalStatsCards />

      {/* Main content + right sidebar */}
      <div className="flex gap-5 items-start">
        {/* Left: goal cards */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            {filteredGoals.length === 0 ? (
              <EmptyState key="empty" onCreateGoal={() => setCreateOpen(true)} />
            ) : view === 'grid' ? (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="grid grid-cols-1 xl:grid-cols-2 gap-4"
              >
                {filteredGoals.map((goal, i) => (
                  <GoalCard key={goal.id} goal={goal} index={i} onOpen={setSelectedGoalId} onEdit={setModifyGoalId} onCelebrate={setCompletionGoalId} onDelete={setDeleteGoalId} />
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <GoalListTable goals={filteredGoals} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right sidebar */}
        <div className="w-[280px] flex-shrink-0 space-y-4">
          <SavingsForecastCard />
          <GoalTimelineCard />
          <GoalAllocationChart />
          <MonthlySavingsTrend />
        </div>
      </div>

      {/* Goal Details Modal */}
      <GoalDetailsModal
        goalId={selectedGoalId}
        onClose={() => setSelectedGoalId(null)}
        onEdit={id => { setSelectedGoalId(null); setModifyGoalId(id) }}
        onDelete={id => { setSelectedGoalId(null); setDeleteGoalId(id) }}
      />

      {/* Create Goal Dialog */}
      <CreateGoalDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />

      {/* Modify Goal Dialog */}
      <ModifyGoalDialog
        open={modifyGoalId !== null}
        goal={modifyGoalData}
        onClose={() => setModifyGoalId(null)}
      />

      {/* Delete Goal Dialog */}
      <DeleteGoalDialog
        open={deleteGoalId !== null}
        goal={deleteGoalData}
        onClose={() => setDeleteGoalId(null)}
        onDeleted={() => setDeleteGoalId(null)}
      />

      {/* Goal Completion Celebration */}
      <GoalCompletionDialog
        open={completionGoalId !== null}
        goal={completionGoalData}
        userName="Saqib"
        onClose={() => setCompletionGoalId(null)}
        onViewSummary={id => { setCompletionGoalId(null); setSelectedGoalId(id) }}
        onCreateNewGoal={() => { setCompletionGoalId(null); setCreateOpen(true) }}
      />
    </div>
  )
}
