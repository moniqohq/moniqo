'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Building2, PiggyBank, CreditCard, Wallet, TrendingUp, TrendingDown, Landmark,
  Plus, ArrowLeftRight, CheckCircle, Edit2, Archive, RotateCcw, Trash2,
  Search, Filter, Eye, EyeOff,
} from 'lucide-react'
import { mockAccounts, mockTransactions, mockBudgets } from '@/mock/data'
import { formatCurrency, cn } from '@/lib/utils'
import type { AccountType } from '@/types'
import { BalanceChart, type ChartPoint } from './BalanceChart'
import { ModifyAccountModal } from './ModifyAccountModal'
import { AddTransactionModal } from '@/components/transactions/AddTransactionModal'
import { ForceDeleteAccountDialog } from './ForceDeleteAccountDialog'

/* ── account metadata & balance history ──────────────── */

const TYPE_META: Record<AccountType, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
  checking:   { icon: <Building2 size={22} />, label: 'Checking',    color: '#3B82F6', bg: 'rgba(59,130,246,0.15)'  },
  savings:    { icon: <PiggyBank  size={22} />, label: 'Savings',    color: '#22C55E', bg: 'rgba(34,197,94,0.15)'   },
  credit:     { icon: <CreditCard size={22} />, label: 'Credit Card',color: '#F87171', bg: 'rgba(239,68,68,0.15)'   },
  cash:       { icon: <Wallet     size={22} />, label: 'Cash',       color: '#F59E0B', bg: 'rgba(245,158,11,0.15)'  },
  investment: { icon: <TrendingUp size={22} />, label: 'Investment', color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)'  },
  loan:       { icon: <Landmark   size={22} />, label: 'Loan',       color: '#EC4899', bg: 'rgba(236,72,153,0.15)'  },
}

interface AccountMeta {
  accountNumber: string
  createdDate: string
  lastActivity: string
  lastReconciled: string
  onBudget: boolean
  requiresReconciliation: boolean
  notes: string
  clearedBalance: number
  unclearedBalance: number
  monthChangePct: number
  balanceHistory: ChartPoint[]
}

const ACCOUNT_META: Record<string, AccountMeta> = {
  a1: {
    accountNumber: '00001234', createdDate: 'Jan 1, 2026', lastActivity: 'May 15, 2026',
    lastReconciled: 'May 1, 2026', onBudget: true, requiresReconciliation: true,
    notes: 'Primary checking account for daily expenses',
    monthChangePct: 3.8,
    clearedBalance: 448500, unclearedBalance: 9750,
    balanceHistory: [
      { date: 'May 15', value: 432000 }, { date: 'May 16', value: 433300 },
      { date: 'May 17', value: 434600 }, { date: 'May 18', value: 435900 },
      { date: 'May 19', value: 437100 }, { date: 'May 20', value: 438400 },
      { date: 'May 21', value: 439700 }, { date: 'May 22', value: 441000 },
      { date: 'May 23', value: 440300 }, { date: 'May 24', value: 439600 },
      { date: 'May 25', value: 438900 }, { date: 'May 26', value: 438100 },
      { date: 'May 27', value: 437400 }, { date: 'May 28', value: 436700 },
      { date: 'May 29', value: 436000 }, { date: 'May 30', value: 438100 },
      { date: 'May 31', value: 440300 }, { date: 'Jun 01', value: 442400 },
      { date: 'Jun 02', value: 444600 }, { date: 'Jun 03', value: 446700 },
      { date: 'Jun 04', value: 448900 }, { date: 'Jun 05', value: 451000 },
      { date: 'Jun 06', value: 452000 }, { date: 'Jun 07', value: 453100 },
      { date: 'Jun 08', value: 454100 }, { date: 'Jun 09', value: 455100 },
      { date: 'Jun 10', value: 456200 }, { date: 'Jun 11', value: 457200 },
      { date: 'Jun 12', value: 458250 },
    ],
  },
  a2: {
    accountNumber: '00005678', createdDate: 'Jan 1, 2026', lastActivity: 'May 14, 2026',
    lastReconciled: 'Apr 30, 2026', onBudget: true, requiresReconciliation: false,
    notes: 'Emergency fund and long-term savings',
    monthChangePct: 5.2,
    clearedBalance: 121500, unclearedBalance: 3500,
    balanceHistory: [
      { date: 'May 15', value: 112000 }, { date: 'May 16', value: 112600 },
      { date: 'May 17', value: 113100 }, { date: 'May 18', value: 113700 },
      { date: 'May 19', value: 114300 }, { date: 'May 20', value: 114900 },
      { date: 'May 21', value: 115400 }, { date: 'May 22', value: 116000 },
      { date: 'May 23', value: 116400 }, { date: 'May 24', value: 116900 },
      { date: 'May 25', value: 117300 }, { date: 'May 26', value: 117700 },
      { date: 'May 27', value: 118100 }, { date: 'May 28', value: 118600 },
      { date: 'May 29', value: 119000 }, { date: 'May 30', value: 119400 },
      { date: 'May 31', value: 119900 }, { date: 'Jun 01', value: 120300 },
      { date: 'Jun 02', value: 120700 }, { date: 'Jun 03', value: 121100 },
      { date: 'Jun 04', value: 121600 }, { date: 'Jun 05', value: 122000 },
      { date: 'Jun 06', value: 122400 }, { date: 'Jun 07', value: 122900 },
      { date: 'Jun 08', value: 123300 }, { date: 'Jun 09', value: 123700 },
      { date: 'Jun 10', value: 124100 }, { date: 'Jun 11', value: 124600 },
      { date: 'Jun 12', value: 125000 },
    ],
  },
  a3: {
    accountNumber: '00009012', createdDate: 'Mar 15, 2026', lastActivity: 'May 13, 2026',
    lastReconciled: 'May 1, 2026', onBudget: true, requiresReconciliation: true,
    notes: 'Used for online and subscription payments',
    monthChangePct: -2.1,
    clearedBalance: -15200, unclearedBalance: -3200,
    balanceHistory: [
      { date: 'May 15', value: 2000 }, { date: 'May 16', value: 2400 },
      { date: 'May 17', value: 2700 }, { date: 'May 18', value: 3100 },
      { date: 'May 19', value: 3400 }, { date: 'May 20', value: 3800 },
      { date: 'May 21', value: 4100 }, { date: 'May 22', value: 4500 },
      { date: 'May 23', value: 4300 }, { date: 'May 24', value: 4100 },
      { date: 'May 25', value: 3900 }, { date: 'May 26', value: 3600 },
      { date: 'May 27', value: 3400 }, { date: 'May 28', value: 3200 },
      { date: 'May 29', value: 3000 }, { date: 'May 30', value: 3400 },
      { date: 'May 31', value: 3900 }, { date: 'Jun 01', value: 4300 },
      { date: 'Jun 02', value: 4700 }, { date: 'Jun 03', value: 5100 },
      { date: 'Jun 04', value: 5600 }, { date: 'Jun 05', value: 6000 },
      { date: 'Jun 06', value: 6300 }, { date: 'Jun 07', value: 6600 },
      { date: 'Jun 08', value: 6800 }, { date: 'Jun 09', value: 7100 },
      { date: 'Jun 10', value: 7400 }, { date: 'Jun 11', value: 7700 },
      { date: 'Jun 12', value: 8000 },
    ],
  },
  a4: {
    accountNumber: '—', createdDate: 'Jan 1, 2026', lastActivity: 'May 14, 2026',
    lastReconciled: '—', onBudget: true, requiresReconciliation: false,
    notes: 'Petty cash for small purchases',
    monthChangePct: -8.7,
    clearedBalance: 4200, unclearedBalance: 0,
    balanceHistory: [
      { date: 'May 15', value: 1500 }, { date: 'May 16', value: 1700 },
      { date: 'May 17', value: 1900 }, { date: 'May 18', value: 2100 },
      { date: 'May 19', value: 2400 }, { date: 'May 20', value: 2600 },
      { date: 'May 21', value: 2800 }, { date: 'May 22', value: 3000 },
      { date: 'May 23', value: 2900 }, { date: 'May 24', value: 2800 },
      { date: 'May 25', value: 2700 }, { date: 'May 26', value: 2600 },
      { date: 'May 27', value: 2500 }, { date: 'May 28', value: 2500 },
      { date: 'May 29', value: 2500 }, { date: 'May 30', value: 2700 },
      { date: 'May 31', value: 3000 }, { date: 'Jun 01', value: 3200 },
      { date: 'Jun 02', value: 3400 }, { date: 'Jun 03', value: 3700 },
      { date: 'Jun 04', value: 3900 }, { date: 'Jun 05', value: 4000 },
      { date: 'Jun 06', value: 4000 }, { date: 'Jun 07', value: 4100 },
      { date: 'Jun 08', value: 4100 }, { date: 'Jun 09', value: 4100 },
      { date: 'Jun 10', value: 4200 }, { date: 'Jun 11', value: 4200 },
      { date: 'Jun 12', value: 4200 },
    ],
  },
  a5: {
    accountNumber: '00003456', createdDate: 'Mar 15, 2026', lastActivity: 'May 12, 2026',
    lastReconciled: 'Apr 30, 2026', onBudget: true, requiresReconciliation: false,
    notes: 'Shared office account for team expenses',
    monthChangePct: 4.6,
    clearedBalance: 69500, unclearedBalance: 4500,
    balanceHistory: [
      { date: 'May 15', value: 66000 }, { date: 'May 16', value: 66600 },
      { date: 'May 17', value: 67100 }, { date: 'May 18', value: 67700 },
      { date: 'May 19', value: 68300 }, { date: 'May 20', value: 68900 },
      { date: 'May 21', value: 69400 }, { date: 'May 22', value: 70000 },
      { date: 'May 23', value: 69700 }, { date: 'May 24', value: 69400 },
      { date: 'May 25', value: 69100 }, { date: 'May 26', value: 68800 },
      { date: 'May 27', value: 68400 }, { date: 'May 28', value: 68200 },
      { date: 'May 29', value: 68000 }, { date: 'May 30', value: 68900 },
      { date: 'May 31', value: 69700 }, { date: 'Jun 01', value: 70600 },
      { date: 'Jun 02', value: 71400 }, { date: 'Jun 03', value: 71700 },
      { date: 'Jun 04', value: 71900 }, { date: 'Jun 05', value: 72000 },
      { date: 'Jun 06', value: 72300 }, { date: 'Jun 07', value: 72600 },
      { date: 'Jun 08', value: 72900 }, { date: 'Jun 09', value: 73200 },
      { date: 'Jun 10', value: 73500 }, { date: 'Jun 11', value: 73700 },
      { date: 'Jun 12', value: 74000 },
    ],
  },
}

/* ── sub-components ──────────────────────────────────── */

function StatCell({ label, value, color, valueSize }: { label: string; value: string; color?: string; valueSize?: string }) {
  return (
    <div>
      <p className="text-xs text-[#5A6A85] mb-0.5">{label}</p>
      <p className={cn(valueSize ?? 'text-base', 'font-bold tabular-nums', color ?? 'text-white')}>{value}</p>
    </div>
  )
}

function MetaCard({ label, value, masked, showMask, onToggleMask, valueColor, multiline }:
  { label: string; value: string; masked?: boolean; showMask?: boolean; onToggleMask?: () => void; valueColor?: string; multiline?: boolean }) {
  return (
    <div className="bg-[#0B1120] border border-[#1A2540] rounded-xl p-3">
      <p className="text-[10px] font-semibold text-[#5A6A85] uppercase tracking-wider mb-1">{label}</p>
      <div className="flex items-center justify-between gap-2">
        <p className={cn('font-semibold', multiline ? 'text-xs line-clamp-2 leading-relaxed' : 'text-sm truncate')} style={{ color: valueColor ?? '#C8D4E8' }}>
          {masked && !showMask ? `••••${value.slice(-4)}` : value}
        </p>
        {masked && onToggleMask && (
          <button onClick={onToggleMask} className="text-[#5A6A85] hover:text-[#A78BFA] transition-colors flex-shrink-0">
            {showMask ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        )}
      </div>
    </div>
  )
}

/* ── main component ──────────────────────────────────── */

interface Props { accountId: string }

export function AccountDetails({ accountId }: Props) {
  const [search,       setSearch]       = useState('')
  const [showAccNum,   setShowAccNum]   = useState(false)
  const [modifyOpen,   setModifyOpen]   = useState(false)
  const [addTxOpen,    setAddTxOpen]    = useState(false)
  const [addTxDefault, setAddTxDefault] = useState<'expense' | 'income' | 'transfer'>('expense')
  const [deleteOpen,   setDeleteOpen]   = useState(false)

  const account = mockAccounts.find(a => a.id === accountId) ?? mockAccounts[0]
  const meta    = ACCOUNT_META[account.id] ?? ACCOUNT_META.a1
  const budget  = mockBudgets.find(b => b.id === account.budgetId)
  const typeMeta = TYPE_META[account.type]

  const allTxns = mockTransactions.filter(t => t.accountId === accountId)
  const filtered = allTxns.filter(t =>
    !search || t.payee.toLowerCase().includes(search.toLowerCase()) ||
    (t.memo ?? '').toLowerCase().includes(search.toLowerCase()),
  )
  const pageTxns = filtered.slice(0, 5)

  return (
    <div className="space-y-4 min-w-0">

      {/* ── Account Header + Balance Overview + Metadata ── */}
      <div className="bg-[#0B1120] border border-[#1A2540] rounded-2xl p-5 space-y-5">

        {/* Account Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg"
              style={{ backgroundColor: typeMeta.bg, color: typeMeta.color, boxShadow: `0 0 20px ${typeMeta.color}25` }}
            >
              {typeMeta.icon}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-bold text-white">{account.name}</h2>
                <span
                  className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                  style={{ backgroundColor: typeMeta.bg, color: typeMeta.color }}
                >
                  {typeMeta.label}
                </span>
                {account.archived && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#1A2540] text-[#5A6A85] border border-[#252F45]">
                    <Archive size={11} />
                    Archived
                  </span>
                )}
              </div>
              {budget && (
                <p className="text-xs text-[#7C4AFF] mt-1 font-medium">{budget.name}</p>
              )}

            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
            {account.archived ? (
              <>
                <button
                  title="Restore Account"
                  onClick={undefined}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#4ADE80] bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.25)] rounded-lg hover:bg-[rgba(34,197,94,0.15)] hover:border-[rgba(34,197,94,0.4)] transition-all"
                >
                  <RotateCcw size={14} />
                  <span className="hidden sm:inline">Restore Account</span>
                </button>
                <button
                  title="Delete Account"
                  onClick={() => setDeleteOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#F87171] bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.25)] rounded-lg hover:bg-[rgba(239,68,68,0.15)] hover:border-[rgba(239,68,68,0.4)] transition-all"
                >
                  <Trash2 size={14} />
                  <span className="hidden sm:inline">Delete Account</span>
                </button>
              </>
            ) : (
              (
                [
                  { icon: <Plus size={14} />, label: 'Add Transaction', onClick: () => { setAddTxDefault('expense'); setAddTxOpen(true) } },
                  { icon: <ArrowLeftRight size={14} />, label: 'Transfer', onClick: () => { setAddTxDefault('transfer'); setAddTxOpen(true) } },
                  { icon: <CheckCircle size={14} />, label: 'Reconcile', onClick: undefined },
                  { icon: <Edit2 size={14} />, label: 'Edit', onClick: () => setModifyOpen(true) },
                  { icon: <Archive size={14} />, label: 'Archive', onClick: undefined },
                ] as { icon: React.ReactNode; label: string; onClick?: () => void }[]
              ).map(({ icon, label, onClick }) => (
                <button
                  key={label}
                  title={label}
                  onClick={onClick}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#E2EAF4] bg-[#0D1525] border border-[#1A2540] rounded-lg hover:text-white hover:bg-[#111B2D] hover:border-[#2A3A54] transition-all"
                >
                  {icon}
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Balance Overview — nested card */}
        <div className="bg-[#060C18] border border-[#1A2540] rounded-xl p-4">
          <div className="flex items-center justify-between mb-5 gap-6">
            <div className="flex items-start gap-14 flex-1 flex-wrap">
              <div className="flex items-start gap-8">
                <div>
                  <p className="text-xs text-[#5A6A85] mb-0.5">Current Balance</p>
                  <p className={cn('text-2xl font-bold tabular-nums', account.balance < 0 ? 'text-[#F87171]' : 'text-white')}>
                    {formatCurrency(account.balance)}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {meta.monthChangePct >= 0
                      ? <TrendingUp size={11} className="text-[#22C55E]" />
                      : <TrendingDown size={11} className="text-[#F87171]" />}
                    <span className={cn('text-[10px] font-medium', meta.monthChangePct >= 0 ? 'text-[#4ADE80]' : 'text-[#F87171]')}>
                      {meta.monthChangePct >= 0 ? '+' : ''}{meta.monthChangePct}% vs last month
                    </span>
                  </div>
                </div>
                <div className="w-px self-stretch bg-[#1A2540] mx-1" />
              </div>
              <StatCell label="Cleared Balance"   value={formatCurrency(meta.clearedBalance)} color="text-[#4ADE80]" />
              <StatCell label="Uncleared Balance" value={formatCurrency(meta.unclearedBalance)} color="text-[#F59E0B]" />
              <StatCell label="Last Reconciled"   value={meta.lastReconciled} valueSize="text-sm" />
            </div>
            <div className="flex-shrink-0 flex flex-col items-end gap-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[rgba(34,197,94,0.1)] text-[#4ADE80] border border-[rgba(34,197,94,0.2)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                Reconciled
              </span>
              <p className="text-[10px] text-[#3A4A60]">Up to {meta.lastReconciled}</p>
            </div>
          </div>
          <BalanceChart data={meta.balanceHistory} />
        </div>

        {/* Account Information */}
        <div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            <MetaCard label="Account Type"           value={typeMeta.label} />
            <MetaCard label="Institution"            value={account.institution ?? 'N/A'} />
            <MetaCard label="Requires Reconciliation" value={meta.requiresReconciliation ? 'Yes' : 'No'} valueColor={meta.requiresReconciliation ? '#86EFAC' : '#FCD34D'} />
            <MetaCard label="On Budget"              value={meta.onBudget ? 'Yes' : 'No'} valueColor={meta.onBudget ? '#4ADE80' : '#F87171'} />
            <MetaCard label="Created Date"           value={meta.createdDate} />
            <MetaCard label="Last Activity"          value={meta.lastActivity} />
            <MetaCard label="Notes"                  value={meta.notes} multiline />
            <MetaCard
              label="Account Number"
              value={meta.accountNumber}
              masked={meta.accountNumber !== '—'}
              showMask={showAccNum}
              onToggleMask={() => setShowAccNum(s => !s)}
            />
          </div>
        </div>

      </div>

      {/* ── Recent Transactions ───────────────────── */}
      <div className="bg-[#0B1120] border border-[#1A2540] rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#1A2540]">
          <h3 className="text-sm font-bold text-white flex-shrink-0">Recent Transactions</h3>
          <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
            <div className="relative flex-1 max-w-[220px]">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6A85] pointer-events-none" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value) }}
                placeholder="Search transactions…"
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#0D1525] border border-[#1A2540] rounded-lg text-white placeholder:text-[#2A3A54] focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/40 focus:border-[#6C3AED] transition-all"
              />
            </div>
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#7A8BA8] bg-[#0D1525] border border-[#1A2540] rounded-lg hover:text-white transition-colors flex-shrink-0">
              <Filter size={12} />
              Filter
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#111B2D]">
                {['Date', 'Payee', 'Category', 'Amount', 'Status'].map(col => (
                  <th key={col} className="px-4 py-2.5 text-left text-[10px] font-bold text-[#5A6A85] uppercase tracking-wider">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0D1525]">
              {pageTxns.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#3A4A60] text-sm">
                    No transactions found
                  </td>
                </tr>
              ) : (
                pageTxns.map(tx => (
                  <motion.tr
                    key={tx.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-[#0D1525] transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 text-[#8A9AB5] whitespace-nowrap">
                      {new Date(tx.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                          style={{ backgroundColor: tx.payeeColor ?? '#1E2B42' }}
                        >
                          {tx.payee[0]}
                        </div>
                        <span className="text-[#C8D4E8] font-medium truncate max-w-[120px]">{tx.payee}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {tx.envelopeName ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                          style={{ backgroundColor: `${tx.envelopeColor ?? '#6C3AED'}20`, color: tx.envelopeColor ?? '#A78BFA' }}>
                          {tx.envelopeIcon} {tx.envelopeName}
                        </span>
                      ) : (
                        <span className="text-[#3A4A60]">—</span>
                      )}
                    </td>
                    <td className={cn('px-4 py-3 font-bold tabular-nums whitespace-nowrap', tx.amount >= 0 ? 'text-[#4ADE80]' : 'text-[#F87171]')}>
                      {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold',
                        tx.cleared
                          ? 'bg-[rgba(34,197,94,0.1)] text-[#4ADE80] border border-[rgba(34,197,94,0.2)]'
                          : 'bg-[rgba(245,158,11,0.1)] text-[#FCD34D] border border-[rgba(245,158,11,0.2)]',
                      )}>
                        <span className={cn('w-1 h-1 rounded-full', tx.cleared ? 'bg-[#22C55E]' : 'bg-[#F59E0B]')} />
                        {tx.cleared ? 'Cleared' : 'Uncleared'}
                      </span>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>


        {allTxns.length === 0 && (
          <div className="px-5 py-8 text-center">
            <p className="text-[#3A4A60] text-sm">No transactions for this account yet.</p>
          </div>
        )}
      </div>

      <ModifyAccountModal
        open={modifyOpen}
        onClose={() => setModifyOpen(false)}
        accountId={accountId}
      />
      <AddTransactionModal
        open={addTxOpen}
        onClose={() => setAddTxOpen(false)}
        defaultType={addTxDefault}
      />
      <ForceDeleteAccountDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        account={{ id: account.id, name: account.name, type: account.type }}
      />
    </div>
  )
}
