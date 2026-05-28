'use client'

import { useState } from 'react'
import {
  Wallet, CreditCard, PiggyBank, Archive, Plus, TrendingUp, TrendingDown,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { mockAccounts } from '@/mock/data'
import { formatCurrency, cn } from '@/lib/utils'
import { AccountNavPanel } from './AccountNavPanel'
import { AccountDetails } from './AccountDetails'
import { AccountInsightsPanel } from './AccountInsightsPanel'

/* ── Summary card ────────────────────────────────────── */

interface SummaryCardProps {
  icon: React.ReactNode
  iconColor: string
  iconBg: string
  label: string
  value: string
  changeLabel: string
  positive?: boolean
}

function SummaryCard({ icon, iconColor, iconBg, label, value, changeLabel, positive }: SummaryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="bg-[#0B1120] border border-[#1A2540] rounded-2xl p-4 flex items-start gap-3 hover:border-[#2A3A54] transition-colors"
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: iconBg, color: iconColor }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-[#4A5A75] font-medium mb-1">{label}</p>
        <p className="text-lg font-bold text-white tabular-nums truncate">{value}</p>
        <div className="flex items-center gap-1 mt-1">
          {positive !== undefined && (
            positive
              ? <TrendingUp size={11} className="text-[#22C55E] flex-shrink-0" />
              : <TrendingDown size={11} className="text-[#F87171] flex-shrink-0" />
          )}
          <span className={cn('text-[10px] font-medium truncate', positive === undefined ? 'text-[#4A5A75]' : positive ? 'text-[#4ADE80]' : 'text-[#F87171]')}>
            {changeLabel}
          </span>
        </div>
      </div>
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

  const summaryCards: SummaryCardProps[] = [
    {
      icon: <Wallet size={18} />, iconColor: '#22C55E', iconBg: 'rgba(34,197,94,0.15)',
      label: 'Total Cash Balance',
      value: formatCurrency(totalCash),
      changeLabel: '+2.4% from last month', positive: true,
    },
    {
      icon: <CreditCard size={18} />, iconColor: '#F87171', iconBg: 'rgba(239,68,68,0.15)',
      label: 'Credit Card Debt',
      value: formatCurrency(creditDebt),
      changeLabel: '−5.2% vs last month', positive: true,
    },
    {
      icon: <PiggyBank size={18} />, iconColor: '#3B82F6', iconBg: 'rgba(59,130,246,0.15)',
      label: 'Savings Balance',
      value: formatCurrency(savingsBalance),
      changeLabel: '+8.1% growth MTD', positive: true,
    },
    {
      icon: <Archive size={18} />, iconColor: '#8B5CF6', iconBg: 'rgba(139,92,246,0.15)',
      label: 'Archived Accounts',
      value: '0',
      changeLabel: 'No archived accounts', positive: undefined,
    },
  ]

  return (
    <div className="layout-page py-6">

      {/* Page title + action */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Accounts</h1>
          <p className="text-sm text-[#4A5A75] mt-0.5">Manage your financial ledgers and balances</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-[#5B21B6] to-[#6C3AED] hover:from-[#6C3AED] hover:to-[#7C4AFF] shadow-[0_0_20px_rgba(108,58,237,0.35)] hover:shadow-[0_0_28px_rgba(108,58,237,0.5)] transition-all">
          <Plus size={15} />
          Add Account
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 mb-5 lg:grid-cols-4">
        {summaryCards.map(card => (
          <SummaryCard key={card.label} {...card} />
        ))}
      </div>

      {/* 3-column layout */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr_256px] items-start">
        <AccountNavPanel selectedId={selectedId} onSelect={setSelectedId} />
        <AccountDetails  accountId={selectedId} />
        <AccountInsightsPanel accountId={selectedId} />
      </div>
    </div>
  )
}
