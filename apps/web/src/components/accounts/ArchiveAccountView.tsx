'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle, Archive, ArrowLeftRight, Building2, Calendar,
  CheckCircle2, ChevronRight, CreditCard, Download, Landmark,
  PiggyBank, RefreshCw, ShieldCheck, TrendingUp, Wallet, X,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { cn, formatCurrency } from '@/lib/utils'
import { mockAccounts, mockBudgets } from '@/mock/data'
import type { AccountType } from '@/types'

/* ── Constants ───────────────────────────────────────────── */

const TYPE_META: Record<AccountType, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
  checking:   { icon: <Building2 size={20} />, label: 'Checking',    color: '#3B82F6', bg: 'rgba(59,130,246,0.15)'  },
  savings:    { icon: <PiggyBank  size={20} />, label: 'Savings',    color: '#22C55E', bg: 'rgba(34,197,94,0.15)'   },
  credit:     { icon: <CreditCard size={20} />, label: 'Credit',     color: '#F87171', bg: 'rgba(239,68,68,0.15)'   },
  cash:       { icon: <Wallet     size={20} />, label: 'Cash',       color: '#F59E0B', bg: 'rgba(245,158,11,0.15)'  },
  investment: { icon: <TrendingUp size={20} />, label: 'Investment', color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)'  },
  loan:       { icon: <Landmark   size={20} />, label: 'Loan',       color: '#EC4899', bg: 'rgba(236,72,153,0.15)'  },
}

const CHART_DATA = [
  { date: "Jan '24", value: 0 },
  { date: "Feb '24", value: 3200 },
  { date: "Mar '24", value: 5800 },
  { date: "Apr '24", value: 8400 },
  { date: "May '24", value: 2450 },
]

const ARCHIVE_TRANSACTIONS = [
  { id: 'at1', date: 'May 15, 2024', payee: 'Interest Credit',         category: 'Income',       amount:  250     },
  { id: 'at2', date: 'May 10, 2024', payee: 'Swiggy',                  category: 'Food & Dining', amount: -620     },
  { id: 'at3', date: 'May 6, 2024',  payee: 'ATM Withdrawal',           category: 'Cash & ATM',   amount: -5000    },
  { id: 'at4', date: 'May 5, 2024',  payee: 'Transfer to HDFC Checking', category: 'Transfers',  amount: -2000    },
  { id: 'at5', date: 'Apr 28, 2024', payee: 'Salary Deposit',           category: 'Income',       amount:  75000   },
  { id: 'at6', date: 'Apr 20, 2024', payee: 'DMart',                    category: 'Groceries',    amount: -2345.50 },
]

/* ── Balance chart ───────────────────────────────────────── */

function BalanceOverTimeChart() {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={CHART_DATA} margin={{ top: 10, right: 16, bottom: 0, left: 8 }}>
        <CartesianGrid strokeDasharray="3 4" stroke="#1A2540" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: '#3A4A60' }}
          axisLine={false}
          tickLine={false}
          dy={6}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#3A4A60' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`}
          width={48}
          domain={[0, 10000]}
          ticks={[0, 5000, 10000]}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null
            return (
              <div className="bg-[#131C2E] border border-[#1E2B42] rounded-lg px-3 py-2 text-xs shadow-xl">
                <p className="text-[#5A6A85] mb-1">{label}</p>
                <p className="font-bold text-white">{formatCurrency(payload[0].value as number)}</p>
              </div>
            )
          }}
          cursor={{ stroke: '#2A3A54', strokeWidth: 1 }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#7C3AED"
          strokeWidth={2}
          dot={{ r: 4, fill: '#080C14', stroke: '#7C3AED', strokeWidth: 1.5 }}
          activeDot={{ r: 5, fill: '#A78BFA', stroke: '#080C14', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

/* ── Confirmation Dialog ─────────────────────────────────── */

function ArchiveConfirmationDialog({
  accountName,
  balance,
  txCount,
  lastActivity,
  onClose,
  onConfirm,
}: {
  accountName: string
  balance: number
  txCount: number
  lastActivity: string
  onClose: () => void
  onConfirm: () => void
}) {
  const [understood, setUnderstood] = useState(false)

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.2 }}
        className="relative w-[400px] bg-[#0F1623] border border-[#1E2B42] rounded-2xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E2B42]">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(108,58,237,0.15)' }}
          >
            <Archive size={16} className="text-[#6C3AED]" />
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-[#5A6A85] hover:text-[#A8B4CC] hover:bg-[#1E2B42] transition-all"
          >
            <X size={14} />
          </button>
        </div>

        <div className="px-5 py-4">
          <h2 className="text-[16px] font-bold text-[#E8EEF8]">Archive this account?</h2>
          <p className="text-[12px] text-[#5A6A85] mt-1">You can restore archived accounts later if needed.</p>

          {/* Summary rows */}
          <div className="mt-4 rounded-xl border border-[#1E2B42] bg-[#080C14] overflow-hidden">
            {[
              { label: 'Account Name',     value: accountName,              accent: false },
              { label: 'Current Balance',  value: formatCurrency(balance),  accent: balance > 0 },
              { label: 'Transaction Count', value: String(txCount),         accent: false },
              { label: 'Last Activity',    value: lastActivity,             accent: false },
            ].map(row => (
              <div
                key={row.label}
                className="flex items-center justify-between px-4 py-2.5 border-b border-[#1E2B42]/60 last:border-0"
              >
                <span className="text-[12px] text-[#5A6A85]">{row.label}</span>
                <span className={cn(
                  'text-[12px] font-semibold',
                  row.accent ? 'text-[#F59E0B]' : 'text-[#E8EEF8]',
                )}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          {/* Checkbox */}
          <label className="flex items-start gap-3 mt-4 cursor-pointer" onClick={() => setUnderstood(v => !v)}>
            <div className={cn(
              'w-4 h-4 rounded flex items-center justify-center border-2 transition-all shrink-0 mt-0.5',
              understood ? 'bg-[#6C3AED] border-[#6C3AED]' : 'bg-transparent border-[#2A3A54]',
            )}>
              {understood && <CheckCircle2 size={10} className="text-white" />}
            </div>
            <span className="text-[12px] text-[#A8B4CC] leading-relaxed select-none">
              I understand this account will become read-only.
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-5 py-4 border-t border-[#1E2B42]">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-[13px] font-medium text-[#A8B4CC] border border-[#1E2B42] hover:border-[#2A3A54] hover:text-[#E8EEF8] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={understood ? onConfirm : undefined}
            disabled={!understood}
            className={cn(
              'flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-all',
              understood
                ? 'text-white shadow-lg shadow-purple-900/20'
                : 'text-[#6C3AED]/40 cursor-not-allowed',
            )}
            style={
              understood
                ? { background: 'linear-gradient(135deg, #6C3AED, #7C4AFF)' }
                : { background: 'rgba(108,58,237,0.15)' }
            }
          >
            Archive Account
          </button>
        </div>
      </motion.div>
    </div>
  )
}

/* ── Success Dialog ──────────────────────────────────────── */

function ArchiveSuccessDialog({
  accountName,
  onViewArchived,
  onReturn,
}: {
  accountName: string
  onViewArchived: () => void
  onReturn: () => void
}) {
  const archivedOn = new Date().toLocaleString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.2 }}
        className="relative w-[400px] bg-[#0F1623] border border-[#1E2B42] rounded-2xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onReturn}
          className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg text-[#5A6A85] hover:text-[#A8B4CC] hover:bg-[#1E2B42] transition-all z-10"
        >
          <X size={14} />
        </button>

        <div className="flex flex-col items-center px-5 pt-8 pb-4 text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
            style={{ background: 'rgba(34,197,94,0.15)', border: '2px solid rgba(34,197,94,0.3)' }}
          >
            <CheckCircle2 size={28} className="text-[#22C55E]" />
          </div>
          <h2 className="text-[18px] font-bold text-[#E8EEF8]">Account Archived</h2>
          <p className="text-[12px] text-[#5A6A85] mt-1">Your account history has been safely preserved.</p>
        </div>

        <div className="px-5 pb-4">
          <div className="rounded-xl border border-[#1E2B42] bg-[#080C14] overflow-hidden">
            {[
              { label: 'Account Name', value: accountName },
              { label: 'Archived On',  value: archivedOn  },
            ].map(row => (
              <div
                key={row.label}
                className="flex items-center justify-between px-4 py-2.5 border-b border-[#1E2B42]/60 last:border-0"
              >
                <span className="text-[12px] text-[#5A6A85]">{row.label}</span>
                <span className="text-[12px] font-semibold text-[#E8EEF8]">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 px-5 pb-5">
          <button
            onClick={onViewArchived}
            className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #6C3AED, #7C4AFF)' }}
          >
            View Archived Accounts
          </button>
          <button
            onClick={onReturn}
            className="flex-1 py-2.5 rounded-xl text-[13px] font-medium text-[#A8B4CC] border border-[#1E2B42] hover:border-[#2A3A54] hover:text-[#E8EEF8] transition-all"
          >
            Return to Accounts
          </button>
        </div>
      </motion.div>
    </div>
  )
}

/* ── Main View ───────────────────────────────────────────── */

interface ChecklistItem {
  id: string
  label: string
  description: string
  checked: boolean
}

interface Props {
  budgetId: string
  accountId: string
}

export function ArchiveAccountView({ budgetId, accountId }: Props) {
  const router = useRouter()

  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: 'transfer',  label: 'Transfer Remaining Balance', description: 'Move funds to another account',  checked: true  },
    { id: 'pending',   label: 'Clear Pending Transactions', description: 'Resolve any uncleared items',    checked: false },
    { id: 'reconcile', label: 'Reconcile Account',          description: 'Make sure account is up to date', checked: false },
  ])
  const [showConfirm, setShowConfirm] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const account = mockAccounts.find(a => a.id === accountId) ?? mockAccounts[1]
  const budget  = mockBudgets.find(b => b.id === (account.budgetId ?? budgetId)) ?? mockBudgets[0]
  const meta    = TYPE_META[account.type]

  /* Mock stats — replace with API data when available */
  const balance       = 2450
  const txCount       = 12
  const openingBalance = 0
  const lastActivity  = 'May 15, 2024'
  const lastActivityAgo = '5 days ago'
  const lastReconciled = 'Apr 30, 2024'
  const createdDate   = 'Jan 5, 2024'
  const hasBalance    = balance > 0
  const riskLevel     = hasBalance ? 'Medium' : 'Low'
  const archiveStatus = hasBalance ? 'Archive Recommended' : 'Ready to Archive'
  const riskDotColor  = ({ Low: '#22C55E', Medium: '#F59E0B', High: '#EF4444' } as const)[riskLevel]

  function toggleCheck(id: string) {
    setChecklist(prev => prev.map(c => c.id === id ? { ...c, checked: !c.checked } : c))
  }

  async function handleArchiveConfirmed() {
    await new Promise(r => setTimeout(r, 900))
    setShowConfirm(false)
    setShowSuccess(true)
  }

  /* ── Timeline nodes ───────────────────────────────────── */
  const timelineNodes = [
    { icon: <Calendar size={16} />,     label: 'Account Created', date: createdDate,   state: 'completed' as const },
    { icon: <CheckCircle2 size={16} />, label: 'Last Activity',   date: lastActivity,  state: 'current'   as const },
    { icon: <Archive size={16} />,      label: 'Archive Date',    date: 'Not archived', state: 'future'   as const },
  ]
  const timelineColors = {
    completed: { ring: '#22C55E', bg: 'rgba(34,197,94,0.12)',   text: '#22C55E', dashedLine: false },
    current:   { ring: '#6C3AED', bg: 'rgba(108,58,237,0.15)', text: '#6C3AED', dashedLine: false },
    future:    { ring: '#2A3A54', bg: 'rgba(42,58,84,0.3)',     text: '#5A6A85', dashedLine: true  },
  }

  return (
    <div className="min-h-screen bg-[#080C14] text-[#E8EEF8]">
      <div className="max-w-[1400px] mx-auto px-6 py-6 flex flex-col gap-5">

        {/* ── Header ─────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-bold text-[#E8EEF8] leading-tight">Archive Account</h1>
            <p className="text-[13px] text-[#5A6A85] mt-1">Close this account while preserving transaction history</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => router.back()}
              className="px-5 py-2 rounded-xl text-[13px] font-medium text-[#A8B4CC] border border-[#1E2B42] hover:text-[#E8EEF8] hover:border-[#2A3A54] transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => setShowConfirm(true)}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #6C3AED, #7C4AFF)' }}
            >
              <Archive size={14} />
              Archive Account
            </button>
          </div>
        </div>

        {/* ── Info Banner ────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between gap-6 px-5 py-4 rounded-xl border border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.05)]"
        >
          <div className="flex items-start gap-4">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: 'rgba(245,158,11,0.12)' }}
            >
              <AlertTriangle size={18} className="text-[#F59E0B]" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-[#F59E0B]">Archived accounts keep their history</p>
              <p className="text-[12px] text-[#A8B4CC] mt-0.5">
                Transactions, reports, and balances will remain available for historical reference.
              </p>
            </div>
          </div>
          <p className="text-[12px] font-semibold text-[#F59E0B] shrink-0 text-right leading-snug">
            Archived accounts cannot<br />receive new transactions.
          </p>
        </motion.div>

        {/* ── Account Summary Card ──────────────────────── */}
        <div className="bg-[#0F1623] border border-[#1E2B42] rounded-xl px-6 py-5 flex flex-col gap-4">
          <div className="flex items-center gap-6 flex-wrap">

            {/* Icon + name */}
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: meta.bg, color: meta.color }}
              >
                {meta.icon}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[16px] font-bold text-[#E8EEF8]">{account.name}</span>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: meta.bg, color: meta.color }}
                  >
                    {meta.label}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Archive size={11} className="text-[#5A6A85]" />
                  <p className="text-[11px] text-[#5A6A85]">{budget.name}</p>
                </div>
              </div>
            </div>

            <div className="w-px h-10 bg-[#1E2B42]" />

            {/* Stats */}
            <div className="flex items-center gap-8 flex-wrap flex-1">
              <div>
                <p className="text-[10px] text-[#5A6A85] uppercase tracking-wide font-medium">Current Balance</p>
                <p className={cn('text-[18px] font-bold mt-0.5', hasBalance ? 'text-[#F59E0B]' : 'text-[#22C55E]')}>
                  {formatCurrency(balance)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[#5A6A85] uppercase tracking-wide font-medium">Last Activity</p>
                <p className="text-[14px] font-semibold text-[#E8EEF8] mt-0.5">{lastActivity}</p>
                <p className="text-[10px] text-[#5A6A85] mt-0.5">{lastActivityAgo}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#5A6A85] uppercase tracking-wide font-medium">Transaction Count</p>
                <p className="text-[16px] font-bold text-[#E8EEF8] mt-0.5">{txCount}</p>
              </div>
            </div>

            <div className="w-px h-10 bg-[#1E2B42] hidden lg:block" />

            {/* Status + Risk */}
            <div className="flex flex-col gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.1)] text-[#F59E0B]">
                {archiveStatus}
                <span className="text-[8px]">◉</span>
              </span>
              {hasBalance && (
                <span className="text-[11px] font-medium text-[#F59E0B]">Balance not zero</span>
              )}
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: riskDotColor }} />
                <span className="text-[11px] font-medium text-[#A8B4CC]">{riskLevel} Risk</span>
              </div>
            </div>

          </div>

          {/* Balance warning */}
          {hasBalance && (
            <div className="flex items-center gap-2 pt-3 border-t border-[#1E2B42]">
              <AlertTriangle size={13} className="text-[#F59E0B] shrink-0" />
              <p className="text-[12px] text-[#F59E0B]">Transfer remaining balance before archiving.</p>
            </div>
          )}
        </div>

        {/* ── Two-Column Layout ──────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">

          {/* ── LEFT COLUMN ─────────────────────────────── */}
          <div className="flex flex-col gap-5">

            {/* Account Overview + Chart */}
            <div className="bg-[#0F1623] border border-[#1E2B42] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#1E2B42]">
                <h2 className="text-[14px] font-semibold text-[#E8EEF8]">Account Overview</h2>
              </div>
              <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-6">
                {[
                  { label: 'Opening Balance',    value: formatCurrency(openingBalance), accent: false },
                  { label: 'Current Balance',    value: formatCurrency(balance),        accent: true  },
                  { label: 'Total Transactions', value: String(txCount),               accent: false },
                  { label: 'Last Reconciled',    value: lastReconciled,                accent: false },
                ].map(stat => (
                  <div key={stat.label}>
                    <p className="text-[10px] text-[#5A6A85] uppercase tracking-wide font-medium">{stat.label}</p>
                    <p className={cn(
                      'text-[15px] font-bold mt-1',
                      stat.accent ? (hasBalance ? 'text-[#F59E0B]' : 'text-[#22C55E]') : 'text-[#E8EEF8]',
                    )}>
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="px-5 pb-5">
                <p className="text-[11px] text-[#5A6A85] font-medium mb-3">Balance Over Time</p>
                <BalanceOverTimeChart />
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-[#0F1623] border border-[#1E2B42] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#1E2B42]">
                <h2 className="text-[14px] font-semibold text-[#E8EEF8]">Recent Transactions</h2>
              </div>

              <div className="grid grid-cols-[160px_1fr_1fr_120px] px-5 py-2.5 border-b border-[#1E2B42]">
                {['Date', 'Payee', 'Category', 'Amount'].map(col => (
                  <span key={col} className="text-[11px] text-[#5A6A85] font-medium">{col}</span>
                ))}
              </div>

              {ARCHIVE_TRANSACTIONS.map(tx => (
                <div
                  key={tx.id}
                  className="grid grid-cols-[160px_1fr_1fr_120px] px-5 py-3 border-b border-[#1E2B42]/50 hover:bg-[#131C2E] transition-colors"
                >
                  <span className="text-[12px] text-[#A8B4CC]">{tx.date}</span>
                  <span className="text-[12px] text-[#E8EEF8] font-medium truncate pr-2">{tx.payee}</span>
                  <span className="text-[12px] text-[#A8B4CC]">{tx.category}</span>
                  <span className={cn('text-[12px] font-semibold', tx.amount > 0 ? 'text-[#22C55E]' : 'text-[#F87171]')}>
                    {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                  </span>
                </div>
              ))}

              <div className="px-5 py-3">
                <button className="text-[12px] text-[#6C3AED] hover:text-[#7C4AFF] font-medium transition-colors">
                  View all transactions →
                </button>
              </div>
            </div>

            {/* Account Timeline */}
            <div className="bg-[#0F1623] border border-[#1E2B42] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#1E2B42]">
                <h2 className="text-[14px] font-semibold text-[#E8EEF8]">Account Timeline</h2>
              </div>
              <div className="p-6">
                <div className="flex items-start justify-between gap-2">
                  {timelineNodes.map((node, i) => {
                    const c = timelineColors[node.state]
                    const isLast = i === timelineNodes.length - 1
                    return (
                      <div key={node.label} className="flex flex-col items-center gap-3 flex-1 relative">
                        {!isLast && (
                          <div
                            className="absolute top-5 left-1/2 w-full h-[2px]"
                            style={{
                              background: c.dashedLine
                                ? 'repeating-linear-gradient(90deg, #2A3A54 0, #2A3A54 6px, transparent 6px, transparent 12px)'
                                : (node.state === 'completed' ? '#22C55E' : '#6C3AED'),
                            }}
                          />
                        )}
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center z-10 border-2 shrink-0"
                          style={{ borderColor: c.ring, background: c.bg, color: c.text }}
                        >
                          {node.icon}
                        </div>
                        <div className="text-center">
                          <p className="text-[12px] font-semibold text-[#E8EEF8]">{node.label}</p>
                          <p className="text-[11px] text-[#5A6A85] mt-0.5">{node.date}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

          </div>

          {/* ── RIGHT COLUMN ────────────────────────────── */}
          <div className="flex flex-col gap-4">

            {/* Before You Archive */}
            <div className="bg-[#0F1623] border border-[#1E2B42] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#1E2B42]">
                <h2 className="text-[14px] font-semibold text-[#E8EEF8]">Before You Archive</h2>
              </div>
              <div className="p-4 flex flex-col gap-2">
                {checklist.map(item => (
                  <div
                    key={item.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border transition-all',
                      item.checked
                        ? 'border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.04)]'
                        : 'border-[#1E2B42] bg-[#080C14]',
                    )}
                  >
                    <button
                      onClick={() => toggleCheck(item.id)}
                      className={cn(
                        'w-5 h-5 rounded flex items-center justify-center border-2 transition-all shrink-0',
                        item.checked
                          ? 'bg-[#22C55E] border-[#22C55E]'
                          : 'bg-transparent border-[#2A3A54] hover:border-[#5A6A85]',
                      )}
                    >
                      {item.checked && <CheckCircle2 size={11} className="text-[#080C14]" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-[12px] font-semibold',
                        item.checked ? 'text-[#22C55E]' : 'text-[#E8EEF8]',
                      )}>
                        {item.label}
                      </p>
                      <p className="text-[11px] text-[#5A6A85] mt-0.5">{item.description}</p>
                    </div>
                    <ChevronRight size={14} className="text-[#5A6A85] shrink-0" />
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-[#0F1623] border border-[#1E2B42] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#1E2B42]">
                <h2 className="text-[14px] font-semibold text-[#E8EEF8]">Quick Actions</h2>
              </div>
              <div className="p-4 grid grid-cols-3 gap-3">
                {[
                  { icon: <ArrowLeftRight size={18} />, label: 'Transfer\nFunds'       },
                  { icon: <RefreshCw      size={18} />, label: 'Reconcile\nAccount'    },
                  { icon: <Download       size={18} />, label: 'Export\nTransactions'  },
                ].map(action => (
                  <button
                    key={action.label}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border border-[#1E2B42] bg-[#080C14] hover:bg-[#131C2E] hover:border-[#2A3A54] transition-all group"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-[#6C3AED]"
                      style={{ background: 'rgba(108,58,237,0.12)' }}
                    >
                      {action.icon}
                    </div>
                    <p className="text-[11px] font-medium text-[#A8B4CC] group-hover:text-[#E8EEF8] text-center transition-colors whitespace-pre-line leading-tight">
                      {action.label}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* What Happens Next */}
            <div className="bg-[#0F1623] border border-[#1E2B42] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#1E2B42]">
                <h2 className="text-[14px] font-semibold text-[#E8EEF8]">What Happens Next</h2>
              </div>
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(108,58,237,0.12)' }}
                  >
                    <ShieldCheck size={18} className="text-[#6C3AED]" />
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {[
                      'Account will be hidden from active lists',
                      'Historical reports will remain available',
                      'Transactions will remain unchanged',
                    ].map(item => (
                      <div key={item} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#22C55E] mt-1.5 shrink-0" />
                        <p className="text-[12px] text-[#A8B4CC] leading-relaxed">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-[#5A6A85] mt-4 pt-4 border-t border-[#1E2B42]">
                  You can restore archived accounts anytime.
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Dialogs ──────────────────────────────────────── */}
      <AnimatePresence>
        {showConfirm && !showSuccess && (
          <ArchiveConfirmationDialog
            key="confirm"
            accountName={account.name}
            balance={balance}
            txCount={txCount}
            lastActivity={lastActivity}
            onClose={() => setShowConfirm(false)}
            onConfirm={handleArchiveConfirmed}
          />
        )}
        {showSuccess && (
          <ArchiveSuccessDialog
            key="success"
            accountName={account.name}
            onViewArchived={() => router.push(`/budgets/${budgetId}/accounts?filter=archived`)}
            onReturn={() => router.push(`/budgets/${budgetId}/accounts`)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
