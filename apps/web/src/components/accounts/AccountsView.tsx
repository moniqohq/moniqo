'use client'

import { useState } from 'react'
import {
  Wallet, CreditCard, PiggyBank, Plus, Upload, Filter, Search, TrendingUp, TrendingDown, ArrowUpRight,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts'
import { mockAccounts } from '@/mock/data'
import { formatCurrency, formatCurrencyCompact, cn } from '@/lib/utils'
import { AccountNavPanel } from './AccountNavPanel'
import { AccountDetails } from './AccountDetails'
import { AccountInsightsPanel } from './AccountInsightsPanel'

/* ── Summary card ────────────────────────────────────── */

function SparkTooltip({ active, payload }: any) {
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

/* ── main view ───────────────────────────────────────── */

export function AccountsView() {
  const [selectedId, setSelectedId] = useState(mockAccounts[0].id)

  /* summary calculations */
  const cashAndChecking = mockAccounts.filter(a => a.type === 'checking' || a.type === 'cash')
  const totalCash       = cashAndChecking.reduce((s, a) => s + a.balance, 0)

  const creditAccounts  = mockAccounts.filter(a => a.type === 'credit')
  const creditDebt      = Math.abs(creditAccounts.reduce((s, a) => s + Math.min(0, a.balance), 0))

  const savingsAccounts = mockAccounts.filter(a => a.type === 'savings')
  const savingsBalance  = savingsAccounts.reduce((s, a) => s + a.balance, 0)

  const netWorth    = totalCash + savingsBalance - creditDebt
  const totalAssets = totalCash + savingsBalance
  const assetPct    = totalAssets > 0 ? Math.round((totalAssets / (totalAssets + creditDebt)) * 100) : 100

  const summaryCards: SummaryCardProps[] = [
    {
      icon: <Wallet size={24} />, iconColor: '#22C55E', iconBg: 'rgba(34,197,94,0.15)',
      accentColor: '#22C55E',
      label: 'Total Cash Balance',
      value: formatCurrency(totalCash),
      changeLabel: '+2.4% from last month', positive: true,
      sparkData: [{ v: 4200 }, { v: 4500 }, { v: 4100 }, { v: 4800 }, { v: 4600 }, { v: 5000 }, { v: 4900 }, { v: 5300 }, { v: 5100 }, { v: 5400 }],
    },
    {
      icon: <CreditCard size={24} />, iconColor: '#F87171', iconBg: 'rgba(239,68,68,0.15)',
      accentColor: '#F87171',
      label: 'Credit Card Debt',
      value: formatCurrency(creditDebt),
      changeLabel: '−5.2% vs last month', positive: true,
      sparkData: [{ v: 2100 }, { v: 1950 }, { v: 2200 }, { v: 1850 }, { v: 2050 }, { v: 1980 }, { v: 1900 }, { v: 1820 }, { v: 1750 }, { v: 1680 }],
    },
    {
      icon: <PiggyBank size={24} />, iconColor: '#3B82F6', iconBg: 'rgba(59,130,246,0.15)',
      accentColor: '#3B82F6',
      label: 'Savings Balance',
      value: formatCurrency(savingsBalance),
      changeLabel: '+8.1% growth MTD', positive: true,
      sparkData: [{ v: 8000 }, { v: 8400 }, { v: 8200 }, { v: 8900 }, { v: 8700 }, { v: 9200 }, { v: 9000 }, { v: 9600 }, { v: 9400 }, { v: 9800 }],
    },
  ]

  return (
    <div className="layout-page py-6">

      {/* Page title + action */}
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
          <button className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#A8B4CC] rounded-xl border border-[#1A2540] hover:border-[#2A3A54] hover:text-white transition-colors">
            <Filter size={15} />
            Filter
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#A8B4CC] rounded-xl border border-[#1A2540] hover:border-[#2A3A54] hover:text-white transition-colors">
            <Upload size={15} />
            Import
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2.5 mr-2 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-[#5B21B6] to-[#6C3AED] hover:from-[#6C3AED] hover:to-[#7C4AFF] shadow-[0_0_20px_rgba(108,58,237,0.35)] hover:shadow-[0_0_28px_rgba(108,58,237,0.5)] transition-all">
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

        {/* Featured Net Worth card */}
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

          {/* Assets vs Liabilities bar */}
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
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr_256px] items-stretch">
        <AccountNavPanel selectedId={selectedId} onSelect={setSelectedId} />
        <AccountDetails  accountId={selectedId} />
        <AccountInsightsPanel accountId={selectedId} />
      </div>
    </div>
  )
}
