'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ShoppingCart, Plus, Pencil, Archive, MoreVertical, ChevronDown,
  Search, Filter, ArrowUpDown, Download, Shield, Info,
  Building2, Wallet, TrendingUp, Activity, BarChart3,
  ChevronLeft, ChevronRight, Zap, Star, Heart,
  Hash, ArrowDownRight, Landmark, Gauge, ReceiptText,
  Edit2, MoreHorizontal,
} from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { AddTransactionModal } from '@/components/transactions/AddTransactionModal'
import { ModifyEnvelopeModal } from './ModifyEnvelopeModal'
import { ArchiveEnvelopeModal } from './ArchiveEnvelopeModal'

/* ── Types ───────────────────────────────────────────────── */
type Nature = 'Must' | 'Need' | 'Should' | 'Want'
type TxStatus = 'Cleared' | 'Pending' | 'Reconciled'

interface EnvelopeTx {
  id: string
  date: string
  title: string
  account: string
  accountType: 'bank' | 'wallet'
  amount: number
  runningImpact: number
  status: TxStatus
}

/* ── Mock data ───────────────────────────────────────────── */
const MOCK_TRANSACTIONS: EnvelopeTx[] = [
  { id: 't1', date: 'May 12, 2026', title: 'Big Basket',       account: 'HDFC Checking', accountType: 'bank',   amount: -1450, runningImpact: -5200, status: 'Cleared'    },
  { id: 't2', date: 'May 08, 2026', title: 'DMart',            account: 'Cash Wallet',   accountType: 'wallet', amount: -980,  runningImpact: -3750, status: 'Cleared'    },
  { id: 't3', date: 'May 05, 2026', title: 'Reliance Fresh',   account: 'HDFC Checking', accountType: 'bank',   amount: -1120, runningImpact: -2770, status: 'Cleared'    },
  { id: 't4', date: 'May 02, 2026', title: 'Milk & Vegetables',account: 'Cash Wallet',   accountType: 'wallet', amount: -430,  runningImpact: -1650, status: 'Pending'    },
  { id: 't5', date: 'Apr 29, 2026', title: 'Local Market',     account: 'Cash Wallet',   accountType: 'wallet', amount: -650,  runningImpact: -1220, status: 'Reconciled' },
  { id: 't6', date: 'Apr 25, 2026', title: 'More Supermarket', account: 'HDFC Checking', accountType: 'bank',   amount: -870,  runningImpact:  -570, status: 'Cleared'    },
  { id: 't7', date: 'Apr 20, 2026', title: 'Nilgiris',         account: 'Cash Wallet',   accountType: 'wallet', amount: -320,  runningImpact:   300, status: 'Cleared'    },
  { id: 't8', date: 'Apr 18, 2026', title: 'Zepto Delivery',   account: 'HDFC Checking', accountType: 'bank',   amount: -580,  runningImpact:   620, status: 'Cleared'    },
  { id: 't9', date: 'Apr 14, 2026', title: 'Big Basket',       account: 'HDFC Checking', accountType: 'bank',   amount: -1100, runningImpact:  1200, status: 'Reconciled' },
  { id: 't10',date: 'Apr 10, 2026', title: 'Blinkit Order',    account: 'Cash Wallet',   accountType: 'wallet', amount: -290,  runningImpact:  2300, status: 'Cleared'    },
  { id: 't11',date: 'Apr 07, 2026', title: 'Spencer\'s',       account: 'HDFC Checking', accountType: 'bank',   amount: -940,  runningImpact:  2590, status: 'Cleared'    },
  { id: 't12',date: 'Apr 04, 2026', title: 'Local Market',     account: 'Cash Wallet',   accountType: 'wallet', amount: -490,  runningImpact:  3530, status: 'Cleared'    },
]

/* ── Nature badge ────────────────────────────────────────── */
function NatureBadge({ nature }: { nature: Nature }) {
  const cfg: Record<Nature, { icon: React.ReactNode; bg: string; text: string; border: string }> = {
    Must:   { icon: <Shield   size={10} strokeWidth={2.5} />, bg: 'rgba(108,58,237,0.15)', text: '#A78BFA', border: 'rgba(108,58,237,0.3)' },
    Need:   { icon: <Shield   size={10} strokeWidth={2.5} />, bg: 'rgba(34,197,94,0.12)',  text: '#4ADE80', border: 'rgba(34,197,94,0.25)'  },
    Should: { icon: <Star     size={10} strokeWidth={2.5} />, bg: 'rgba(245,158,11,0.12)', text: '#FCD34D', border: 'rgba(245,158,11,0.25)' },
    Want:   { icon: <Heart    size={10} strokeWidth={2.5} />, bg: 'rgba(236,72,153,0.12)', text: '#F472B6', border: 'rgba(236,72,153,0.25)' },
  }
  const c = cfg[nature]
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border whitespace-nowrap"
      style={{ backgroundColor: c.bg, color: c.text, borderColor: c.border }}
    >
      {c.icon} {nature}
    </span>
  )
}

/* ── Status badge (envelope health) ────────────────────── */
function HealthBadge({ pct }: { pct: number }) {
  const label  = pct > 100 ? 'Overspent' : pct >= 80 ? 'Warning' : 'Healthy'
  const bg     = pct > 100 ? 'rgba(239,68,68,0.12)'   : pct >= 80 ? 'rgba(245,158,11,0.12)' : 'rgba(34,197,94,0.12)'
  const text   = pct > 100 ? '#F87171' : pct >= 80 ? '#FCD34D' : '#4ADE80'
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap"
      style={{ backgroundColor: bg, color: text }}
    >
      {label}
    </span>
  )
}

/* ── TX status badge ─────────────────────────────────────── */
function TxStatusBadge({ status }: { status: TxStatus }) {
  const cfg: Record<TxStatus, { bg: string; text: string; border: string }> = {
    Cleared:     { bg: 'rgba(34,197,94,0.12)',   text: '#4ADE80', border: 'rgba(34,197,94,0.25)'   },
    Pending:     { bg: 'rgba(245,158,11,0.12)',  text: '#FCD34D', border: 'rgba(245,158,11,0.25)'  },
    Reconciled:  { bg: 'rgba(59,130,246,0.12)',  text: '#60A5FA', border: 'rgba(59,130,246,0.25)'  },
  }
  const c = cfg[status]
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border"
      style={{ backgroundColor: c.bg, color: c.text, borderColor: c.border }}
    >
      <span className="w-1 h-1 rounded-full" style={{ backgroundColor: c.text }} />
      {status}
    </span>
  )
}

/* ── KPI stat card ───────────────────────────────────────── */
interface KpiCardProps {
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  label: string
  value: string
  sub: string
  subColor?: string
  barColor?: string
  barPct?: number
}
function KpiCard({ icon, iconBg, iconColor, label, value, sub, subColor, barColor, barPct }: KpiCardProps) {
  return (
    <div className="bg-[#0B1120] border border-[#1A2540] rounded-2xl p-4 flex flex-col gap-3 hover:border-[#2A3A54] transition-colors min-w-0">
      <div className="flex items-start gap-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: iconBg, color: iconColor }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-[#5A6A85] whitespace-nowrap">{label}</p>
          <p className="text-xl font-bold text-[#E8EEF8] tabular-nums leading-tight mt-0.5 truncate">{value}</p>
          <p className="text-xs mt-0.5 truncate" style={{ color: subColor ?? '#5A6A85' }}>{sub}</p>
        </div>
      </div>
      {barColor !== undefined && barPct !== undefined && (
        <div className="h-[3px] bg-[#1A2640] rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${Math.min(barPct, 100)}%`, backgroundColor: barColor }} />
        </div>
      )}
    </div>
  )
}

/* ── Analytics card ──────────────────────────────────────── */
interface AnalyticsCardProps {
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  label: string
  value: string
  sub: string
  valueColor?: string
}
function AnalyticsCard({ icon, iconBg, iconColor, label, value, sub, valueColor }: AnalyticsCardProps) {
  return (
    <div className="bg-[#0B1120] border border-[#1A2540] rounded-xl p-4 hover:border-[#2A3A54] transition-colors min-w-0">
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: iconBg, color: iconColor }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-[#5A6A85] mb-0.5">{label}</p>
          <p className="text-lg font-bold tabular-nums leading-tight" style={{ color: valueColor ?? '#E8EEF8' }}>{value}</p>
          <p className="text-[11px] text-[#5A6A85] mt-0.5 truncate">{sub}</p>
        </div>
      </div>
    </div>
  )
}

/* ── Sort dropdown ───────────────────────────────────────── */
const SORT_OPTIONS = ['Newest', 'Oldest', 'Largest Amount', 'Smallest Amount']

function SortDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-all whitespace-nowrap',
          'border-[#1A2640] bg-[#0D1525] text-[#7A8BA8]',
          'hover:text-[#C8D4E8] hover:border-[#2A3A54]',
          open && 'border-[#6C3AED]/50 text-[#A8B4CC]',
        )}
      >
        <ArrowUpDown size={13} />
        Sort: {value}
        <ChevronDown size={11} />
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 w-48 rounded-lg border border-[#1A2640] bg-[#0D1B2E] shadow-xl z-20 py-1 overflow-hidden">
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false) }}
              className={cn(
                'w-full text-left px-3 py-2 text-sm transition-colors',
                opt === value ? 'bg-[#6C3AED]/20 text-white' : 'text-[#5A6A85] hover:bg-[#131C2E] hover:text-[#A8B4CC]',
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── More dropdown ───────────────────────────────────────── */
function MoreDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#E2EAF4] bg-[#0D1525] border border-[#1A2540] rounded-xl hover:bg-[#111B2D] hover:border-[#2A3A54] transition-all"
      >
        <Zap size={13} />
        More
        <ChevronDown size={11} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 rounded-lg border border-[#1A2640] bg-[#0D1B2E] shadow-xl z-30 py-1 overflow-hidden">
          {['Duplicate Envelope', 'Export Data', 'View History', 'Reset Allocation'].map(item => (
            <button
              key={item}
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#5A6A85] hover:bg-[#131C2E] hover:text-[#A8B4CC] transition-colors"
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Page size dropdown ──────────────────────────────────── */
const PAGE_SIZES = [5, 10, 25]

function PageSizeSelect({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-[#1A2640] text-[#5A6A85] hover:bg-[#131C2E] hover:text-white transition-colors"
      >
        {value} / page <ChevronDown size={10} />
      </button>
      {open && (
        <div className="absolute right-0 bottom-full mb-1 w-32 rounded-lg border border-[#1A2640] bg-[#0D1B2E] shadow-lg z-20 py-1 overflow-hidden">
          {PAGE_SIZES.map(n => (
            <button
              key={n}
              onClick={() => { onChange(n); setOpen(false) }}
              className={cn(
                'w-full text-left px-3 py-1.5 text-sm transition-colors',
                n === value ? 'bg-[#6C3AED]/20 text-white' : 'text-[#5A6A85] hover:bg-[#131C2E] hover:text-white',
              )}
            >
              {n} / page
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Main component ──────────────────────────────────────── */
export function EnvelopeDetails({ envelopeId = 'e1' }: { envelopeId?: string }) {
  const [addTxOpen,    setAddTxOpen]    = useState(false)
  const [modifyOpen,   setModifyOpen]   = useState(false)
  const [archiveOpen,  setArchiveOpen]  = useState(false)
  const [search,       setSearch]       = useState('')
  const [sort,         setSort]         = useState('Newest')
  const [page,         setPage]         = useState(1)
  const [pageSize,     setPageSize]     = useState(5)

  /* Envelope stats */
  const allocated  = 8000
  const spent      = 5200
  const remaining  = allocated - spent
  const pct        = Math.round((spent / allocated) * 100)
  const nature: Nature = 'Need'

  /* Filter + sort transactions */
  const filtered = MOCK_TRANSACTIONS.filter(tx =>
    !search || tx.title.toLowerCase().includes(search.toLowerCase()) ||
    tx.account.toLowerCase().includes(search.toLowerCase()),
  ).sort((a, b) => {
    if (sort === 'Largest Amount') return a.amount - b.amount
    if (sort === 'Smallest Amount') return b.amount - a.amount
    if (sort === 'Oldest') return a.id.localeCompare(b.id)
    return b.id.localeCompare(a.id)
  })

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paged      = filtered.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="space-y-4 min-w-0">

      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-start gap-4">

        {/* Left — icon + title + pills */}
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'radial-gradient(135deg, rgba(34,197,94,0.25) 0%, rgba(34,197,94,0.1) 100%)',
              color: '#4ADE80',
              boxShadow: '0 0 24px rgba(34,197,94,0.2)',
              border: '1px solid rgba(34,197,94,0.25)',
            }}
          >
            <ShoppingCart size={28} />
          </div>
          <div>
            <h1 className="text-[26px] font-bold text-white leading-tight tracking-tight">Groceries</h1>
            <p className="text-[13px] text-[#5A6A85] mt-0.5">Track allocation, spending, and activity</p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <NatureBadge nature={nature} />
              <HealthBadge pct={pct} />
              <span className="text-[12px] text-[#3A4A60]">Last updated: May 15, 2026 at 10:30 AM</span>
            </div>
          </div>
        </div>

        {/* Right — action buttons */}
        <div className="grid grid-cols-2 gap-2 flex-shrink-0">
          <button
            onClick={() => setAddTxOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl transition-all whitespace-nowrap col-span-2 sm:col-span-1"
            style={{
              background: 'linear-gradient(135deg, #6C3AED 0%, #7C4AFF 100%)',
              boxShadow: '0 0 20px rgba(108,58,237,0.35)',
            }}
          >
            <Plus size={15} />
            Add Transaction
          </button>
          <button
            onClick={() => setModifyOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-[#E2EAF4] bg-[#0D1525] border border-[#1A2540] rounded-xl hover:bg-[#111B2D] hover:border-[#2A3A54] transition-all whitespace-nowrap"
          >
            <Pencil size={13} />
            Modify Envelope
          </button>
          <button
            onClick={() => setArchiveOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-[#E2EAF4] bg-[#0D1525] border border-[#1A2540] rounded-xl hover:bg-[#111B2D] hover:border-[#2A3A54] transition-all whitespace-nowrap"
          >
            <Archive size={13} />
            Archive Envelope
          </button>
          <MoreDropdown />
        </div>
      </div>

      {/* ── KPI cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard
          icon={<ReceiptText size={18} />}
          iconBg="rgba(108,58,237,0.18)" iconColor="#A78BFA"
          label="Allocated Amount"
          value={formatCurrency(allocated)}
          sub="From To Be Budgeted"
          barColor="#6C3AED" barPct={100}
        />
        <KpiCard
          icon={<TrendingUp size={18} />}
          iconBg="rgba(59,130,246,0.18)" iconColor="#60A5FA"
          label="Total Spent"
          value={formatCurrency(spent)}
          sub={`${pct}% of allocated`}
          barColor="#3B82F6" barPct={pct}
        />
        <KpiCard
          icon={<Wallet size={18} />}
          iconBg="rgba(34,197,94,0.18)" iconColor="#4ADE80"
          label="Remaining Balance"
          value={formatCurrency(remaining)}
          sub="35% remaining"
          subColor="#4ADE80"
          barColor="#22C55E" barPct={100 - pct}
        />
        <KpiCard
          icon={<Activity size={18} />}
          iconBg="rgba(245,158,11,0.18)" iconColor="#FCD34D"
          label="Monthly Activity"
          value="12"
          sub="Transactions this month"
          barColor="#F59E0B" barPct={60}
        />
        <KpiCard
          icon={<BarChart3 size={18} />}
          iconBg="rgba(139,92,246,0.18)" iconColor="#C084FC"
          label="Average Spending"
          value={formatCurrency(Math.round(spent / 12))}
          sub="Per transaction"
          barColor="#8B5CF6" barPct={45}
        />
      </div>

      {/* ── Envelope overview panel ───────────────────────── */}
      <div
        className="bg-[#0A1020] rounded-2xl p-5"
        style={{
          border: '1px solid rgba(108,58,237,0.35)',
          boxShadow: '0 0 40px rgba(108,58,237,0.08), inset 0 0 40px rgba(108,58,237,0.03)',
        }}
      >
        <div className="flex flex-col lg:flex-row gap-6">

          {/* Left — envelope info */}
          <div className="lg:w-[320px] flex-shrink-0">
            <div className="flex items-start gap-4 mb-4">
              <div
                className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'radial-gradient(135deg, rgba(34,197,94,0.2) 0%, rgba(34,197,94,0.06) 100%)',
                  color: '#4ADE80',
                  boxShadow: '0 0 30px rgba(34,197,94,0.15)',
                  border: '1px solid rgba(34,197,94,0.2)',
                }}
              >
                <ShoppingCart size={32} />
              </div>
              <div>
                <h2 className="text-[20px] font-bold text-white leading-tight">Groceries</h2>
                <p className="text-[13px] text-[#7A8BA8] mt-1 leading-relaxed">Food and groceries for the household.</p>
                <div className="mt-2">
                  <NatureBadge nature={nature} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#1A2540]">
              <div>
                <p className="text-[11px] text-[#5A6A85] mb-1">Created</p>
                <p className="text-sm font-semibold text-[#C8D4E8]">Jan 12, 2026</p>
              </div>
              <div>
                <p className="text-[11px] text-[#5A6A85] mb-1">Last Modified</p>
                <p className="text-sm font-semibold text-[#C8D4E8]">May 15, 2026</p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden lg:block w-px bg-[#1A2540] flex-shrink-0" />

          {/* Right — allocation summary + progress */}
          <div className="flex-1 min-w-0">
            {/* 3 columns */}
            <div className="grid grid-cols-3 gap-4 mb-5">
              <div>
                <p className="text-[11px] text-[#5A6A85] mb-1">Allocated</p>
                <p className="text-2xl font-bold text-white tabular-nums">{formatCurrency(allocated)}</p>
              </div>
              <div>
                <p className="text-[11px] text-[#5A6A85] mb-1">Spent</p>
                <p className="text-2xl font-bold text-white tabular-nums">{formatCurrency(spent)}</p>
              </div>
              <div>
                <p className="text-[11px] text-[#5A6A85] mb-1">Remaining</p>
                <p className="text-2xl font-bold tabular-nums" style={{ color: '#4ADE80' }}>{formatCurrency(remaining)}</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mb-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 bg-[#111C30] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background: 'linear-gradient(90deg, #22C55E, #4ADE80)',
                      boxShadow: '0 0 8px rgba(34,197,94,0.4)',
                    }}
                  />
                </div>
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold flex-shrink-0"
                  style={{ backgroundColor: 'rgba(34,197,94,0.12)', color: '#4ADE80', border: '1px solid rgba(34,197,94,0.2)' }}
                >
                  {pct}% used
                </span>
              </div>
            </div>

            {/* Helper text */}
            <div className="flex items-start gap-1.5">
              <Info size={13} className="text-[#3A4A60] flex-shrink-0 mt-0.5" />
              <p className="text-[12px] text-[#5A6A85] leading-relaxed">
                Money assigned from To Be Budgeted. Spending is calculated automatically from transactions.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Analytics cards ───────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <AnalyticsCard
          icon={<Hash size={16} />}
          iconBg="rgba(108,58,237,0.18)" iconColor="#A78BFA"
          label="Total Transactions"
          value="12"
          sub="This envelope"
        />
        <AnalyticsCard
          icon={<ArrowDownRight size={16} />}
          iconBg="rgba(34,197,94,0.18)" iconColor="#4ADE80"
          label="Largest Transaction"
          value={formatCurrency(1450)}
          sub="Big Basket (May 12)"
        />
        <AnalyticsCard
          icon={<Landmark size={16} />}
          iconBg="rgba(59,130,246,0.18)" iconColor="#60A5FA"
          label="Top Account"
          value="HDFC Checking"
          sub="8 transactions"
          valueColor="#E8EEF8"
        />
        <AnalyticsCard
          icon={<Gauge size={16} />}
          iconBg="rgba(239,68,68,0.18)" iconColor="#F87171"
          label="Spending Frequency"
          value="2.4 / week"
          sub="On average"
        />
        <AnalyticsCard
          icon={<BarChart3 size={16} />}
          iconBg="rgba(139,92,246,0.18)" iconColor="#C084FC"
          label="Average Transaction"
          value={formatCurrency(Math.round(spent / 12))}
          sub="Per transaction"
        />
      </div>

      {/* ── Transactions section ──────────────────────────── */}
      <div className="bg-[#0B1120] border border-[#1A2540] rounded-2xl overflow-hidden">

        {/* Section header + toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-b border-[#1A2540]">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-white">Transactions</h3>
            <p className="text-xs text-[#5A6A85] mt-0.5">All transactions linked to this envelope</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3A4A60] pointer-events-none" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search transactions..."
                className="pl-8 pr-3 py-2 text-xs bg-[#0D1525] border border-[#1A2540] rounded-lg text-white placeholder:text-[#2A3A54] focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/30 focus:border-[#6C3AED] transition-all w-48"
              />
            </div>
            <button className="inline-flex items-center gap-1.5 px-3 py-2 text-xs text-[#7A8BA8] bg-[#0D1525] border border-[#1A2540] rounded-lg hover:text-white hover:border-[#2A3A54] transition-all">
              <Filter size={12} />
              Filter
            </button>
            <SortDropdown value={sort} onChange={v => { setSort(v); setPage(1) }} />
            <button className="inline-flex items-center gap-1.5 px-3 py-2 text-xs text-[#7A8BA8] bg-[#0D1525] border border-[#1A2540] rounded-lg hover:text-white hover:border-[#2A3A54] transition-all">
              <Download size={12} />
              Export
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#0F1A2C] bg-[#080E1A]">
                {[
                  { label: 'Date',            cls: 'w-28' },
                  { label: 'Transaction Title', cls: '' },
                  { label: 'Account',         cls: '' },
                  { label: 'Type',            cls: 'w-24' },
                  { label: 'Amount',          cls: 'w-28 text-right' },
                  { label: 'Running Impact',  cls: 'w-32 text-right' },
                  { label: 'Status',          cls: 'w-28' },
                  { label: 'Actions',         cls: 'w-20 text-right' },
                ].map(({ label, cls }) => (
                  <th
                    key={label}
                    className={cn('px-4 py-3 text-left text-[10px] font-bold text-[#5A6A85] uppercase tracking-wider', cls)}
                  >
                    {label === 'Amount' || label === 'Running Impact' ? (
                      <span className="flex items-center justify-end gap-1">
                        {label} <ChevronDown size={9} />
                      </span>
                    ) : label === 'Date' || label === 'Actions' ? (
                      <span className="flex items-center gap-1">
                        {label} {label !== 'Actions' && <ChevronDown size={9} />}
                      </span>
                    ) : label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0D1525]">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-[#3A4A60] text-sm">
                    No transactions found
                  </td>
                </tr>
              ) : paged.map((tx, i) => (
                <motion.tr
                  key={tx.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="hover:bg-[#0D1828] transition-colors cursor-pointer group"
                >
                  {/* Date */}
                  <td className="px-4 py-3.5 text-[#8A9AB5] whitespace-nowrap">{tx.date}</td>

                  {/* Title */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: '#1E2B42' }}
                      >
                        {tx.title[0]}
                      </div>
                      <span className="text-[#C8D4E8] font-semibold">{tx.title}</span>
                    </div>
                  </td>

                  {/* Account */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5 text-[#8A9AB5]">
                      {tx.accountType === 'bank'
                        ? <Landmark size={12} className="text-[#5A6A85]" />
                        : <Wallet    size={12} className="text-[#5A6A85]" />}
                      {tx.account}
                    </div>
                  </td>

                  {/* Type */}
                  <td className="px-4 py-3.5">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#F87171', border: '1px solid rgba(239,68,68,0.2)' }}
                    >
                      Expense
                    </span>
                  </td>

                  {/* Amount */}
                  <td className="px-4 py-3.5 text-right">
                    <span className="font-bold tabular-nums text-[#F87171]">
                      {formatCurrency(tx.amount)}
                    </span>
                  </td>

                  {/* Running impact */}
                  <td className="px-4 py-3.5 text-right">
                    <span className={cn('tabular-nums font-medium', tx.runningImpact >= 0 ? 'text-[#8A9AB5]' : 'text-[#8A9AB5]')}>
                      {formatCurrency(tx.runningImpact)}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3.5">
                    <TxStatusBadge status={tx.status} />
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button className="p-1.5 rounded-lg text-[#3A4A60] hover:text-[#E8EEF8] hover:bg-[#1E2B42] transition-all">
                        <Edit2 size={13} />
                      </button>
                      <button className="p-1.5 rounded-lg text-[#3A4A60] hover:text-[#E8EEF8] hover:bg-[#1E2B42] transition-all">
                        <MoreHorizontal size={13} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-[#131E30]">
          <span className="text-xs text-[#5A6A85]">
            Showing{' '}
            <span className="font-medium text-[#A8B4CC]">{filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}</span>
            {' '}to{' '}
            <span className="font-medium text-[#A8B4CC]">{Math.min(page * pageSize, filtered.length)}</span>
            {' '}of{' '}
            <span className="font-medium text-[#A8B4CC]">{filtered.length}</span> transactions
          </span>

          <div className="inline-flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-[#1A2640] text-[#5A6A85] hover:bg-[#131C2E] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={cn(
                  'px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors',
                  n === page
                    ? 'text-white border border-[#6C3AED]'
                    : 'border border-[#1A2640] text-[#5A6A85] hover:bg-[#131C2E] hover:text-white',
                )}
                style={n === page ? { background: 'linear-gradient(135deg, #6C3AED, #7C4AFF)' } : undefined}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || totalPages === 0}
              className="p-1.5 rounded-lg border border-[#1A2640] text-[#5A6A85] hover:bg-[#131C2E] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={14} />
            </button>
            <PageSizeSelect value={pageSize} onChange={n => { setPageSize(n); setPage(1) }} />
          </div>
        </div>
      </div>

      {/* ── Bottom notice ─────────────────────────────────── */}
      <div
        className="bg-[#0A1020] rounded-xl px-5 py-4"
        style={{ border: '1px solid rgba(108,58,237,0.2)' }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-start gap-2.5 flex-1">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ backgroundColor: 'rgba(108,58,237,0.15)', color: '#A78BFA' }}
            >
              <Info size={13} />
            </div>
            <p className="text-[12px] text-[#7A8BA8] leading-relaxed">
              Spending is calculated automatically from linked transactions and cannot be edited directly.
            </p>
          </div>
          <div className="hidden sm:block w-px self-stretch bg-[#1A2540]" />
          <p className="text-[12px] text-[#7A8BA8] leading-relaxed flex-1 sm:pl-0">
            Historical transactions remain unchanged even if this envelope is archived.
          </p>
        </div>
      </div>

      {/* ── Modals ────────────────────────────────────────── */}
      <AddTransactionModal
        open={addTxOpen}
        onClose={() => setAddTxOpen(false)}
        defaultType="expense"
      />
      <ModifyEnvelopeModal
        open={modifyOpen}
        onClose={() => setModifyOpen(false)}
      />
      <ArchiveEnvelopeModal
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        envelopeId={envelopeId}
      />
    </div>
  )
}
