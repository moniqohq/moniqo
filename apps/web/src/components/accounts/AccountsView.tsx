'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import {
  Wallet, CreditCard, PiggyBank, Plus, Upload, Filter, Search,
  TrendingUp, TrendingDown, ArrowUpRight, Check,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts'
import { mockAccounts } from '@/mock/data'
import { formatCurrency, formatCurrencyCompact, cn } from '@/lib/utils'
import { AccountNavPanel } from './AccountNavPanel'
import { AccountDetails } from './AccountDetails'
import { AccountInsightsPanel } from './AccountInsightsPanel'
import { AddAccountModal } from './AddAccountModal'
import type { AccountType } from '@/types'

/* ── Filter types ─────────────────────────────────────── */

type StatusFilter = 'active' | 'archived' | 'all'
type TypeFilter   = 'all' | AccountType

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'active',   label: 'Active Accounts' },
  { value: 'archived', label: 'Archived Accounts' },
  { value: 'all',      label: 'All Accounts' },
]

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: 'all',        label: 'All Types' },
  { value: 'checking',   label: 'Checking' },
  { value: 'savings',    label: 'Savings' },
  { value: 'cash',       label: 'Cash' },
  { value: 'credit',     label: 'Credit Card' },
  { value: 'loan',       label: 'Loan' },
]

/* ── Filter dropdown ──────────────────────────────────── */

interface FilterDropdownProps {
  statusFilter: StatusFilter
  typeFilter: TypeFilter
  onStatusChange: (v: StatusFilter) => void
  onTypeChange: (v: TypeFilter) => void
}

function FilterDropdown({ statusFilter, typeFilter, onStatusChange, onTypeChange }: FilterDropdownProps) {
  const [open, setOpen]  = useState(false)
  const ref              = useRef<HTMLDivElement>(null)
  const activeCount      = (statusFilter !== 'active' ? 1 : 0) + (typeFilter !== 'all' ? 1 : 0)

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border transition-colors',
          open || activeCount > 0
            ? 'text-[#C4B5FD] border-[rgba(108,58,237,0.5)] bg-[rgba(108,58,237,0.08)]'
            : 'text-[#A8B4CC] border-[#1A2540] hover:border-[#2A3A54] hover:text-white',
        )}
      >
        <Filter size={15} />
        Filter
        {activeCount > 0 && (
          <span className="flex items-center justify-center w-4 h-4 text-[10px] font-bold rounded-full bg-[#6C3AED] text-white leading-none">
            {activeCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-1.5 z-50 w-52 bg-[#0F1623] border border-[#1E2B42] rounded-xl shadow-2xl overflow-hidden"
          >
            {/* Account Status section */}
            <div className="px-3 pt-3 pb-1">
              <p className="text-[10px] font-bold text-[#3A4A60] uppercase tracking-widest mb-1.5">
                Account Status
              </p>
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => onStatusChange(opt.value)}
                  className={cn(
                    'w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-colors text-left',
                    statusFilter === opt.value
                      ? 'text-white bg-[rgba(108,58,237,0.15)]'
                      : 'text-[#A8B4CC] hover:text-white hover:bg-[#1A2540]',
                  )}
                >
                  {opt.label}
                  {statusFilter === opt.value && (
                    <Check size={13} className="text-[#A78BFA] flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>

            {/* Separator */}
            <div className="mx-3 my-2 h-px bg-[#1E2B42]" />

            {/* Account Type section */}
            <div className="px-3 pb-3 pt-1">
              <p className="text-[10px] font-bold text-[#3A4A60] uppercase tracking-widest mb-1.5">
                Account Type
              </p>
              {TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => onTypeChange(opt.value)}
                  className={cn(
                    'w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-colors text-left',
                    typeFilter === opt.value
                      ? 'text-white bg-[rgba(108,58,237,0.15)]'
                      : 'text-[#A8B4CC] hover:text-white hover:bg-[#1A2540]',
                  )}
                >
                  {opt.label}
                  {typeFilter === opt.value && (
                    <Check size={13} className="text-[#A78BFA] flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>

            {/* Clear link */}
            {activeCount > 0 && (
              <>
                <div className="mx-3 h-px bg-[#1E2B42]" />
                <div className="px-3 py-2">
                  <button
                    onClick={() => { onStatusChange('active'); onTypeChange('all') }}
                    className="text-xs text-[#5A6A85] hover:text-[#A78BFA] transition-colors"
                  >
                    Clear all filters
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Summary card ────────────────────────────────────── */

function SparkTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number; dataKey?: string; name?: string }> }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#131C2E] border border-[#1E2B42] rounded px-2 py-1 text-[11px] text-white shadow-xl">
      {formatCurrencyCompact(payload[0].value)}
    </div>
  )
}

interface SummaryCardProps {
  icon: React.ReactNode
  iconColor: string
  iconBg: string
  accentColor?: string
  label: string
  value: string
  changeLabel: string
  positive?: boolean
  sparkData?: { v: number }[]
}

function SummaryCard({ icon, iconColor, iconBg, accentColor = '#6C3AED', label, value, changeLabel, positive, sparkData }: SummaryCardProps) {
  const gradId = `spark-${label.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="bg-[#0B1120] border border-[#1A2540] rounded-2xl p-4 flex flex-col gap-3 hover:border-[#2A3A54] transition-colors"
    >
      <div className="flex items-start gap-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: iconBg, color: iconColor }}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-[#5A6A85] font-medium mb-1">{label}</p>
          <p className="text-lg font-bold text-white tabular-nums truncate">{value}</p>
          <div className="flex items-center gap-1 mt-1">
            {positive !== undefined && (
              positive
                ? <TrendingUp size={11} className="text-[#22C55E] flex-shrink-0" />
                : <TrendingDown size={11} className="text-[#F87171] flex-shrink-0" />
            )}
            <span className={cn('text-[10px] font-medium truncate', positive === undefined ? 'text-[#5A6A85]' : positive ? 'text-[#4ADE80]' : 'text-[#F87171]')}>
              {changeLabel}
            </span>
          </div>
        </div>
      </div>

      {sparkData && (
        <div className="h-12 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accentColor} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={accentColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip content={<SparkTooltip />} />
              <Area
                type="monotone"
                dataKey="v"
                stroke={accentColor}
                strokeWidth={1.5}
                fill={`url(#${gradId})`}
                dot={false}
                activeDot={{ r: 3, fill: accentColor, stroke: '#080C14', strokeWidth: 1.5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  )
}

/* ── Empty state ─────────────────────────────────────── */

function EmptyState({ status, hasTypeFilter }: { status: StatusFilter; hasTypeFilter: boolean }) {
  const content =
    hasTypeFilter
      ? { title: 'No matching accounts', desc: 'Try changing your filter selections.' }
      : status === 'archived'
        ? { title: 'No archived accounts', desc: 'Archived accounts will appear here when you archive an account.' }
        : { title: 'No active accounts found', desc: 'Try adjusting your filters or create a new account.' }

  return (
    <div className="bg-[#0B1120] border border-[#1A2540] rounded-2xl flex flex-col items-center justify-center py-16 px-6 text-center">
      <p className="text-base font-semibold text-[#A8B4CC] mb-1">{content.title}</p>
      <p className="text-sm text-[#5A6A85]">{content.desc}</p>
    </div>
  )
}

/* ── main view ───────────────────────────────────────── */

export function AccountsView() {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()

  const initialStatus = (searchParams.get('status') ?? 'active') as StatusFilter
  const initialType   = (searchParams.get('type')   ?? 'all')    as TypeFilter

  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatus)
  const [typeFilter,   setTypeFilter]   = useState<TypeFilter>(initialType)
  const [addModalOpen, setAddModalOpen] = useState(false)

  /* Filtered accounts */
  const filteredAccounts = mockAccounts.filter(account => {
    const statusMatch =
      statusFilter === 'all'      ? true :
      statusFilter === 'archived' ? !!account.archived :
      !account.archived

    const typeMatch = typeFilter === 'all' || account.type === typeFilter

    return statusMatch && typeMatch
  })

  const [selectedId, setSelectedId] = useState(
    filteredAccounts[0]?.id ?? mockAccounts[0].id,
  )

  /* Auto-select first visible account when filters change */
  useEffect(() => {
    if (!filteredAccounts.find(a => a.id === selectedId) && filteredAccounts.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedId(filteredAccounts[0].id)
    }
  }, [filteredAccounts, selectedId])

  /* Sync filters to URL */
  function updateFilter(key: 'status' | 'type', value: string) {
    const params = new URLSearchParams(searchParams.toString())
    const isDefault = (key === 'status' && value === 'active') || (key === 'type' && value === 'all')
    if (isDefault) params.delete(key)
    else params.set(key, value)
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  function handleStatusChange(v: StatusFilter) {
    setStatusFilter(v)
    updateFilter('status', v)
  }

  function handleTypeChange(v: TypeFilter) {
    setTypeFilter(v)
    updateFilter('type', v)
  }

  /* Summary calculations — always from all active accounts */
  const allActive       = mockAccounts.filter(a => !a.archived)
  const cashAndChecking = allActive.filter(a => a.type === 'checking' || a.type === 'cash')
  const totalCash       = cashAndChecking.reduce((s, a) => s + a.balance, 0)
  const creditAccounts  = allActive.filter(a => a.type === 'credit')
  const creditDebt      = Math.abs(creditAccounts.reduce((s, a) => s + Math.min(0, a.balance), 0))
  const savingsAccounts = allActive.filter(a => a.type === 'savings')
  const savingsBalance  = savingsAccounts.reduce((s, a) => s + a.balance, 0)
  const netWorth        = totalCash + savingsBalance - creditDebt
  const totalAssets     = totalCash + savingsBalance
  const assetPct        = totalAssets > 0 ? Math.round((totalAssets / (totalAssets + creditDebt)) * 100) : 100

  const summaryCards: SummaryCardProps[] = [
    {
      icon: <Wallet size={24} />, iconColor: '#22C55E', iconBg: 'rgba(34,197,94,0.15)',
      accentColor: '#22C55E', label: 'Total Cash Balance',
      value: formatCurrency(totalCash), changeLabel: '+2.4% from last month', positive: true,
      sparkData: [{ v: 4200 }, { v: 4500 }, { v: 4100 }, { v: 4800 }, { v: 4600 }, { v: 5000 }, { v: 4900 }, { v: 5300 }, { v: 5100 }, { v: 5400 }],
    },
    {
      icon: <CreditCard size={24} />, iconColor: '#F87171', iconBg: 'rgba(239,68,68,0.15)',
      accentColor: '#F87171', label: 'Credit Card Debt',
      value: formatCurrency(creditDebt), changeLabel: '−5.2% vs last month', positive: true,
      sparkData: [{ v: 2100 }, { v: 1950 }, { v: 2200 }, { v: 1850 }, { v: 2050 }, { v: 1980 }, { v: 1900 }, { v: 1820 }, { v: 1750 }, { v: 1680 }],
    },
    {
      icon: <PiggyBank size={24} />, iconColor: '#3B82F6', iconBg: 'rgba(59,130,246,0.15)',
      accentColor: '#3B82F6', label: 'Savings Balance',
      value: formatCurrency(savingsBalance), changeLabel: '+8.1% growth MTD', positive: true,
      sparkData: [{ v: 8000 }, { v: 8400 }, { v: 8200 }, { v: 8900 }, { v: 8700 }, { v: 9200 }, { v: 9000 }, { v: 9600 }, { v: 9400 }, { v: 9800 }],
    },
  ]

  const selectedAccount = filteredAccounts.find(a => a.id === selectedId) ?? filteredAccounts[0]

  return (
    <div className="layout-page py-6">

      {/* Page header */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Accounts</h1>
          <p className="text-sm text-[#5A6A85] mt-0.5">Manage your financial ledgers and balances</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6A85]" />
            <input
              type="text"
              placeholder="Search accounts…"
              className="pl-8 pr-3 py-2.5 text-sm text-[#A8B4CC] bg-transparent border border-[#1A2540] rounded-xl w-72 placeholder-[#5A6A85] focus:outline-none focus:border-[#2A3A54] hover:border-[#2A3A54] transition-colors"
            />
          </div>
          <FilterDropdown
            statusFilter={statusFilter}
            typeFilter={typeFilter}
            onStatusChange={handleStatusChange}
            onTypeChange={handleTypeChange}
          />
          <button className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#A8B4CC] rounded-xl border border-[#1A2540] hover:border-[#2A3A54] hover:text-white transition-colors">
            <Upload size={15} />
            Import
          </button>
          <button
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 mr-2 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-[#5B21B6] to-[#6C3AED] hover:from-[#6C3AED] hover:to-[#7C4AFF] shadow-[0_0_20px_rgba(108,58,237,0.35)] hover:shadow-[0_0_28px_rgba(108,58,237,0.5)] transition-all"
          >
            <Plus size={15} />
            Add Account
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 mb-4 lg:grid-cols-[1fr_1fr_1fr_1.6fr]">
        {summaryCards.map(card => (
          <SummaryCard key={card.label} {...card} />
        ))}

        {/* Net Worth card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.05 }}
          className="bg-[#0B1120] border border-[#1A2540] rounded-2xl p-4 hover:border-[#2A3A54] transition-colors flex flex-col justify-between"
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs text-[#5A6A85] font-medium mb-1">Net Worth</p>
              <p className="text-2xl font-bold text-white tabular-nums">{formatCurrency(netWorth)}</p>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp size={11} className="text-[#22C55E]" />
                <span className="text-[10px] font-medium text-[#4ADE80]">+3.8% this month</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(108,58,237,0.15)', color: '#6C3AED' }}>
              <ArrowUpRight size={18} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[10px] text-[#5A6A85] mb-1.5">
              <span>Assets <span className="text-[#22C55E] font-semibold">{formatCurrency(totalAssets)}</span></span>
              <span>Liabilities <span className="text-[#F87171] font-semibold">{formatCurrency(creditDebt)}</span></span>
            </div>
            <div className="h-1.5 rounded-full bg-[#1A2540] overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-[#22C55E] to-[#3B82F6]" style={{ width: `${assetPct}%` }} />
            </div>
            <p className="text-[10px] text-[#5A6A85] mt-1.5">{assetPct}% assets · {100 - assetPct}% liabilities</p>
          </div>
        </motion.div>
      </div>

      {/* 3-column layout */}
      {filteredAccounts.length === 0 ? (
        <EmptyState status={statusFilter} hasTypeFilter={typeFilter !== 'all'} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr_256px] items-stretch">
          <AccountNavPanel
            accounts={filteredAccounts}
            selectedId={selectedAccount?.id ?? ''}
            onSelect={setSelectedId}
          />
          <AccountDetails accountId={selectedAccount?.id ?? ''} />
          <AccountInsightsPanel accountId={selectedAccount?.id ?? ''} budgetId={selectedAccount?.budgetId ?? ''} />
        </div>
      )}

      <AddAccountModal open={addModalOpen} onClose={() => setAddModalOpen(false)} />
    </div>
  )
}
