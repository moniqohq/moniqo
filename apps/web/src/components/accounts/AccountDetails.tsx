'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Building2, PiggyBank, CreditCard, Wallet, TrendingUp,
  Plus, ArrowLeftRight, CheckCircle, Edit2, Archive,
  Search, Filter, ChevronDown, Eye, EyeOff,
  CalendarDays, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { mockAccounts, mockTransactions, mockBudgets } from '@/mock/data'
import { formatCurrency, cn } from '@/lib/utils'
import type { AccountType } from '@/types'
import { BalanceChart, type ChartPoint } from './BalanceChart'

/* ── account metadata & balance history ──────────────── */

const TYPE_META: Record<AccountType, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
  checking:   { icon: <Building2 size={22} />, label: 'Checking',   color: '#3B82F6', bg: 'rgba(59,130,246,0.15)'  },
  savings:    { icon: <PiggyBank  size={22} />, label: 'Savings',    color: '#22C55E', bg: 'rgba(34,197,94,0.15)'   },
  credit:     { icon: <CreditCard size={22} />, label: 'Credit Card',color: '#F87171', bg: 'rgba(239,68,68,0.15)'   },
  cash:       { icon: <Wallet     size={22} />, label: 'Cash',       color: '#F59E0B', bg: 'rgba(245,158,11,0.15)'  },
  investment: { icon: <TrendingUp size={22} />, label: 'Investment', color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)'  },
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
  balanceHistory: ChartPoint[]
}

const ACCOUNT_META: Record<string, AccountMeta> = {
  a1: {
    accountNumber: '****1234', createdDate: 'Jan 1, 2026', lastActivity: 'May 15, 2026',
    lastReconciled: 'May 1, 2026', onBudget: true, requiresReconciliation: true,
    notes: 'Primary checking account for daily expenses',
    clearedBalance: 455000, unclearedBalance: 3250,
    balanceHistory: [
      { month: 'Jan', value: 380000 }, { month: 'Feb', value: 425000 },
      { month: 'Mar', value: 398000 }, { month: 'Apr', value: 441000 },
      { month: 'May', value: 458250 },
    ],
  },
  a2: {
    accountNumber: '****5678', createdDate: 'Jan 1, 2026', lastActivity: 'May 14, 2026',
    lastReconciled: 'Apr 30, 2026', onBudget: true, requiresReconciliation: false,
    notes: 'Emergency fund and long-term savings',
    clearedBalance: 125000, unclearedBalance: 0,
    balanceHistory: [
      { month: 'Jan', value: 100000 }, { month: 'Feb', value: 108000 },
      { month: 'Mar', value: 112000 }, { month: 'Apr', value: 119000 },
      { month: 'May', value: 125000 },
    ],
  },
  a3: {
    accountNumber: '****9012', createdDate: 'Mar 15, 2026', lastActivity: 'May 13, 2026',
    lastReconciled: 'May 1, 2026', onBudget: true, requiresReconciliation: true,
    notes: 'Used for online and subscription payments',
    clearedBalance: -18400, unclearedBalance: 0,
    balanceHistory: [
      { month: 'Jan', value: -22000 }, { month: 'Feb', value: -19000 },
      { month: 'Mar', value: -24000 }, { month: 'Apr', value: -21000 },
      { month: 'May', value: -18400 },
    ],
  },
  a4: {
    accountNumber: '—', createdDate: 'Jan 1, 2026', lastActivity: 'May 14, 2026',
    lastReconciled: '—', onBudget: true, requiresReconciliation: false,
    notes: 'Petty cash for small purchases',
    clearedBalance: 4200, unclearedBalance: 0,
    balanceHistory: [
      { month: 'Jan', value: 5000 }, { month: 'Feb', value: 3500 },
      { month: 'Mar', value: 6000 }, { month: 'Apr', value: 4800 },
      { month: 'May', value: 4200 },
    ],
  },
  a5: {
    accountNumber: '****3456', createdDate: 'Mar 15, 2026', lastActivity: 'May 12, 2026',
    lastReconciled: 'Apr 30, 2026', onBudget: true, requiresReconciliation: false,
    notes: 'Shared office account for team expenses',
    clearedBalance: 74000, unclearedBalance: 0,
    balanceHistory: [
      { month: 'Jan', value: 68000 }, { month: 'Feb', value: 72000 },
      { month: 'Mar', value: 69000 }, { month: 'Apr', value: 75000 },
      { month: 'May', value: 74000 },
    ],
  },
}

/* ── sub-components ──────────────────────────────────── */

function StatCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p className="text-xs text-[#4A5A75] mb-0.5">{label}</p>
      <p className={cn('text-base font-bold tabular-nums', color ?? 'text-white')}>{value}</p>
    </div>
  )
}

function MetaCard({ label, value, masked, showMask, onToggleMask }:
  { label: string; value: string; masked?: boolean; showMask?: boolean; onToggleMask?: () => void }) {
  return (
    <div className="bg-[#0B1120] border border-[#1A2540] rounded-xl p-3">
      <p className="text-[10px] font-semibold text-[#3A4A60] uppercase tracking-wider mb-1">{label}</p>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[#C8D4E8] truncate">
          {masked && !showMask ? '••••••••' : value}
        </p>
        {masked && onToggleMask && (
          <button onClick={onToggleMask} className="text-[#4A5A75] hover:text-[#A78BFA] transition-colors flex-shrink-0">
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
  const [search,     setSearch]     = useState('')
  const [showAccNum, setShowAccNum] = useState(false)
  const [page,       setPage]       = useState(1)
  const PER_PAGE = 6

  const account = mockAccounts.find(a => a.id === accountId) ?? mockAccounts[0]
  const meta    = ACCOUNT_META[account.id] ?? ACCOUNT_META.a1
  const budget  = mockBudgets.find(b => b.id === account.budgetId)
  const typeMeta = TYPE_META[account.type]

  const allTxns = mockTransactions.filter(t => t.accountId === accountId)
  const filtered = allTxns.filter(t =>
    !search || t.payee.toLowerCase().includes(search.toLowerCase()) ||
    (t.memo ?? '').toLowerCase().includes(search.toLowerCase()),
  )
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const pageTxns = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  return (
    <div className="space-y-4 min-w-0">

      {/* ── Account Header ───────────────────────── */}
      <div className="bg-[#0B1120] border border-[#1A2540] rounded-2xl p-5">
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
              </div>
              {budget && (
                <p className="text-xs text-[#4A5A75] mt-1">{budget.name}</p>
              )}
              {account.institution && (
                <p className="text-xs text-[#4A5A75]">{account.institution}</p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
            {[
              { icon: <Plus size={14} />, label: 'Add Transaction' },
              { icon: <ArrowLeftRight size={14} />, label: 'Transfer' },
              { icon: <CheckCircle size={14} />, label: 'Reconcile' },
              { icon: <Edit2 size={14} />, label: 'Edit' },
              { icon: <Archive size={14} />, label: 'Archive' },
            ].map(({ icon, label }) => (
              <button
                key={label}
                title={label}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#A8B4CC] bg-[#0D1525] border border-[#1A2540] rounded-lg hover:text-white hover:bg-[#111B2D] hover:border-[#2A3A54] transition-all"
              >
                {icon}
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Balance Overview ─────────────────────── */}
      <div className="bg-[#0B1120] border border-[#1A2540] rounded-2xl p-5">
        <div className="flex items-start justify-between mb-5">
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 flex-1">
            <StatCell label="Current Balance"  value={formatCurrency(account.balance)} color={account.balance < 0 ? 'text-[#F87171]' : 'text-white'} />
            <StatCell label="Last Reconciled"   value={meta.lastReconciled} />
            <StatCell label="Cleared Balance"   value={formatCurrency(meta.clearedBalance)} />
            <StatCell label="Uncleared Balance" value={formatCurrency(meta.unclearedBalance)} />
          </div>
          <div className="flex-shrink-0 ml-4">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[rgba(34,197,94,0.1)] text-[#4ADE80] border border-[rgba(34,197,94,0.2)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
              Reconciled
            </span>
          </div>
        </div>

        {/* Balance Chart */}
        <div className="bg-[#060C18] border border-[#111B2D] rounded-xl p-3">
          <p className="text-[10px] font-semibold text-[#3A4A60] uppercase tracking-wider mb-3">Balance History (5 months)</p>
          <BalanceChart data={meta.balanceHistory} />
        </div>
      </div>

      {/* ── Account Metadata Grid ─────────────────── */}
      <div className="bg-[#0B1120] border border-[#1A2540] rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-3">Account Information</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          <MetaCard label="Account Type"           value={typeMeta.label} />
          <MetaCard label="Institution"            value={account.institution ?? 'N/A'} />
          <MetaCard label="Requires Reconciliation" value={meta.requiresReconciliation ? 'Yes' : 'No'} />
          <MetaCard label="On Budget"              value={meta.onBudget ? 'Yes' : 'No'} />
          <MetaCard label="Created Date"           value={meta.createdDate} />
          <MetaCard label="Last Activity"          value={meta.lastActivity} />
          <MetaCard label="Notes"                  value={meta.notes} />
          <MetaCard
            label="Account Number"
            value={meta.accountNumber}
            masked={meta.accountNumber !== '—'}
            showMask={showAccNum}
            onToggleMask={() => setShowAccNum(s => !s)}
          />
        </div>
      </div>

      {/* ── Recent Transactions ───────────────────── */}
      <div className="bg-[#0B1120] border border-[#1A2540] rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#1A2540]">
          <h3 className="text-sm font-bold text-white flex-shrink-0">Recent Transactions</h3>
          <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
            <div className="relative flex-1 max-w-[220px]">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A5A75] pointer-events-none" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search transactions…"
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#0D1525] border border-[#1A2540] rounded-lg text-white placeholder:text-[#2A3A54] focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/40 focus:border-[#6C3AED] transition-all"
              />
            </div>
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#7A8BA8] bg-[#0D1525] border border-[#1A2540] rounded-lg hover:text-white transition-colors flex-shrink-0">
              <Filter size={12} />
              Filter
            </button>
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#7A8BA8] bg-[#0D1525] border border-[#1A2540] rounded-lg hover:text-white transition-colors flex-shrink-0">
              <CalendarDays size={12} />
              May 2026
              <ChevronDown size={11} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#111B2D]">
                {['Date', 'Payee', 'Category', 'Amount', 'Status'].map(col => (
                  <th key={col} className="px-4 py-2.5 text-left text-[10px] font-bold text-[#3A4A60] uppercase tracking-wider">
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
                    <td className="px-4 py-3 text-[#5A6A85] whitespace-nowrap">
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-[#111B2D]">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg text-[#5A6A85] hover:text-white hover:bg-[#0D1525] disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={cn(
                  'w-7 h-7 rounded-lg text-xs font-semibold transition-colors',
                  page === n
                    ? 'bg-[#6C3AED] text-white'
                    : 'text-[#5A6A85] hover:bg-[#0D1525] hover:text-white',
                )}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg text-[#5A6A85] hover:text-white hover:bg-[#0D1525] disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}

        {allTxns.length === 0 && (
          <div className="px-5 py-8 text-center">
            <p className="text-[#3A4A60] text-sm">No transactions for this account yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}
