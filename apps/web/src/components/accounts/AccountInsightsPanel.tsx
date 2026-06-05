'use client'

import {
  Plus, ArrowLeftRight, CheckCircle, Download,
  BarChart2, Archive, Lock, ArrowRight,
  ArrowUpDown, Receipt, Tag, Clock,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { mockTransactions } from '@/mock/data'
import { formatCurrency, cn } from '@/lib/utils'

interface Props { accountId: string; budgetId: string }

const QUICK_ACTIONS = [
  {
    icon: <Plus size={16} />,
    color: '#6C3AED', bg: 'rgba(108,58,237,0.15)',
    title: 'Create Transaction',
    desc: 'Record a new transaction',
  },
  {
    icon: <ArrowLeftRight size={16} />,
    color: '#3B82F6', bg: 'rgba(59,130,246,0.15)',
    title: 'Record Transfer',
    desc: 'Move money between accounts',
  },
  {
    icon: <CheckCircle size={16} />,
    color: '#22C55E', bg: 'rgba(34,197,94,0.15)',
    title: 'Reconcile Balance',
    desc: 'Verify cleared transactions',
  },
  {
    icon: <Download size={16} />,
    color: '#F59E0B', bg: 'rgba(245,158,11,0.15)',
    title: 'Export Transactions',
    desc: 'Download CSV or PDF',
  },
  {
    icon: <BarChart2 size={16} />,
    color: '#06B6D4', bg: 'rgba(6,182,212,0.15)',
    title: 'View Reports',
    desc: 'Account spending insights',
  },
  {
    icon: <Archive size={16} />,
    color: '#6B7280', bg: 'rgba(107,114,128,0.12)',
    title: 'Archive Account',
    desc: 'Hide from active accounts',
  },
]

export function AccountInsightsPanel({ accountId, budgetId }: Props) {
  const router = useRouter()
  const txns = mockTransactions.filter(t => t.accountId === accountId)
  const inflows  = txns.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const outflows = txns.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
  const net      = inflows - outflows

  const largestExpense = txns.filter(t => t.amount < 0).sort((a, b) => a.amount - b.amount)[0]

  const categoryTotals = txns.filter(t => t.amount < 0 && t.envelopeName).reduce<Record<string, { name: string; icon: string; total: number }>>((acc, t) => {
    const key = t.envelopeName!
    if (!acc[key]) acc[key] = { name: key, icon: t.envelopeIcon ?? '📁', total: 0 }
    acc[key].total += Math.abs(t.amount)
    return acc
  }, {})
  const topCategory = Object.values(categoryTotals).sort((a, b) => b.total - a.total)[0]

  const lastTxn = txns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
  /* eslint-disable react-hooks/purity */
  const daysSinceLast = lastTxn
    ? Math.floor((Date.now() - new Date(lastTxn.date).getTime()) / 86_400_000)
    : null
  /* eslint-enable react-hooks/purity */

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Quick Actions */}
      <div className="bg-[#0B1120] border border-[#1A2540] rounded-2xl overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-[#1A2540]">
          <h3 className="text-sm font-bold text-white">Quick Actions</h3>
        </div>
        <div className="p-3 space-y-1">
          {QUICK_ACTIONS.map(({ icon, color, bg, title, desc }) => (
            <button
              key={title}
              onClick={title === 'Reconcile Balance' ? () => router.push(`/budgets/${budgetId}/accounts/${accountId}/reconcile`) : undefined}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#0D1525] hover:border-[#1A2540] border border-transparent transition-all group"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
                style={{ backgroundColor: bg, color }}
              >
                {icon}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-xs font-semibold text-[#C8D4E8] group-hover:text-white transition-colors leading-tight">{title}</p>
                <p className="text-[10px] text-[#5A6A85] mt-0.5 leading-tight">{desc}</p>
              </div>
              <ArrowRight size={12} className="text-[#3A4A60] group-hover:text-[#6C3AED] transition-colors flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Account Insights */}
      <div className="bg-[#0B1120] border border-[#1A2540] rounded-2xl overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-[#1A2540]">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Account Insights</h3>
            <span className="text-[10px] text-[#3A4A60] bg-[#0D1525] border border-[#1A2540] rounded-full px-2 py-0.5">MTD</span>
          </div>
        </div>
        <div className="p-4 space-y-3">
          {/* Net Cash Flow */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[rgba(108,58,237,0.12)] flex items-center justify-center">
                <ArrowUpDown size={12} className="text-[#A78BFA]" />
              </div>
              <span className="text-xs text-[#8A9AB5]">Net Cash Flow</span>
            </div>
            <span className={cn('text-xs font-bold tabular-nums', net >= 0 ? 'text-[#4ADE80]' : 'text-[#F87171]')}>
              {net >= 0 ? '+' : ''}{formatCurrency(net)}
            </span>
          </div>

          {/* Largest Expense */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-[rgba(239,68,68,0.12)] flex items-center justify-center flex-shrink-0">
                <Receipt size={12} className="text-[#F87171]" />
              </div>
              <span className="text-xs text-[#8A9AB5] truncate">Largest Expense</span>
            </div>
            {largestExpense ? (
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-bold text-[#F87171] tabular-nums">{formatCurrency(Math.abs(largestExpense.amount))}</p>
                <p className="text-[10px] text-[#3A4A60] truncate max-w-[80px]">{largestExpense.payee}</p>
              </div>
            ) : (
              <span className="text-xs text-[#3A4A60]">—</span>
            )}
          </div>

          {/* Top Category */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-[rgba(245,158,11,0.12)] flex items-center justify-center flex-shrink-0">
                <Tag size={12} className="text-[#F59E0B]" />
              </div>
              <span className="text-xs text-[#8A9AB5] truncate">Top Category</span>
            </div>
            {topCategory ? (
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-bold text-[#C8D4E8]">{topCategory.icon} {topCategory.name}</p>
                <p className="text-[10px] text-[#3A4A60]">{formatCurrency(topCategory.total)}</p>
              </div>
            ) : (
              <span className="text-xs text-[#3A4A60]">—</span>
            )}
          </div>

          {/* Days since last transaction */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-[rgba(6,182,212,0.12)] flex items-center justify-center flex-shrink-0">
                <Clock size={12} className="text-[#06B6D4]" />
              </div>
              <span className="text-xs text-[#8A9AB5] truncate">Last Transaction</span>
            </div>
            {daysSinceLast !== null ? (
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-bold text-[#C8D4E8] tabular-nums">{daysSinceLast} {daysSinceLast === 1 ? 'day' : 'days'} ago</p>
                <p className="text-[10px] text-[#3A4A60]">{lastTxn!.payee}</p>
              </div>
            ) : (
              <span className="text-xs text-[#3A4A60]">—</span>
            )}
          </div>

          <button className="w-full mt-1 text-xs text-[#7C3AED] hover:text-[#A78BFA] font-semibold text-right transition-colors">
            View Full Report →
          </button>
        </div>
      </div>

      {/* Immutable notice */}
      <div className="bg-[rgba(108,58,237,0.06)] border border-[rgba(108,58,237,0.2)] rounded-2xl p-5 shadow-[0_0_20px_rgba(108,58,237,0.06)] flex flex-col gap-4">
        {/* Icon + title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[rgba(108,58,237,0.18)] flex items-center justify-center flex-shrink-0 shadow-[0_0_12px_rgba(108,58,237,0.25)]">
            <Lock size={16} className="text-[#A78BFA]" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#C4B5FD]">Immutable Transactions</p>
            <p className="text-[10px] text-[#5A6A85] mt-0.5">Audit-safe ledger protection</p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-[rgba(108,58,237,0.15)]" />

        {/* Body */}
        <p className="text-xs text-[#6A7A95] leading-relaxed">
          Transaction immutability is <span className="text-[#A78BFA] font-medium">enabled</span> for this account.
        </p>

        <div className="space-y-2">
          <div className="flex items-start gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#6C3AED] mt-1.5 flex-shrink-0" />
            <p className="text-[11px] text-[#5A6A85] leading-snug">Use a <span className="text-[#C4B5FD] font-medium">reversing transaction</span> to correct a mistake.</p>
          </div>
          <div className="flex items-start gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#6C3AED] mt-1.5 flex-shrink-0" />
            <p className="text-[11px] text-[#5A6A85] leading-snug">This can be changed in <span className="text-[#C4B5FD] font-medium">Settings</span>.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
